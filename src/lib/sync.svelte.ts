// Sync layer — keeps IndexedDB (local cache) in line with Supabase (cloud).
// Local is always read-first. Writes hit Dexie immediately, then fire a
// background push to Supabase. fullSync() does push-all + pull-all + merge,
// fired on sign-in, on reconnect, and on the "Sync now" button in Settings.
//
// Tombstones (deletedAt) carry soft deletes across devices: the row stays
// in both DBs with deletedAt set; reads filter it out everywhere.
//
// Offline behavior: pushes that happen while navigator.onLine is false are
// silently skipped (no spurious "failed" errors). The 'online' event fires
// fullSync(), which pushes every local row and so catches up any writes
// that happened while disconnected. Last-write-wins via updatedAt keeps
// this safe.
//
// Conflict resolution: last-write-wins via updatedAt on upsert. The
// matcha_* Postgres tables use the same primary key (id) as Dexie, so
// upsert handles "new on server" and "newer on server" both as a put.

import { supabase, supabaseEnabled } from './supabase';
import { auth } from './auth.svelte';
import { db } from './db/dexie';
import { type Session, type Tin } from './db/types';
import { parseSessionFromServer, parseTinFromServer } from './sync-normalize';

// ─── Reactive sync state ──────────────────────────────────────────────
// Pages read `syncState.tick` inside a $effect to re-fetch after a pull.

class SyncState {
	syncing = $state(false);
	lastError = $state<string | null>(null);
	lastSyncAt = $state<string | null>(null);
	/** Bumped after a successful pull. Pages depend on this inside $effect
	 *  to re-run their load() on remote changes. */
	tick = $state(0);

	signal() {
		this.tick++;
	}
}

export const syncState = new SyncState();

// ─── Online detection ────────────────────────────────────────────────

function isOnline(): boolean {
	// In SSR or non-browser contexts, assume "online" (push won't actually
	// run there anyway because auth.user is null).
	if (typeof navigator === 'undefined') return true;
	return navigator.onLine !== false;
}

function withUserId<T>(row: T, userId: string): T & { userId: string } {
	return { ...row, userId };
}

// ─── Push helpers — called by repository on each write ────────────────
// Fire-and-forget; failures only log + set lastError. The next fullSync
// re-uploads any rows that failed.

export function pushTin(tin: Tin): void {
	if (!supabase) return;
	const user = auth.user;
	if (!user) return;
	// Offline → defer. The 'online' listener will fire fullSync to catch up.
	if (!isOnline()) return;
	void supabase
		.from('matcha_tins')
		.upsert(withUserId(tin, user.id))
		.then(({ error }) => {
			if (error) {
				console.warn('[sync] pushTin failed:', error.message);
				syncState.lastError = error.message;
			}
		});
}

export function pushSession(session: Session): void {
	if (!supabase) return;
	const user = auth.user;
	if (!user) return;
	if (!isOnline()) return;
	void supabase
		.from('matcha_sessions')
		.upsert(withUserId(session, user.id) as never)
		.then(({ error }) => {
			if (error) {
				console.warn('[sync] pushSession failed:', error.message);
				syncState.lastError = error.message;
			}
		});
}

// ─── Full sync — push local, pull server, merge ───────────────────────

export async function fullSync(): Promise<void> {
	if (!supabase) return;
	const user = auth.user;
	if (!user) return;
	if (syncState.syncing) return;
	if (!isOnline()) {
		syncState.lastError = 'Offline — waiting to reconnect.';
		return;
	}

	syncState.syncing = true;
	syncState.lastError = null;

	try {
		// 1) Push everything local up. This handles the "first sign-in"
		//    migration — any rows the user logged offline get uploaded.
		const [localTins, localSessions] = await Promise.all([
			db.tins.toArray(),
			db.sessions.toArray()
		]);

		if (localTins.length > 0) {
			const payload = localTins.map((t) => withUserId(t, user.id));
			const { error } = await supabase.from('matcha_tins').upsert(payload);
			if (error) {
				console.warn('[sync] push tins failed:', error.message);
				syncState.lastError = error.message;
			}
		}

		if (localSessions.length > 0) {
			const payload = localSessions.map((s) => withUserId(s, user.id)) as never;
			const { error } = await supabase.from('matcha_sessions').upsert(payload);
			if (error) {
				console.warn('[sync] push sessions failed:', error.message);
				syncState.lastError = error.message;
			}
		}

		// 2) Pull everything from the server. RLS scopes us to our own rows.
		const [tinsRes, sessionsRes] = await Promise.all([
			supabase.from('matcha_tins').select('*'),
			supabase.from('matcha_sessions').select('*')
		]);

		if (tinsRes.error) {
			console.warn('[sync] pull tins failed:', tinsRes.error.message);
			syncState.lastError = tinsRes.error.message;
			return;
		}
		if (sessionsRes.error) {
			console.warn('[sync] pull sessions failed:', sessionsRes.error.message);
			syncState.lastError = sessionsRes.error.message;
			return;
		}

		const serverTins = (tinsRes.data ?? [])
			.map((r) => parseTinFromServer(r as Record<string, unknown>))
			.filter((t): t is Tin => t !== null);
		const serverSessions = (sessionsRes.data ?? [])
			.map((r) => parseSessionFromServer(r as Record<string, unknown>))
			.filter((s): s is Session => s !== null);

		// 3) Merge into local cache. bulkPut upserts by primary key — newer
		//    server rows replace older locals, new server rows get added.
		//    We never bulkDelete here; soft-delete tombstones do the job.
		await db.transaction('rw', db.tins, db.sessions, async () => {
			if (serverTins.length > 0) await db.tins.bulkPut(serverTins);
			if (serverSessions.length > 0) await db.sessions.bulkPut(serverSessions);
		});

		syncState.lastSyncAt = new Date().toISOString();
		console.info(
			`[sync] pushed: ${localTins.length} tins + ${localSessions.length} sessions; pulled: ${serverTins.length} tins + ${serverSessions.length} sessions`
		);

		// Signal listening pages to re-fetch through the repository.
		syncState.signal();
	} catch (err) {
		console.error('[sync] failed:', err);
		syncState.lastError = err instanceof Error ? err.message : String(err);
	} finally {
		syncState.syncing = false;
	}
}

// ─── Auth + online listeners ─────────────────────────────────────────

if (typeof window !== 'undefined' && supabase) {
	supabase.auth.onAuthStateChange((event, session) => {
		if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
			void fullSync();
		}
	});

	// Reconnect: catch up any writes that were deferred while offline.
	window.addEventListener('online', () => {
		if (auth.user) void fullSync();
	});
}

export { supabaseEnabled };
