// Derived helpers for sessions. Computed at read time, never stored.

import type { PersonalSession, Session } from '$lib/db/types';

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

/**
 * Count of sessions brewed in the last 7 days (rolling, not calendar week).
 * Used on Home as the "bowls this week" hero numeric.
 */
export function bowlsThisWeek(sessions: readonly Session[], now: Date = new Date()): number {
	const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
	return sessions.filter((s) => new Date(s.brewedAt).getTime() >= cutoff).length;
}

/**
 * Human-readable "how long ago" for a session's brewedAt.
 * Mirrors the design's "LAST · 14h ago" pattern.
 */
export function formatTimeAgo(iso: string, now: Date = new Date()): string {
	const ms = now.getTime() - new Date(iso).getTime();
	const minutes = Math.floor(ms / 60_000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}
