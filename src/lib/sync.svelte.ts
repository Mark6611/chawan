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
// that happened while disconnected.
//
// Conflict resolution — last-write-wins via updatedAt, enforced on BOTH sides:
//   • Server: a BEFORE UPDATE trigger (migration 0006) ignores any write whose
//     "updatedAt" is older than the stored row, so a stale device's push can
//     never clobber a newer edit or resurrect a tombstoned (deletedAt) row.
//   • Client: mergeNewer() writes a pulled server row into Dexie only when it
//     is newer-or-equal to the local copy, so an unsynced local edit is never
//     overwritten by an older server row.
// Without both, a plain upsert / bulkPut silently rolls back cross-device edits.

import type { Table } from 'dexie';
import { supabase, supabaseEnabled } from './supabase';
import { auth } from './auth.svelte';
import { db } from './db/dexie';
import { SessionSchema, TinSchema, type Session, type Tin } from './db/types';
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

// Merge pulled server rows into Dexie, keeping the newer copy per id. A server
// row is written only when it is newer-or-equal to the local row (or the row is
// new locally). This is the client half of last-write-wins: it stops a pull from
// clobbering an unsynced local edit that is newer than what the server returned
// (e.g. a write whose background push failed, or an edit made mid-sync).
async function mergeNewer<T extends { id: string; updatedAt: string }>(
	table: Table<T, string>,
	incoming: T[]
): Promise<void> {
	if (incoming.length === 0) return;
	const locals = await table.bulkGet(incoming.map((r) => r.id));
	const localTimeById = new Map<string, number>();
	for (const row of locals) {
		if (row) localTimeById.set(row.id, new Date(row.updatedAt).getTime());
	}
	const fresher = incoming.filter((r) => {
		const localTime = localTimeById.get(r.id);
		return localTime === undefined || new Date(r.updatedAt).getTime() >= localTime;
	});
	if (fresher.length > 0) await table.bulkPut(fresher);
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
	// Defensive: validate before pushing. A stale Dexie row from before a
	// schema rename (e.g. legacy `storeName` on session records) would
	// otherwise reach Postgres and get rejected with an opaque "column not
	// found" error. Strip the row from the push silently; the user can
	// clear IndexedDB to drop the leftover entirely.
	const parsed = TinSchema.safeParse(tin);
	if (!parsed.success) {
		console.warn('[sync] pushTin skipping legacy row:', tin.id, parsed.error.issues[0]?.message);
		return;
	}
	void supabase
		.from('matcha_tins')
		.upsert(withUserId(parsed.data, user.id))
		.then(({ error }) => {
			if (error) {
				console.warn('[sync] pushTin failed:', error.message);
				syncState.lastError = error.message;
			} else {
				// A later successful push heals a stuck error indicator from an
				// earlier transient failure (otherwise the red dot sticks until
				// the next fullSync, which a perpetually-online user rarely hits).
				syncState.lastError = null;
			}
		});
}

export function pushSession(session: Session): void {
	if (!supabase) return;
	const user = auth.user;
	if (!user) return;
	if (!isOnline()) return;
	const parsed = SessionSchema.safeParse(session);
	if (!parsed.success) {
		console.warn(
			'[sync] pushSession skipping legacy row:',
			session.id,
			parsed.error.issues[0]?.message
		);
		return;
	}
	void supabase
		.from('matcha_sessions')
		.upsert(withUserId(parsed.data, user.id) as never)
		.then(({ error }) => {
			if (error) {
				console.warn('[sync] pushSession failed:', error.message);
				syncState.lastError = error.message;
			} else {
				syncState.lastError = null;
			}
		});
}

// ─── Full sync — push local, pull server, merge ───────────────────────

// Bumped by clearLocalCache() (sign-out). fullSync snapshots it and bails
// before writing to Dexie if it changed mid-flight, so a sync that was already
// in its network pull when the user signed out can't re-populate the cache with
// the signed-out user's rows — which would silently defeat the sign-out wipe.
let cacheGeneration = 0;

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
	const gen = cacheGeneration;

	try {
		// 1) Push everything local up. This handles the "first sign-in"
		//    migration — any rows the user logged offline get uploaded.
		const [localTins, localSessions] = await Promise.all([
			db.tins.toArray(),
			db.sessions.toArray()
		]);

		// Filter out any legacy rows that no longer parse against the current
		// schema (e.g. pre-rename `kind: 'store'` sessions). They stay local
		// but don't pollute the server with bad payloads.
		const validTins = localTins.filter((t) => TinSchema.safeParse(t).success);
		const validSessions = localSessions.filter((s) => SessionSchema.safeParse(s).success);
		const skippedTins = localTins.length - validTins.length;
		const skippedSessions = localSessions.length - validSessions.length;
		if (skippedTins > 0 || skippedSessions > 0) {
			console.warn(
				`[sync] skipping ${skippedTins} tin(s) + ${skippedSessions} session(s) that don't match the current schema (likely legacy rows from before a rename — clear IndexedDB to drop them)`
			);
		}

		if (validTins.length > 0) {
			const payload = validTins.map((t) => withUserId(t, user.id));
			const { error } = await supabase.from('matcha_tins').upsert(payload);
			if (error) {
				console.warn('[sync] push tins failed:', error.message);
				syncState.lastError = error.message;
			}
		}

		if (validSessions.length > 0) {
			const payload = validSessions.map((s) => withUserId(s, user.id)) as never;
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

		// Bail if the cache was cleared (sign-out) or the user changed while we
		// were awaiting the pull — otherwise we'd re-populate the just-cleared
		// Dexie tables with the signed-out user's server rows, defeating the wipe.
		if (gen !== cacheGeneration || auth.user?.id !== user.id) return;

		// 3) Merge into local cache, keeping the newer copy per id (mergeNewer).
		//    New server rows get added; a server row that is OLDER than the local
		//    copy is skipped so an unsynced local edit survives the pull. We never
		//    bulkDelete here; soft-delete tombstones do the job.
		await db.transaction('rw', db.tins, db.sessions, async () => {
			await mergeNewer(db.tins, serverTins);
			await mergeNewer(db.sessions, serverSessions);
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

// ─── Sign-out: wipe the local cache ───────────────────────────────────
// The Dexie cache is device-global, not per-user. If it survived sign-out,
// the next user on a shared device would (a) see the previous user's tins and
// sessions locally, and (b) have fullSync stamp those residual rows with THEIR
// user id and upload them into THEIR Supabase account. Clearing on sign-out
// closes that cross-user leak. Photos are device-local too, so they go as well.
export async function clearLocalCache(): Promise<void> {
	// Invalidate any in-flight fullSync so its pending merge can't re-populate
	// the tables we're about to clear (see cacheGeneration).
	cacheGeneration++;
	await db.transaction('rw', db.tins, db.sessions, db.tinPhotos, async () => {
		await Promise.all([db.tins.clear(), db.sessions.clear(), db.tinPhotos.clear()]);
	});
	syncState.lastSyncAt = null;
	syncState.lastError = null;
	syncState.signal();
}

// ─── Auth + online listeners ─────────────────────────────────────────

if (typeof window !== 'undefined' && supabase) {
	supabase.auth.onAuthStateChange((event, session) => {
		if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
			void fullSync();
		} else if (event === 'SIGNED_OUT') {
			// Covers implicit sign-outs too (token expiry, sign-out in another
			// tab) — not just the explicit Settings button.
			void clearLocalCache();
		}
	});

	// Reconnect: catch up any writes that were deferred while offline.
	window.addEventListener('online', () => {
		if (auth.user) void fullSync();
	});
}

export { supabaseEnabled };
