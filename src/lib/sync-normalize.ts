// Pure normalization + parsing helpers for the sync layer.
// Extracted from sync.svelte.ts so Vitest can import them as plain TS
// (without needing the Svelte preprocessor to handle a .svelte.ts file).
//
// The gotcha these helpers exist to solve: PostgREST returns numeric
// columns as strings ("2.0" instead of 2) and timestamps with an offset
// suffix ("2026-05-21T14:32:00+00:00") instead of the Z-suffix UTC form
// Zod's z.string() shapes expect. Without normalization, every row from
// the server fails Zod parsing.

import { SessionSchema, TinSchema, type Session, type Tin } from './db/types';

export const TIN_NUMERIC_KEYS = new Set(['weightGrams']);
export const TIN_TIMESTAMP_KEYS = new Set(['openedAt', 'createdAt', 'updatedAt', 'deletedAt']);
export const SESSION_NUMERIC_KEYS = new Set([
	'powderGrams',
	'waterGrams',
	'waterTempC',
	'priceCents',
	'rating'
]);
export const SESSION_TIMESTAMP_KEYS = new Set([
	'brewedAt',
	'createdAt',
	'updatedAt',
	'deletedAt'
]);

export function normalizeFromServer(
	row: Record<string, unknown>,
	numericKeys: Set<string>,
	timestampKeys: Set<string>
): Record<string, unknown> {
	const cleaned: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		// Strip userId — Supabase-internal RLS field the app doesn't carry.
		if (key === 'userId') continue;
		// Drop nulls so optional fields stay undefined (Zod prefers this).
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

export function parseTinFromServer(row: Record<string, unknown>): Tin | null {
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

export function parseSessionFromServer(row: Record<string, unknown>): Session | null {
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
