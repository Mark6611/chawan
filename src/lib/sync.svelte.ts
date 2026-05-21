// Sync layer — keeps IndexedDB (local cache) in line with Supabase (cloud).
// Local is always read-first. Writes hit Dexie immediately, then fire a
// background push to Supabase. fullSync() does push-all + pull-all + merge,
// fired on sign-in and on the "Sync now" button in Settings.
//
// Tombstones (deletedAt) carry soft deletes across devices: the row stays
// in both DBs with deletedAt set; reads filter it out everywhere.
//
// Conflict resolution: last-write-wins via updatedAt on upsert. The
// matcha_*  Postgres tables use the same primary key (id) as Dexie, so
// upsert handles "new on server" and "newer on server" both as a put.

import { supabase, supabaseEnabled } from './supabase';
import { auth } from './auth.svelte';
import { db } from './db/dexie';
import { SessionSchema, TinSchema, type Session, type Tin } from './db/types';

// ─── Reactive sync state ──────────────────────────────────────────────
// Pages read `syncState.tick` inside a $effect to re-fetch after a pull.

class SyncState {
	syncing = $state(false);
	lastError = $state<string | null>(null);
	lastSyncAt = $state<string | null>(null);
	/** Bumped by the sync layer after a successful pull. Pages depend on
	 *  this inside $effect to re-run their load() on remote changes. */
	tick = $state(0);

	signal() {
		this.tick++;
	}
}

export const syncState = new SyncState();

// ─── Normalization (PostgREST → app shapes) ───────────────────────────
// PostgREST returns numeric columns as strings and timestamps with offset
// (e.g. "2026-05-21T14:32:00+00:00"). Coerce numbers and normalize
// timestamps to "Z"-suffix UTC so Zod's z.string() shapes accept them.

const TIN_NUMERIC_KEYS = new Set(['weightGrams']);
const TIN_TIMESTAMP_KEYS = new Set(['openedAt', 'createdAt', 'updatedAt', 'deletedAt']);
const SESSION_NUMERIC_KEYS = new Set([
	'powderGrams',
	'waterGrams',
	'waterTempC',
	'priceCents',
	'rating'
]);
const SESSION_TIMESTAMP_KEYS = new Set(['brewedAt', 'createdAt', 'updatedAt', 'deletedAt']);

function normalizeFromServer(
	row: Record<string, unknown>,
	numericKeys: Set<string>,
	timestampKeys: Set<string>
): Record<string, unknown> {
	const cleaned: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		// Strip userId before validation — it's a Supabase-internal field
		// the app doesn't carry on its records.
		if (key === 'userId') continue;
		// Drop nulls so optional fields stay undefined (Zod's preferred shape).
		if (value === null) continue;
		if (numericKeys.has(key) && typeof value === 'string') {
			const n = Number(value);
			if (!Number.isNaN(n)) {
				cleaned[key] = n;
				continue;
			}
		}
		if (timestampKeys.has(key) && typeof value === 'string') {
			const d = new Date(value);
			if (!Number.isNaN(d.getTime())) {
				cleaned[key] = d.toISOString();
				continue;
			}
		}
		cleaned[key] = value;
	}
	return cleaned;
}

function parseTinFromServer(row: Record<string, unknown>): Tin | null {
	const cleaned = normalizeFromServer(row, TIN_NUMERIC_KEYS, TIN_TIMESTAMP_KEYS);
	const result = TinSchema.safeParse(cleaned);
	if (!result.success) {
		const issue = result.error.issues[0];
		console.warn(
			`[sync] Tin from server rejected at "${issue?.path.join('.')}": ${issue?.message}`,
			cleaned
		);
		return null;
	}
	return result.data;
}

function parseSessionFromServer(row: Record<string, unknown>): Session | null {
	const cleaned = normalizeFromServer(row, SESSION_NUMERIC_KEYS, SESSION_TIMESTAMP_KEYS);
	const result = SessionSchema.safeParse(cleaned);
	if (!result.success) {
		const issue = result.error.issues[0];
		console.warn(
			`[sync] Session from server rejected at "${issue?.path.join('.')}": ${issue?.message}`,
			cleaned
		);
		return null;
	}
	return result.data;
}

function withUserId<T>(row: T, userId: string): T & { userId: string } {
	return { ...row, userId };
}

// ─── Push helpers — called by repository on each write ────────────────
// Fire-and-forget; failures only log + set lastError. The next fullSync
// re-uploads any rows that failed (updatedAt makes last-write-wins safe).

export function pushTin(tin: Tin): void {
	if (!supabase) return;
	const user = auth.user;
	if (!user) return;
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

// ─── Auth listener — sync on sign-in / initial session ───────────────

if (typeof window !== 'undefined' && supabase) {
	supabase.auth.onAuthStateChange((event, session) => {
		if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
			void fullSync();
		}
	});
}

// Re-export so callers (Settings) don't need to know the module shape.
export { supabaseEnabled };
