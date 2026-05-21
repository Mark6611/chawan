// UserDefaults — device-level preferences for the Personal session form.
// Lives in localStorage (not Dexie) because it's per-device, not synced data.
// Read by the form on mount; written by Settings (Session 9).

import { DEFAULT_DEFAULTS, UserDefaultsSchema, type UserDefaults } from '$lib/db/types';

const KEY = 'chawan:defaults';

export function readDefaults(): UserDefaults {
	if (typeof localStorage === 'undefined') return DEFAULT_DEFAULTS;
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return DEFAULT_DEFAULTS;
		return UserDefaultsSchema.parse(JSON.parse(raw));
	} catch {
		// Bad JSON, schema mismatch, or any other read error — fall back to
		// the built-in defaults rather than crashing the form.
		return DEFAULT_DEFAULTS;
	}
}

export function writeDefaults(d: UserDefaults): void {
	if (typeof localStorage === 'undefined') return;
	try {
		// Validate before writing so we never persist a malformed blob.
		localStorage.setItem(KEY, JSON.stringify(UserDefaultsSchema.parse(d)));
	} catch {
		// localStorage may be full or disabled — silently no-op.
	}
}

/** Returns true when the saved defaults differ from the hard-coded defaults. */
export function hasCustomDefaults(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(KEY) !== null;
}
