import { describe, expect, it } from 'vitest';
import { MATCHA_CATALOG, CATALOG_BY_ID, getCatalogEntry } from './matcha-catalog';
import { BRANDS } from './brands';
import { hasTaste } from './types';

describe('MATCHA_CATALOG data integrity', () => {
	it('has at least the v1 seed count (20 entries)', () => {
		expect(MATCHA_CATALOG.length).toBeGreaterThanOrEqual(20);
	});

	it('every id is unique', () => {
		const ids = MATCHA_CATALOG.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('every brand id resolves in BRANDS', () => {
		for (const e of MATCHA_CATALOG) {
			expect(BRANDS[e.brand], `brand "${e.brand}" referenced by ${e.id}`).toBeTruthy();
		}
	});

	it('every taste profile is within ±1 on both axes', () => {
		for (const e of MATCHA_CATALOG.filter(hasTaste)) {
			expect(e.taste.x, `${e.id}.taste.x`).toBeGreaterThanOrEqual(-1);
			expect(e.taste.x, `${e.id}.taste.x`).toBeLessThanOrEqual(1);
			expect(e.taste.y, `${e.id}.taste.y`).toBeGreaterThanOrEqual(-1);
			expect(e.taste.y, `${e.id}.taste.y`).toBeLessThanOrEqual(1);
		}
	});

	it('Marukyu entries all have published taste coords', () => {
		// Marukyu publishes a chart; any mk-* entry without taste is likely a typo.
		const marukyuMissing = MATCHA_CATALOG.filter(
			(e) => e.brand === 'marukyu' && !hasTaste(e)
		);
		expect(marukyuMissing, 'mk-* without taste coords').toEqual([]);
	});

	it('id convention matches brand prefix', () => {
		const prefixForBrand: Record<string, string> = {
			marukyu: 'mk-',
			ippodo: 'ip-',
			kanbayashi: 'kb-'
		};
		for (const e of MATCHA_CATALOG) {
			const prefix = prefixForBrand[e.brand];
			expect(e.id.startsWith(prefix), `${e.id} should start with "${prefix}"`).toBe(true);
		}
	});

	it('CATALOG_BY_ID covers every entry', () => {
		for (const e of MATCHA_CATALOG) {
			expect(CATALOG_BY_ID[e.id]).toBe(e);
		}
	});

	it('getCatalogEntry returns the entry for a known id', () => {
		expect(getCatalogEntry('mk-eiju')?.name).toBe('Eiju');
	});

	it('getCatalogEntry returns undefined for an unknown id', () => {
		expect(getCatalogEntry('mk-doesntexist')).toBeUndefined();
	});
});
