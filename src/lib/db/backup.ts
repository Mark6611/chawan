// Backup export / restore for the local-only build.
//
// IndexedDB is the sole copy of the user's data, so the JSON backup is the
// only migration + disaster path. What this handles that a blind put would not:
//   1. Photos (tinPhotos blobs) travel too, encoded as data URLs, each with its
//      own updatedAt so they merge by last-write-wins like every other row.
//   2. Restore is a MERGE by updatedAt, not an overwrite: an OLDER backup can't
//      roll back newer local edits.
//   3. Deletions propagate. Tombstones (deletedAt rows) are exported, and the
//      existing-row lookup on restore is tombstone-aware, so importing an old
//      backup can't resurrect something deleted since.
//   4. A quota failure is distinguished from a parse failure and surfaced, and
//      photo write failures are counted rather than swallowed into "success".
//
// Format history:
//   v1 — {tinId, dataUrl} photos, no timestamps; tins/sessions live-only.
//   v2 — photos carry updatedAt; tins/sessions include tombstones; `format: 2`.
//   v1 files still restore: a photo with no updatedAt is treated as older than
//   any stamped local copy (so it can't clobber), and the absence of tombstones
//   simply means an old backup carries no deletions to apply.
//
// The actual file write/share is delegated to shareOrDownload (share-card),
// which already handles the iOS WKWebView correctly (Filesystem + Share) —
// a raw <a download> silently no-ops there.

import { repository } from './repository';
import { SessionSchema, TinSchema, nowIso, type Session, type Tin } from './types';
import { isQuota } from './quota';
import { incomingWins } from './backup-merge';

export interface BackupPhoto {
	tinId: string;
	dataUrl: string; // "data:image/...;base64,...."
	updatedAt?: string; // ISO; absent in v1 backups
}

export interface BackupPayload {
	app: 'chawan';
	/** Backup schema version (not the app version — that's `version`). */
	format: number;
	version: string;
	exportedAt: string;
	tinsCount: number; // live items only — what the user thinks of as their data
	sessionsCount: number;
	photosCount: number;
	tins: Tin[]; // includes tombstones (deletedAt set)
	sessions: Session[]; // includes tombstones
	photos: BackupPhoto[];
}

export interface RestoreResult {
	tinsAdded: number;
	tinsKept: number; // matching id, incoming not newer → kept existing
	tinsInvalid: number;
	sessionsAdded: number;
	sessionsKept: number;
	sessionsInvalid: number;
	photos: number; // written (added or updated)
	photosKept: number; // existing copy was newer → kept
	/** Photos that couldn't be written. Counted rather than swallowed: a photo
	 *  is the one part of a tin that exists nowhere else once restored. */
	photosFailed: number;
	/** Photos with no live tin to attach to (a deleted or absent tin). Skipped
	 *  so a stale/hand-edited file can't leave unreachable blobs eating quota. */
	photosSkipped: number;
}

export class QuotaError extends Error {
	constructor() {
		super('Storage is full — free up space and try again.');
		this.name = 'QuotaError';
	}
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => resolve(r.result as string);
		r.onerror = () => reject(r.error);
		r.readAsDataURL(blob);
	});
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
	// fetch() decodes a data: URL without any manual base64 juggling.
	return await (await fetch(dataUrl)).blob();
}

const isLive = (row: { deletedAt?: string }) => !row.deletedAt;

/** Gather everything (tins, sessions, and every tin photo) into one payload. */
export async function buildBackup(version: string): Promise<BackupPayload> {
	// Tombstones included so a restore elsewhere converges on the deletions too.
	const [tins, sessions] = await Promise.all([
		repository.listTinsWithDeleted(),
		repository.listSessionsWithDeleted()
	]);

	// Photos only for LIVE tins: a deleted tin shouldn't drag its picture back,
	// and a photo whose tin is gone would restore as an unreachable orphan.
	const liveTins = tins.filter(isLive);
	const photos: BackupPhoto[] = [];
	for (const tin of liveTins) {
		const rec = await repository.getTinPhotoRecord(tin.id);
		if (rec) {
			photos.push({
				tinId: tin.id,
				dataUrl: await blobToDataUrl(rec.blob),
				updatedAt: rec.updatedAt
			});
		}
	}

	return {
		app: 'chawan',
		format: 2,
		version,
		exportedAt: nowIso(),
		tinsCount: liveTins.length,
		sessionsCount: sessions.filter(isLive).length,
		photosCount: photos.length,
		tins,
		sessions,
		photos
	};
}

