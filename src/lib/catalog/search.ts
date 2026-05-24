// Substring search across the catalog. Trivial — no fuzzy library; with
// ~100 entries it's fine. If the catalog grows past ~500 entries, swap in
// a real fuzzy matcher (Fuse.js or similar).
//
// Matches on romaji `name`, on `kanji` (case-preserved for CJK), and on
// the brand's shortName. Empty query returns everything.

import { BRANDS } from './brands';
import type { CatalogEntry } from './types';

export function searchCatalog(query: string, entries: readonly CatalogEntry[]): CatalogEntry[] {
	const q = query.trim();
	if (!q) return [...entries];
	const lower = q.toLowerCase();
	return entries.filter((e) => {
		if (e.name.toLowerCase().includes(lower)) return true;
		if (e.kanji && e.kanji.includes(q)) return true;
		const brand = BRANDS[e.brand];
		if (brand && brand.shortName.toLowerCase().includes(lower)) return true;
		return false;
	});
}
