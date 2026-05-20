// Derived helpers for tins. Computed at read time, never stored.

import type { PersonalSession, Tin } from '$lib/db/types';

/**
 * Remaining grams in a tin, given all personal sessions made from it.
 * Clamps at zero so an over-drunk tin doesn't go negative on the rail.
 */
export function tinRemaining(tin: Tin, sessions: PersonalSession[]): number {
	const used = sessions
		.filter((s) => s.tinId === tin.id)
		.reduce((acc, s) => acc + (s.powderGrams || 0), 0);
	return Math.max(0, tin.weightGrams - used);
}

/**
 * Days since the tin was opened (null if unopened) + estimate of bowls left.
 * Bowls-left averages historical powder usage for THIS tin; null when nothing
 * has been brewed from it yet so we don't show a misleading number.
 */
export function tinFreshness(
	tin: Tin,
	sessions: PersonalSession[]
): { days: number | null; bowlsLeft: number | null } {
	const days = tin.openedAt
		? Math.floor((Date.now() - new Date(tin.openedAt).getTime()) / (1000 * 60 * 60 * 24))
		: null;

	const remaining = tinRemaining(tin, sessions);
	const tinSessions = sessions.filter((s) => s.tinId === tin.id);
	const avgPerSession =
		tinSessions.length > 0
			? tinSessions.reduce((acc, s) => acc + (s.powderGrams || 0), 0) / tinSessions.length
			: null;
	const bowlsLeft = avgPerSession ? Math.round(remaining / avgPerSession) : null;

	return { days, bowlsLeft };
}
