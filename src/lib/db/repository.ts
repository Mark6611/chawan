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
import type { PersonalSession, Session, Tin } from './types';
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

	// ─── Sessions ───────────────────────────────────────────

	async listSessions(): Promise<Session[]> {
		const all = await db.sessions.orderBy('brewedAt').reverse().toArray();
		return all.filter(isLive);
	}

	async listSessionsByTin(tinId: string): Promise<PersonalSession[]> {
		const matched = await db.sessions.where('tinId').equals(tinId).toArray();
		return matched.filter(isPersonal).filter(isLive);
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
}

export const repository: Repository = new DexieRepository();
