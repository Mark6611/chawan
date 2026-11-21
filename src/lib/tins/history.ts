// What a tin's past bowls say about the next one. Read-time only, nothing stored.
//
// This is the pane beside the session form on an unfolded iPhone Duo and the
// History sheet everywhere else — the same job Brew Log's bag history and
// Buffy's exercise history do. Kept deliberately plain: the last few bowls as
// they were made, and the plain average of the ones rated well. A weighted,
// confidence-scored calibrator is planned separately (PROJECT_PLAN.md, phase 4).

import type { PersonalSession, Style } from '$lib/db/types';

/** A bowl counts as "worked" from this rating up. */
export const GOOD_RATING = 4;
/** Fewer good bowls than this and an average would be one bowl's accident. */
export const MIN_GOOD_BOWLS = 2;

/** The tin's most recent bowls, newest first. Ties break by id so the order is
 *  stable when two bowls share a minute. */
export function recentBowls(
	sessions: readonly PersonalSession[],
	tinId: string,
	limit = 5
): PersonalSession[] {
	return sessions
		.filter((s) => s.tinId === tinId && !s.deletedAt)
		.sort((a, b) => b.brewedAt.localeCompare(a.brewedAt) || b.id.localeCompare(a.id))
		.slice(0, limit);
}

export interface WhatWorked {
	style: Style;
	bowls: number;
	powderGrams: number;
	waterGrams: number;
	waterTempC: number;
}

/**
 * The average of this tin's well-rated bowls in one style, or null when there
 * are too few to mean anything.
 *
 * Scoped to a style on purpose: koicha at 4g and 40g of water must not be
 * averaged with usucha at 2g and 60g — the result would describe neither.
 */
export function whatWorked(
	sessions: readonly PersonalSession[],
	tinId: string,
	style: Style
): WhatWorked | null {
	const good = sessions.filter(
		(s) => s.tinId === tinId && !s.deletedAt && s.style === style && (s.rating ?? 0) >= GOOD_RATING
	);
	if (good.length < MIN_GOOD_BOWLS) return null;
	const mean = (f: (s: PersonalSession) => number) =>
		good.reduce((acc, s) => acc + f(s), 0) / good.length;
	return {
		style,
		bowls: good.length,
		powderGrams: Math.round(mean((s) => s.powderGrams) * 10) / 10,
		waterGrams: Math.round(mean((s) => s.waterGrams)),
		waterTempC: Math.round(mean((s) => s.waterTempC))
	};
}
