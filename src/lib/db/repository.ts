// Phase-2 repository: Dexie remains the local cache, the sync layer pushes
// each write up to Supabase in the background. Reads stay local-first; only
// fullSync() pulls.
//
// Soft delete: `deletedAt` is the tombstone. Reads filter it out; writes
// (including deleteSession) push the row with deletedAt set so other devices
// converge on the deleted state.

import { db } from './dexie';
import { isPersonal, nowIso } from './types';
import type { Repository } from './repository.types';
import type { PersonalSession, Session, Tin, TinPhoto } from './types';
import { pushSession, pushTin } from '../sync.svelte';

const isLive = <T extends { deletedAt?: string }>(row: T) => !row.deletedAt;

class DexieRepository implements Repository {
	// ─── Tins ───────────────────────────────────────────────

	async listTins(): Promise<Tin[]> {
		// Newest first. Filter tombstones — the soft-delete tombstone column
		// added in Session 13 lets sync propagate deletion; the UI never sees
		// deleted rows.
		const all = await db.tins.orderBy('createdAt').reverse().toArray();
		return all.filter(isLive);
	}

	async getTin(id: string): Promise<Tin | undefined> {
		const t = await db.tins.get(id);
		if (!t || !isLive(t)) return undefined;
		return t;
	}

	async saveTin(tin: Tin): Promise<void> {
		await db.tins.put(tin);
		pushTin(tin);
	}

	async archiveTin(id: string): Promise<void> {
		const t = await db.tins.get(id);
		if (!t) return;
		const updated: Tin = { ...t, archived: true, updatedAt: nowIso() };
		await db.tins.put(updated);
		pushTin(updated);
	}

	async unarchiveTin(id: string): Promise<void> {
		const t = await db.tins.get(id);
		if (!t) return;
		const updated: Tin = { ...t, archived: false, updatedAt: nowIso() };
		await db.tins.put(updated);
		pushTin(updated);
	}

	// ─── Tin photos (device-local, never synced — see TinPhoto) ──

	async getTinPhoto(tinId: string): Promise<Blob | undefined> {
		const row = await db.tinPhotos.get(tinId);
		return row?.blob;
	}

	async setTinPhoto(tinId: string, blob: Blob): Promise<void> {
		await db.tinPhotos.put({ tinId, blob, updatedAt: nowIso() });
	}

	async deleteTinPhoto(tinId: string): Promise<void> {
		await db.tinPhotos.delete(tinId);
	}

	// ─── Sessions ───────────────────────────────────────────

	async listSessions(): Promise<Session[]> {
		const all = await db.sessions.orderBy('brewedAt').reverse().toArray();
		return all.filter(isLive);
	}

	async listSessionsByTin(tinId: string): Promise<PersonalSession[]> {
		// Sort newest-first here so the ordering guarantee lives with the data
		// access: the `where('tinId')` index yields rows in tinId order (ties
		// broken by random-UUID pk), and the cumulative-consumption math in the
		// tin detail page depends on chronological order.
		const matched = await db.sessions.where('tinId').equals(tinId).toArray();
		return matched
			.filter(isPersonal)
			.filter(isLive)
			.sort((a, b) => b.brewedAt.localeCompare(a.brewedAt));
	}

	async getSession(id: string): Promise<Session | undefined> {
		const s = await db.sessions.get(id);
		if (!s || !isLive(s)) return undefined;
		return s;
	}

	async saveSession(session: Session): Promise<void> {
		await db.sessions.put(session);
		pushSession(session);
	}

	async deleteSession(id: string): Promise<void> {
		// Soft delete — set deletedAt + bump updatedAt so the tombstone wins
		// on last-write-wins merges. Push the tombstoned row so other devices
		// see the deletion on next pull.
		const existing = await db.sessions.get(id);
		if (!existing) return;
		const now = nowIso();
		const tombstoned = { ...existing, deletedAt: now, updatedAt: now } as Session;
		await db.sessions.put(tombstoned);
		pushSession(tombstoned);
	}

	// ─── Aggregate ──────────────────────────────────────────

	async mostRecentSession(): Promise<Session | undefined> {
		const all = await db.sessions.orderBy('brewedAt').reverse().toArray();
		return all.find(isLive);
	}

	async lastNSessions(n: number): Promise<Session[]> {
		const all = await db.sessions.orderBy('brewedAt').reverse().toArray();
		return all.filter(isLive).slice(0, n);
	}

	// ─── Backup access (tombstone- and timestamp-aware) ─────────
	// These bypass the isLive filter every other read applies. Kept together and
	// explicitly named so the exception is obvious: only db/backup.ts calls them,
	// and only because a backup must carry deletions and merge by timestamp.

	async listTinsWithDeleted(): Promise<Tin[]> {
		return db.tins.orderBy('createdAt').reverse().toArray();
	}

	async listSessionsWithDeleted(): Promise<Session[]> {
		return db.sessions.orderBy('brewedAt').reverse().toArray();
	}

	async getTinRaw(id: string): Promise<Tin | undefined> {
		// Returns tombstones too — restore compares against a deleted row so an
		// older backup can't overwrite (resurrect) it. getTin() hides them.
		return db.tins.get(id);
	}

	async getSessionRaw(id: string): Promise<Session | undefined> {
		return db.sessions.get(id);
	}

	async getTinPhotoRecord(tinId: string): Promise<TinPhoto | undefined> {
		// The full record, including updatedAt — backup needs the timestamp to
		// export it and to merge on restore. getTinPhoto() returns only the blob.
		return db.tinPhotos.get(tinId);
	}

	async setTinPhotoAt(tinId: string, blob: Blob, updatedAt: string): Promise<void> {
		// Preserves the backup's timestamp instead of stamping now() (as
		// setTinPhoto does), so last-write-wins stays correct when this device
		// is itself exported later.
		await db.tinPhotos.put({ tinId, blob, updatedAt });
	}
}

export const repository: Repository = new DexieRepository();
