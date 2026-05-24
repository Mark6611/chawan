// Single source of truth for the brands the catalog supports.
// Adding a brand later:
//   1. Add a value to BrandId in types.ts
//   2. Append a Brand entry here (assign a reserved glyph shape)
//   3. Add catalog entries referencing the new brand
// The chart's brand legend picks up the new entry automatically.

import type { Brand, BrandId } from './types';

export const BRANDS: Record<BrandId, Brand> = {
	marukyu: {
		id: 'marukyu',
		name: 'Marukyu Kōyamaen',
		shortName: 'Marukyu',
		glyph: 'disc'
	},
	ippodo: {
		id: 'ippodo',
		name: 'Ippodo',
		shortName: 'Ippodo',
		glyph: 'ring'
	},
	kanbayashi: {
		id: 'kanbayashi',
		name: 'Kanbayashi Shunsho',
		shortName: 'Kanbayashi',
		glyph: 'diamond'
	}
	// Reserved shapes for future brands:
	//   'triangle'     — filled triangle (next assignment)
	//   'square-open'  — hairline square (after that)
};

/** Throws in dev if id isn't registered — surfaces typos in catalog data fast. */
export function getBrand(id: BrandId): Brand {
	const b = BRANDS[id];
	if (!b) throw new Error(`Unknown brand id: ${id}`);
	return b;
}

export function listBrands(): Brand[] {
	return Object.values(BRANDS);
}
