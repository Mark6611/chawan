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

	it('returns true once defaults are written', () => {
		writeDefaults({ style: 'usucha', waterTempC: 76, whisk: 'chasen-100' });
		expect(hasCustomDefaults()).toBe(true);
	});
});
