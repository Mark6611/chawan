// Derived helpers for sessions. Computed at read time, never stored.

import type { PersonalSession } from '$lib/db/types';

/**
 * Water-to-powder ratio for a personal session, formatted "1:30" or "1:15".
 * Returns "—" when there's nothing to divide.
 *
 * Big values round to whole numbers (1:30); small values keep one decimal
 * so 1:4.5 doesn't masquerade as 1:5.
 */
export function formatRatio(s: PersonalSession): string {
	if (!s.powderGrams) return '—';
	const r = s.waterGrams / s.powderGrams;
	return `1:${r >= 10 ? Math.round(r) : r.toFixed(1)}`;
}
