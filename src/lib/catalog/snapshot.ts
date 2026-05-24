// snapshotForTin — converts a CatalogEntry into the field shape the
// TinForm uses to prefill. Called when the user picks from the catalog
// to create a new tin.
//
// One-way copy: after this, the Tin owns its own snapshot. Future edits
// to the CatalogEntry don't affect the Tin (snapshot semantics, see
// docs/catalog_design_brief.md §architecture).

import { getBrand } from './brands';
import type { CatalogEntry } from './types';
import type { Grade, Region } from '../db/types';

/** Fields the TinForm needs to prefill. Weight, openedAt, harvestDate
 *  stay user-input (they vary per physical tin, not per SKU). */
export interface TinSnapshot {
	name: string;
	maker: string;
	grade: Grade;
	region: Region;
	cultivar?: string;
	/** Soft link back to the catalog entry. Drives the "I've tried" indicator. */
	catalogId: string;
}

export function snapshotForTin(e: CatalogEntry): TinSnapshot {
	return {
		name: e.name,
		maker: getBrand(e.brand).name,
		grade: e.grade,
		region: e.region,
		// Tin schema takes a single cultivar string; join blends with " · ".
		cultivar: e.cultivars?.join(' · '),
		catalogId: e.id
	};
}
