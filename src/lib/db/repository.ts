// Phase 1: Dexie-backed implementation of the Repository interface.
// In Phase 2 this file dispatches to Supabase with a Dexie offline cache.
// The interface in repository.types.ts stays stable across the swap.

import { db } from './dexie';
import { isPersonal, nowIso } from './types';
import type { Repository } from './repository.types';
import type { PersonalSession, Session, Tin } from './types';

class DexieRepository implements Repository {
	// ─── Tins ───────────────────────────────────────────────

	async listTins(): Promise<Tin[]> {
		// Newest first. Archived sort is handled at the UI layer
		// (the Tins screen renders active + archived as separate sections).
		return db.tins.orderBy('createdAt').reverse().toArray();
	}

	async getTin(id: string): Promise<Tin | undefined> {
		return db.tins.get(id);
	}

	async saveTin(tin: Tin): Promise<void> {
		await db.tins.put(tin);
	}

	async archiveTin(id: string): Promise<void> {
		const t = await db.tins.get(id);
		if (!t) return;
		await db.tins.put({ ...t, archived: true, updatedAt: nowIso() });
	}

	async unarchiveTin(id: string): Promise<void> {
		const t = await db.tins.get(id);
		if (!t) return;
		await db.tins.put({ ...t, archived: false, updatedAt: nowIso() });
	}

	// ─── Sessions ───────────────────────────────────────────

	async listSessions(): Promise<Session[]> {
		return db.sessions.orderBy('brewedAt').reverse().toArray();
	}

	async listSessionsByTin(tinId: string): Promise<PersonalSession[]> {
		// `tinId` is only set on PersonalSession; the IndexedDB index naturally
		// excludes StoreSessions. We still narrow via isPersonal() for type safety.
		const matched = await db.sessions.where('tinId').equals(tinId).toArray();
		return matched.filter(isPersonal);
	}

	async getSession(id: string): Promise<Session | undefined> {
		return db.sessions.get(id);
	}

	async saveSession(session: Session): Promise<void> {
		await db.sessions.put(session);
	}

	async deleteSession(id: string): Promise<void> {
		await db.sessions.delete(id);
	}

	// ─── Aggregate ──────────────────────────────────────────

	async mostRecentSession(): Promise<Session | undefined> {
		return (await db.sessions.orderBy('brewedAt').reverse().first()) ?? undefined;
	}

	async lastNSessions(n: number): Promise<Session[]> {
		return db.sessions.orderBy('brewedAt').reverse().limit(n).toArray();
	}
}

export const repository: Repository = new DexieRepository();
