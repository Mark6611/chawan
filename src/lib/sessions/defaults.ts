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

/** Returns true when the saved defaults differ from the hard-coded defaults.
 *
 *  Compares VALUES, not key existence. Settings auto-saves on a $effect that
 *  fires once right after it loads, so merely opening Settings and touching
 *  nothing wrote the key with the built-in values — and a key-existence check
 *  then reported "custom" forever. That put the personal form's "Defaults
 *  applied" banner on every new session for a user who had never set a default,
 *  which is exactly the noise that banner's own guard exists to prevent. */
export function hasCustomDefaults(): boolean {
	if (typeof localStorage === 'undefined') return false;
	const raw = localStorage.getItem(KEY);
	if (raw === null) return false;
	const saved = readDefaults(); // falls back to DEFAULT_DEFAULTS on bad JSON
	return (
		saved.style !== DEFAULT_DEFAULTS.style ||
		saved.waterTempC !== DEFAULT_DEFAULTS.waterTempC ||
		saved.whisk !== DEFAULT_DEFAULTS.whisk
	);
}