/**
 * Merge a parsed backup object into local storage. Throws QuotaError if the
 * device runs out of space mid-write (so the caller can show the right message
 * and the user knows the restore was partial). Any other per-row failure is
 * counted, never silently swallowed.
 *
 * Not wrapped in a transaction on purpose: every write is an idempotent LWW
 * decision, so a partial restore (e.g. quota) is consistent and completes on a
 * re-run once space is freed — cheaper than routing a Dexie transaction through
 * the repository boundary, and the photo-decode step (fetch) can't live inside
 * one anyway.
 */
export async function restoreBackup(data: unknown): Promise<RestoreResult> {
	if (!data || typeof data !== 'object' || (data as { app?: string }).app !== 'chawan') {
		throw new Error('Not a Chawan backup file.');
	}
	const d = data as {
		exportedAt?: string;
		tins?: unknown[];
		sessions?: unknown[];
		photos?: unknown[];
	};
	const tinList = Array.isArray(d.tins) ? d.tins : [];
	const sessionList = Array.isArray(d.sessions) ? d.sessions : [];
	const photoList = Array.isArray(d.photos) ? d.photos : [];
	// v1 photos carry no timestamp; the export time is a safe lower bound on the
	// photo's age, so the merge can still order it (and it loses to anything
	// stamped later locally).
	const photoFallbackTs = typeof d.exportedAt === 'string' ? d.exportedAt : nowIso();

	const res: RestoreResult = {
		tinsAdded: 0,
		tinsKept: 0,
		tinsInvalid: 0,
		sessionsAdded: 0,
		sessionsKept: 0,
		sessionsInvalid: 0,
		photos: 0,
		photosKept: 0,
		photosFailed: 0,
		photosSkipped: 0
	};

	// Tins that are LIVE after this restore. A photo is only written for one of
	// these, so a deleted or missing tin can't accrue an orphan blob.
	const liveTinIds = new Set<string>();

	for (const raw of tinList) {
		const parsed = TinSchema.safeParse(raw);
		if (!parsed.success) {
			res.tinsInvalid++;
			continue;
		}
		const incoming = parsed.data;
		try {
			// getTinRaw, NOT getTin: getTin hides tombstones, so a deleted tin read
			// as "absent" and the incoming live row overwrote the tombstone —
			// silently resurrecting the delete. Raw lets the tombstone win the merge.
			const existing = await repository.getTinRaw(incoming.id);
			let live: boolean;
			if (existing && !incomingWins(incoming, existing)) {
				res.tinsKept++;
				live = isLive(existing);
			} else {
				await repository.saveTin(incoming);
				// A tombstone write propagates a deletion; it isn't an "add".
				if (isLive(incoming)) res.tinsAdded++;
				live = isLive(incoming);
			}
			if (live) liveTinIds.add(incoming.id);
		} catch (err) {
			if (isQuota(err)) throw new QuotaError();
			res.tinsInvalid++;
		}
	}

	for (const raw of sessionList) {
		const parsed = SessionSchema.safeParse(raw);
		if (!parsed.success) {
			res.sessionsInvalid++;
			continue;
		}
		const incoming = parsed.data;
		try {
			const existing = await repository.getSessionRaw(incoming.id);
			if (existing && !incomingWins(incoming, existing)) {
				res.sessionsKept++;
				continue;
			}
			await repository.saveSession(incoming);
			if (isLive(incoming)) res.sessionsAdded++;
		} catch (err) {
			if (isQuota(err)) throw new QuotaError();
			res.sessionsInvalid++;
		}
	}

	for (const raw of photoList) {
		const p = raw as Partial<BackupPhoto>;
		if (!p || typeof p.tinId !== 'string' || typeof p.dataUrl !== 'string') continue;
		// Orphan guard: attach only to a tin that's live after the restore.
		if (!liveTinIds.has(p.tinId)) {
			res.photosSkipped++;
			continue;
		}
		const incomingTs = typeof p.updatedAt === 'string' ? p.updatedAt : photoFallbackTs;
		try {
			const existing = await repository.getTinPhotoRecord(p.tinId);
			if (existing && !incomingWins({ updatedAt: incomingTs }, existing)) {
				res.photosKept++;
				continue;
			}
			await repository.setTinPhotoAt(p.tinId, await dataUrlToBlob(p.dataUrl), incomingTs);
			res.photos++;
		} catch (err) {
			if (isQuota(err)) throw new QuotaError();
			// A single unreadable photo shouldn't abort the whole restore — but it
			// must still be reported, not folded into a success message.
			res.photosFailed++;
		}
	}

	return res;
}
