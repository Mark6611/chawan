import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyPrefs, readPrefs } from './backup-prefs';

function stubLocalStorage(seed: Record<string, string> = {}) {
	const store = new Map<string, string>(Object.entries(seed));
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k),
		clear: () => store.clear()
	});
	return store;
}

const BUILT_IN = JSON.stringify({ style: 'usucha', waterTempC: 76, whisk: 'chasen-100' });
const CUSTOM = JSON.stringify({ style: 'koicha', waterTempC: 70, whisk: 'chasen-80' });

describe('backup preferences', () => {
	beforeEach(() => void stubLocalStorage());
	afterEach(() => vi.unstubAllGlobals());

	it('exports only the known preference keys', () => {
		stubLocalStorage({ 'chawan:theme': 'night', 'chawan:currency': 'JPY', unrelated: 'x' });
		expect(readPrefs()).toEqual({ 'chawan:theme': 'night', 'chawan:currency': 'JPY' });
	});

	it('restores everything onto a fresh device', () => {
		const store = stubLocalStorage();
		const n = applyPrefs({
			'chawan:theme': 'night',
			'chawan:currency': 'JPY',
			'chawan:defaults': CUSTOM
		});
		expect(n).toBe(3);
		expect(store.get('chawan:theme')).toBe('night');
		expect(store.get('chawan:defaults')).toBe(CUSTOM);
	});

	it('never overrides a choice made on this device', () => {
		const store = stubLocalStorage({ 'chawan:theme': 'day', 'chawan:defaults': CUSTOM });
		const other = JSON.stringify({ style: 'latte', waterTempC: 80, whisk: 'electric' });
		expect(applyPrefs({ 'chawan:theme': 'night', 'chawan:defaults': other })).toBe(0);
		expect(store.get('chawan:theme')).toBe('day');
		expect(store.get('chawan:defaults')).toBe(CUSTOM);
	});

	// Settings writes the defaults key with the built-in values just by being
	// opened — and Settings is the screen you restore from. A key-existence
	// rule would make the restore block itself every time.
	it('treats built-in defaults written by opening Settings as no choice', () => {
		const store = stubLocalStorage({ 'chawan:defaults': BUILT_IN });
		expect(applyPrefs({ 'chawan:defaults': CUSTOM })).toBe(1);
		expect(store.get('chawan:defaults')).toBe(CUSTOM);
	});

	it('ignores keys it does not own, non-strings and oversized values', () => {
		const store = stubLocalStorage();
		const n = applyPrefs({
			'some:other-key': 'x',
			'chawan:theme': 42,
			'chawan:currency': 'J'.repeat(5000)
		});
		expect(n).toBe(0);
		expect(store.size).toBe(0);
	});

	it('tolerates a backup with no prefs block', () => {
		expect(applyPrefs(undefined)).toBe(0);
		expect(applyPrefs('nope')).toBe(0);
	});
});
