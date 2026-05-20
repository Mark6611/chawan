// "Again?" — surface a one-tap repeat on Home when the last two personal
// sessions are near-identical. Phase-0 decision: ship in v1.
//
// Heuristic from docs/design-handoff/flow-review.md §"The usual" pattern:
//   - same tin
//   - same style
//   - powder within ±0.2g
//   - water temp within ±2°C
//
// We require TWO matching personal sessions (not just one) so the suggestion
// reads as "you do this regularly" rather than "you did this once five
// minutes ago" — the latter would feel pushy.
//
// Cafe sessions are ignored when scanning for matching pairs (they don't
// have brewing parameters).

import type { PersonalSession, Session } from '$lib/db/types';
import { isPersonal } from '$lib/db/types';

export interface UsualSuggestion {
	/** The session to repeat (copy of the most recent matching personal session). */
	session: PersonalSession;
	/** How long ago the suggested session was brewed, in hours. */
	hoursAgo: number;
}

const POWDER_TOLERANCE_G = 0.2;
const TEMP_TOLERANCE_C = 2;

export function detectUsual(
	sessions: readonly Session[],
	now: Date = new Date()
): UsualSuggestion | null {
	// Sessions arrive newest-first from the repo. Filter to personal-only.
	const personals = sessions.filter(isPersonal);
	if (personals.length < 2) return null;

	const [last, prev] = personals;

	const matches =
		prev.tinId === last.tinId &&
		prev.style === last.style &&
		Math.abs(prev.powderGrams - last.powderGrams) <= POWDER_TOLERANCE_G &&
		Math.abs(prev.waterTempC - last.waterTempC) <= TEMP_TOLERANCE_C;

	if (!matches) return null;

	const hoursAgo = (now.getTime() - new Date(last.brewedAt).getTime()) / (1000 * 60 * 60);
	return { session: last, hoursAgo };
}
