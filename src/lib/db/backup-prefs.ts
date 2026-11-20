// Device preferences that travel in a backup.
//
// Settings promises a backup will "move it to a new phone", but the payload
// carried tins, sessions and photos only. Brewing defaults, currency, theme
// and the glyph toggle live in localStorage, so a restore on a new phone came
// back with every preference reset.
//
// Its own module, free of runes, so it can be unit-tested (see backup-merge.ts
// for why that matters here).

import { hasCustomDefaults } from '$lib/sessions/defaults';

const DEFAULTS_KEY = 'chawan:defaults';
/** The only keys a backup may write. A backup file is untrusted input. */
export const PREF_KEYS = [DEFAULTS_KEY, 'chawan:currency', 'chawan:theme', 'chawan:no-glyph'];

/** Longest value worth keeping; the real ones are under 100 characters. */
const MAX_VALUE_LENGTH = 500;

export function readPrefs(): Record<string, string> {
	const out: Record<string, string> = {};
	if (typeof localStorage === 'undefined') return out;
	for (const key of PREF_KEYS) {
		const v = localStorage.getItem(key);
		if (v !== null) out[key] = v;
	}
	return out;
}

/**
 * Apply a backup's preferences, never over a choice made on this device.
 * Returns how many were applied.
 *
 * "A choice made on this device" is a set key — except for the brewing
 * defaults, whose key Settings writes with the built-in values just by being
 * opened. Those count as a choice only when they differ from the built-ins,
 * or the one screen you restore from would block its own restore.
 */
export function applyPrefs(prefs: unknown): number {
	if (typeof localStorage === 'undefined') return 0;
	if (!prefs || typeof prefs !== 'object') return 0;
	const incoming = prefs as Record<string, unknown>;
	let applied = 0;
	for (const key of PREF_KEYS) {
		const v = incoming[key];
		if (typeof v !== 'string' || v.length > MAX_VALUE_LENGTH) continue;
		const chosenHere =
			key === DEFAULTS_KEY ? hasCustomDefaults() : localStorage.getItem(key) !== null;
		if (chosenHere) continue;
		try {
			localStorage.setItem(key, v);
			applied++;
		} catch {
			// Storage full or disabled — preferences are not worth failing a restore.
		}
	}
	return applied;
}
