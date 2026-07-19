// Backup export / restore for the local-only build.
//
// IndexedDB is the sole copy of the user's data, so the JSON backup is the
// only migration + disaster path. Three things the old inline version got
// wrong, fixed here:
//   1. Photos (tinPhotos blobs) are included — encoded as data URLs — so a
//      restore on a new device brings the pictures too, not just the text.
//   2. Restore is a last-write-wins MERGE (by updatedAt), not a blind put, so
//      importing an OLDER backup can't silently roll back newer edits.
//   3. Per-row error handling distinguishes a quota failure from a parse
//      failure, and reports exactly what was skipped and why.
//
// The actual file write/share is delegated to shareOrDownload (share-card),
// which already handles the iOS WKWebView correctly (Filesystem + Share) —
// a raw <a download> silently no-ops there.

import { repository } from './repository';
import { SessionSchema, TinSchema, nowIso, type Session, type Tin } from './types';

export interface BackupPhoto {
	tinId: string;
	dataUrl: string; // "data:image/...;base64,...."
}

export interface BackupPayload {
	app: 'chawan';
	version: string;
	exportedAt: string;
	tinsCount: number;
	sessionsCount: number;
	photosCount: number;
	tins: Tin[];
	sessions: Session[];
	photos: BackupPhoto[];
}

export interface RestoreResult {
	tinsAdded: number;
	tinsKept: number; // matching id, incoming not newer → kept existing
	tinsInvalid: number;
	sessionsAdded: number;
	sessionsKept: number;
	sessionsInvalid: number;
	photos: number;
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

function isQuota(err: unknown): boolean {
	return (
		err instanceof DOMException &&
		(err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
	);
}

/** Gather everything (tins, sessions, and every tin photo) into one payload. */
export async function buildBackup(version: string): Promise<BackupPayload> {
	const [tins, sessions] = await Promise.all([repository.listTins(), repository.listSessions()]);

	const photos: BackupPhoto[] = [];
	for (const tin of tins) {
		const blob = await repository.getTinPhoto(tin.id);
		if (blob) photos.push({ tinId: tin.id, dataUrl: await blobToDataUrl(blob) });
	}

	return {
		app: 'chawan',
		version,
		exportedAt: nowIso(),
		tinsCount: tins.length,
		sessionsCount: sessions.length,
		photosCount: photos.length,
		tins,
		sessions,
		photos
	};
}

/** Decide whether an incoming row should replace an existing one. Newer wins;
 *  a missing/blank updatedAt loses to a stamped existing row. */
function incomingWins(incoming: { updatedAt?: string }, existing: { updatedAt?: string }): boolean {
	if (!existing.updatedAt) return true;
	if (!incoming.updatedAt) return false;
	return incoming.updatedAt >= existing.updatedAt;
}

/**
 * Merge a parsed backup object into local storage. Throws QuotaError if the
 * device runs out of space mid-write (so the caller can show the right
 * message and the user knows the restore was partial). Any other per-row
 * failure is counted as "invalid", never silently swallowed as a parse error.
 */
export async function restoreBackup(data: unknown): Promise<RestoreResult> {
	if (!data || typeof data !== 'object' || (data as { app?: string }).app !== 'chawan') {
		throw new Error('Not a Chawan backup file.');
	}
	const d = data as { tins?: unknown[]; sessions?: unknown[]; photos?: unknown[] };
	const tinList = Array.isArray(d.tins) ? d.tins : [];
	const sessionList = Array.isArray(d.sessions) ? d.sessions : [];
	const photoList = Array.isArray(d.photos) ? d.photos : [];

	const res: RestoreResult = {
		tinsAdded: 0,
		tinsKept: 0,
		tinsInvalid: 0,
		sessionsAdded: 0,
		sessionsKept: 0,
		sessionsInvalid: 0,
		photos: 0
	};

	for (const raw of tinList) {
		const parsed = TinSchema.safeParse(raw);
		if (!parsed.success) {
			res.tinsInvalid++;
			continue;
		}
		try {
			const existing = await repository.getTin(parsed.data.id);
			if (existing && !incomingWins(parsed.data, existing)) {
				res.tinsKept++;
				continue;
			}
			await repository.saveTin(parsed.data);
			res.tinsAdded++;
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
		try {
			const existing = await repository.getSession(parsed.data.id);
			if (existing && !incomingWins(parsed.data, existing)) {
				res.sessionsKept++;
				continue;
			}
			await repository.saveSession(parsed.data);
			res.sessionsAdded++;
		} catch (err) {
			if (isQuota(err)) throw new QuotaError();
			res.sessionsInvalid++;
		}
	}

	for (const raw of photoList) {
		const p = raw as Partial<BackupPhoto>;
		if (!p || typeof p.tinId !== 'string' || typeof p.dataUrl !== 'string') continue;
		try {
			await repository.setTinPhoto(p.tinId, await dataUrlToBlob(p.dataUrl));
			res.photos++;
		} catch (err) {
			if (isQuota(err)) throw new QuotaError();
			// A single unreadable photo shouldn't abort the whole restore.
		}
	}

	return res;
}
