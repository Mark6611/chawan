// Phase-3 catalog data model. Read-only reference library — entries
// live in src/lib/catalog/matcha-catalog.ts as a typed const array and
// ship in the JS bundle. No DB table, no Supabase round-trip. Updates
// happen via PR.
//
// Architectural decisions (locked in ROADMAP Phase 3):
//   - Snapshot semantics on pick: fields are COPIED into a new Tin row.
//     No foreign key. Tin.catalogId is a soft link, set on creation;
//     editing or removing a CatalogEntry never breaks existing tins.
//   - Taste profile lives only on CatalogEntry. Future: optional
//     Tin.tasteOverride if the user disagrees with the published profile.
//   - Marukyu Kōyamaen's two-axis taxonomy (sharp↔mild × refreshing↔
//     full-body) is the universal coordinate system. Other brands map
//     onto it, or omit taste and surface in the NotPlottedRail.

import type { Grade, Region } from '../db/types';

// ─────────────────────────────────────────────────────────────
// Brands
// ─────────────────────────────────────────────────────────────

/** Narrow union — add a new brand by extending this type AND brands.ts. */
export type BrandId = 'marukyu' | 'ippodo' | 'kanbayashi';

/** Five reserved shapes; three in use as of v1. Adding a brand reuses
 *  triangle next, then square-open. Don't reuse a shape across brands —
 *  shape is the entire visual language of the chart. */
export type BrandGlyphShape = 'disc' | 'ring' | 'diamond' | 'triangle' | 'square-open';

export interface Brand {
	id: BrandId;
	/** Full presentation name, e.g. "Marukyu Kōyamaen". Used as the tin's maker. */
	name: string;
	/** Short name for the chart legend + row meta, e.g. "Marukyu". */
	shortName: string;
	glyph: BrandGlyphShape;
}

// ─────────────────────────────────────────────────────────────
// Taste profile — Marukyu's two-axis taxonomy
//   x: sharp (−1)       → mild (+1)            (left → right on screen)
//   y: refreshing (−1)  → full-body (+1)       (bottom → top on screen, flipped)
// Both axes range −1..+1 strictly. The chart frame is locked to these
// bounds (no auto-scale).
// ─────────────────────────────────────────────────────────────

export interface TasteProfile {
	x: number;
	y: number;
}

// ─────────────────────────────────────────────────────────────
// CatalogEntry — one row per matcha SKU we've curated
// ─────────────────────────────────────────────────────────────

export interface CatalogEntry {
	/** Stable id. Convention: `<brand-prefix>-<kebab-name>` (mk-, ip-, kb-). */
	id: string;

	brand: BrandId;
	/** Product name in romaji, e.g. "Eiju". */
	name: string;
	/** Original kanji/kana rendering, e.g. "永寿". Optional — surfaces in detail + row. */
	kanji?: string;

	grade: Grade;
	region: Region;

	/** Curated cultivar(s). Blends OK as an array; joined with " · " in the
	 *  tin snapshot. Omit if the maker doesn't publish blend composition. */
	cultivars?: string[];

	/** Marukyu-style 2-axis taste coords. Omit when not published or inferred;
	 *  unplotted entries surface in the NotPlottedRail beneath the chart. */
	taste?: TasteProfile;

	/** Whether the brand publishes this as suitable for usucha / koicha. */
	usuchaSuitable: boolean;
	koichaSuitable: boolean;

	/** Optional price snapshot. JPY per gram — one number, formatted at render. */
	jpyPerGram?: number;

	/** One-paragraph description. Renders as italic body in the detail view. */
	description?: string;

	/** Maker's product page URL. Optional; rendered as the "Source" link. */
	productUrl?: string;
}

// ─────────────────────────────────────────────────────────────
// Type guards / narrowing
// ─────────────────────────────────────────────────────────────

/** Narrows to entries with a published taste profile. Used to filter for
 *  the chart while keeping the unplotted set for the NotPlottedRail. */
export const hasTaste = (e: CatalogEntry): e is CatalogEntry & { taste: TasteProfile } =>
	e.taste != null;
