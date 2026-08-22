import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readDefaults, writeDefaults, hasCustomDefaults } from './defaults';
import { DEFAULT_DEFAULTS } from '$lib/db/types';

// Vitest runs tests in node env by default — localStorage doesn't exist.
// Stub a minimal Map-backed implementation per test.
function stubLocalStorage() {
	const store = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
		setItem: (k: string, v: string) => {
			store.set(k, v);
		},
		removeItem: (k: string) => {
			store.delete(k);
		},
		clear: () => store.clear()
	});
}

describe('readDefaults', () => {
	beforeEach(stubLocalStorage);
	afterEach(() => vi.unstubAllGlobals());

	it('returns DEFAULT_DEFAULTS when nothing has been saved', () => {
		expect(readDefaults()).toEqual(DEFAULT_DEFAULTS);
	});

	it('returns saved defaults after writeDefaults', () => {
		const custom = { style: 'koicha' as const, waterTempC: 70, whisk: 'chasen-120' as const };
		writeDefaults(custom);
		expect(readDefaults()).toEqual(custom);
	});

	it('falls back to DEFAULT_DEFAULTS when stored value is malformed JSON', () => {
		localStorage.setItem('chawan:defaults', 'not-json{{{');
		expect(readDefaults()).toEqual(DEFAULT_DEFAULTS);
	});

	it('falls back to DEFAULT_DEFAULTS when stored value fails schema validation', () => {
		localStorage.setItem('chawan:defaults', JSON.stringify({ style: 'mystery' }));
		expect(readDefaults()).toEqual(DEFAULT_DEFAULTS);
	});
});

describe('writeDefaults', () => {
	beforeEach(stubLocalStorage);
	afterEach(() => vi.unstubAllGlobals());

	it('persists a parseable JSON blob under chawan:defaults', () => {
		writeDefaults({ style: 'usucha', waterTempC: 76, whisk: 'chasen-100' });
		const raw = localStorage.getItem('chawan:defaults');
		expect(raw).not.toBeNull();
		expect(JSON.parse(raw!)).toMatchObject({ style: 'usucha' });
	});

	it('throws no error on invalid input (silently no-ops the write)', () => {
		// @ts-expect-error — deliberately bad shape
		writeDefaults({ style: 'mystery', waterTempC: 'hot', whisk: 'bamboo' });
		expect(localStorage.getItem('chawan:defaults')).toBeNull();
	});
});

describe('hasCustomDefaults', () => {
	beforeEach(stubLocalStorage);
	afterEach(() => vi.unstubAllGlobals());

	it('returns false when nothing has been saved', () => {
		expect(hasCustomDefaults()).toBe(false);
	});

	// This used to assert `true` for a blob equal to DEFAULT_DEFAULTS, which
	// codified the bug: Settings auto-saves on a $effect that fires once right
	// after it loads, so merely OPENING Settings wrote the key with the built-in
	// values and the personal form then showed its "Defaults applied" banner
	// forever, for a user who had never set a default.
	it('returns false when the written values equal the built-in defaults', () => {
		writeDefaults({ ...DEFAULT_DEFAULTS });
		expect(hasCustomDefaults()).toBe(false);
	});

	it('returns true when any single value genuinely differs', () => {
		writeDefaults({ ...DEFAULT_DEFAULTS, waterTempC: 80 });
		expect(hasCustomDefaults()).toBe(true);
	});

	it('returns true when the style differs', () => {
		writeDefaults({ ...DEFAULT_DEFAULTS, style: 'koicha' });
		expect(hasCustomDefaults()).toBe(true);
	});

	it('returns false when the stored blob is malformed (reads as defaults)', () => {
		localStorage.setItem('chawan:defaults', '{not json');
		expect(hasCustomDefaults()).toBe(false);
	});
});
