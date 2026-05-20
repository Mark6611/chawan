// Repository interface — the stable contract between the UI and storage.
//
// Phase 1 (this file's only implementation): Dexie/IndexedDB.
// Phase 2: a two-impl that uses Supabase as the source of truth and Dexie
// as an offline cache. The interface stays the same; components never know
// which backend served the data.

import type { PersonalSession, Session, Tin } from './types';

export interface Repository {
	// ─── Tins ───────────────────────────────────────────────
	listTins(): Promise<Tin[]>;
	getTin(id: string): Promise<Tin | undefined>;
	saveTin(tin: Tin): Promise<void>;
	archiveTin(id: string): Promise<void>;
	unarchiveTin(id: string): Promise<void>;

	// ─── Sessions ───────────────────────────────────────────
	listSessions(): Promise<Session[]>;
	listSessionsByTin(tinId: string): Promise<PersonalSession[]>;
	getSession(id: string): Promise<Session | undefined>;
	saveSession(session: Session): Promise<void>;
	deleteSession(id: string): Promise<void>;

	// ─── Aggregate helpers (used by Home / Again? / form defaults) ─
	mostRecentSession(): Promise<Session | undefined>;
	lastNSessions(n: number): Promise<Session[]>;
}
