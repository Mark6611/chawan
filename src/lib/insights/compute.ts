// Insights — pure derivations over the user's sessions + tins. Computed at
// read time (no stored aggregates, no new table), same convention as
// sessions/compute.ts + tins/compute.ts. Fully unit-tested.
//
// Every function is defensive: empty input → null / 0 / empty, never throws.
// The /insights page guards each section so a near-empty log reads as calm
// "not enough yet" rather than broken.

import { isCafe, isPersonal, type Session, type Tin } from '$lib/db/types';
import { getCatalogEntry } from '$lib/catalog/matcha-catalog';
import { hasTaste } from '$lib/catalog/types';

const DAY = 24 * 60 * 60 * 1000;

// ─── Consumption rhythm ──────────────────────────────────────────────

export function bowlsInWindow(
	sessions: readonly Session[],
	days: number,
	now: Date = new Date()
): number {
	const cutoff = now.getTime() - days * DAY;
	return sessions.filter((s) => new Date(s.brewedAt).getTime() >= cutoff).length;
}

export function lifetimeBowls(sessions: readonly Session[]): number {
	return sessions.length;
}

/** Total grams of matcha consumed across all personal sessions. */
export function totalGramsConsumed(sessions: readonly Session[]): number {
	return sessions
		.filter(isPersonal)
		.reduce((sum, s) => sum + (s.powderGrams || 0), 0);
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Day of week the user brews most often, or null if no sessions. */
export function busiestDayOfWeek(sessions: readonly Session[]): string | null {
	if (sessions.length === 0) return null;
	const tally = new Array(7).fill(0);
	for (const s of sessions) tally[new Date(s.brewedAt).getDay()]++;
	let maxIdx = 0;
	for (let i = 1; i < 7; i++) if (tally[i] > tally[maxIdx]) maxIdx = i;
	return DAY_NAMES[maxIdx];
}

// ─── Style + brew habits ─────────────────────────────────────────────

export interface StyleSplit {
	usucha: number;
	koicha: number;
	latte: number;
}

export function styleSplit(sessions: readonly Session[]): StyleSplit {
	const split: StyleSplit = { usucha: 0, koicha: 0, latte: 0 };
	for (const s of sessions) split[s.style]++;
	return split;
}

export interface BrewAverages {
	powderGrams: number;
	waterGrams: number;
	waterTempC: number;
}

/** Average brew parameters across personal sessions, or null if none. */
export function averageBrew(sessions: readonly Session[]): BrewAverages | null {
	const personal = sessions.filter(isPersonal);
	if (personal.length === 0) return null;
	const n = personal.length;
	return {
		powderGrams: personal.reduce((a, s) => a + s.powderGrams, 0) / n,
		waterGrams: personal.reduce((a, s) => a + s.waterGrams, 0) / n,
		waterTempC: personal.reduce((a, s) => a + s.waterTempC, 0) / n
	};
}

/** Most-used whisk across personal sessions, or null. */
export function whiskPreference(sessions: readonly Session[]): string | null {
	const tally = new Map<string, number>();
	for (const s of sessions.filter(isPersonal)) {
		if (!s.whisk) continue;
		tally.set(s.whisk, (tally.get(s.whisk) ?? 0) + 1);
	}
	let best: string | null = null;
	let bestN = 0;
	for (const [whisk, n] of tally) if (n > bestN) ((best = whisk), (bestN = n));
	return best;
}

// ─── Ratings ─────────────────────────────────────────────────────────

const isRated = (s: Session): s is Session & { rating: number } =>
	s.rating != null && s.rating > 0;

/** Average rating across rated sessions (rating > 0), or null. */
export function averageRating(sessions: readonly Session[]): number | null {
	const rated = sessions.filter(isRated);
	if (rated.length === 0) return null;
	return rated.reduce((a, s) => a + s.rating, 0) / rated.length;
}

export function ratedCount(sessions: readonly Session[]): number {
	return sessions.filter(isRated).length;
}

// ─── Tins ────────────────────────────────────────────────────────────

export interface TinUsage {
	tin: Tin;
	count: number;
}

/** Tin with the most personal sessions, or null. Ties broken by recency
 *  of the tin's createdAt (newer wins), which is arbitrary-but-stable. */
export function mostUsedTin(sessions: readonly Session[], tins: readonly Tin[]): TinUsage | null {
	if (tins.length === 0) return null;
	const counts = new Map<string, number>();
	for (const s of sessions.filter(isPersonal)) {
		counts.set(s.tinId, (counts.get(s.tinId) ?? 0) + 1);
	}
	let best: TinUsage | null = null;
	for (const tin of tins) {
		const count = counts.get(tin.id) ?? 0;
		if (count === 0) continue;
		if (!best || count > best.count) best = { tin, count };
	}
	return best;
}

// ─── Cafe spend (per currency — never mix) ──────────────────────────

/** Total cafe spend grouped by ISO currency code. Cents. */
export function cafeSpendByCurrency(sessions: readonly Session[]): Record<string, number> {
	const totals: Record<string, number> = {};
	for (const s of sessions.filter(isCafe)) {
		if (s.priceCents == null) continue;
		const cur = s.priceCurrency ?? 'USD';
		totals[cur] = (totals[cur] ?? 0) + s.priceCents;
	}
	return totals;
}

export function mostVisitedCafe(sessions: readonly Session[]): { name: string; count: number } | null {
	const tally = new Map<string, number>();
	for (const s of sessions.filter(isCafe)) {
		tally.set(s.cafeName, (tally.get(s.cafeName) ?? 0) + 1);
	}
	let best: { name: string; count: number } | null = null;
	for (const [name, count] of tally) {
		if (!best || count > best.count) best = { name, count };
	}
	return best;
}

// ─── Catalog coverage + palate map ──────────────────────────────────

/** Distinct catalog ids the user owns (via Tin.catalogId), live tins only. */
export function ownedCatalogIds(tins: readonly Tin[]): string[] {
	const ids = new Set<string>();
	for (const t of tins) if (t.catalogId) ids.add(t.catalogId);
	return Array.from(ids);
}

export interface PalateCentroid {
	x: number; // sharp(−1) → mild(+1)
	y: number; // refreshing(−1) → full-body(+1)
	mappedCount: number; // tins that contributed a taste coord
}

/** Average taste position of the user's mapped tins, or null if none map
 *  to a catalog entry with published coords. */
export function palateCentroid(tins: readonly Tin[]): PalateCentroid | null {
	const coords: { x: number; y: number }[] = [];
	for (const t of tins) {
		if (!t.catalogId) continue;
		const entry = getCatalogEntry(t.catalogId);
		if (entry && hasTaste(entry)) coords.push(entry.taste);
	}
	if (coords.length === 0) return null;
	const n = coords.length;
	return {
		x: coords.reduce((a, c) => a + c.x, 0) / n,
		y: coords.reduce((a, c) => a + c.y, 0) / n,
		mappedCount: n
	};
}

/** Human one-liner from a centroid: "mild + full-body", "balanced", etc.
 *  Threshold ±0.33 splits each axis into three bands. */
export function palatePhrase(c: PalateCentroid): string {
	const T = 0.33;
	const horiz = c.x > T ? 'mild' : c.x < -T ? 'sharp' : null;
	const vert = c.y > T ? 'full-body' : c.y < -T ? 'refreshing' : null;
	if (horiz && vert) return `${horiz} + ${vert}`;
	if (horiz) return horiz;
	if (vert) return vert;
	return 'balanced';
}
