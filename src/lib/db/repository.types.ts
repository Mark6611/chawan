// Repository interface — the stable contract between the UI and storage.
//
// Phase 1 (this file's only implementation): Dexie/IndexedDB.
// Phase 2: a two-impl that uses Supabase as the source of truth and Dexie
// as an offline cache. The interface stays the same; components never know
// which backend served the data.

import type { PersonalSession, Session, Tin, TinPhoto } from './types';

export interface Repository {
	// ─── Tins ───────────────────────────────────────────────
	listTins(): Promise<Tin[]>;
	getTin(id: string): Promise<Tin | undefined>;
	saveTin(tin: Tin): Promise<void>;
	archiveTin(id: string): Promise<void>;
	unarchiveTin(id: string): Promise<void>;

	// ─── Tin photos (device-local, never synced) ────────────
	getTinPhoto(tinId: string): Promise<Blob | undefined>;
	setTinPhoto(tinId: string, blob: Blob): Promise<void>;
	deleteTinPhoto(tinId: string): Promise<void>;

	// ─── Sessions ───────────────────────────────────────────
	listSessions(): Promise<Session[]>;
	listSessionsByTin(tinId: string): Promise<PersonalSession[]>;
	getSession(id: string): Promise<Session | undefined>;
	saveSession(session: Session): Promise<void>;
	deleteSession(id: string): Promise<void>;

	// ─── Backup (tombstone- and timestamp-aware; see db/backup.ts) ──
	// The "WithDeleted" / "Raw" variants deliberately DON'T filter tombstones,
	// so a backup can carry deletions forward and a restore can see a deleted
	// row rather than resurrecting it. Everything else in this interface hides
	// tombstones — these five are the only exceptions, hence the explicit names.
	listTinsWithDeleted(): Promise<Tin[]>;
	listSessionsWithDeleted(): Promise<Session[]>;
	getTinRaw(id: string): Promise<Tin | undefined>;
	getSessionRaw(id: string): Promise<Session | undefined>;
	getTinPhotoRecord(tinId: string): Promise<TinPhoto | undefined>;
	setTinPhotoAt(tinId: string, blob: Blob, updatedAt: string): Promise<void>;

	// ─── Aggregate helpers (used by Home / Again? / form defaults) ─
	mostRecentSession(): Promise<Session | undefined>;
	lastNSessions(n: number): Promise<Session[]>;
}
