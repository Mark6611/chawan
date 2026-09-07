// Pure merge decision for backup restore.
//
// Its own module for the same reason as quota.ts: importing it from backup.ts
// pulls in repository → sync → auth, whose module-level runes can't evaluate
// outside a Svelte context, so a unit test can't reach it there.

/** Whether an incoming row should replace the existing one on restore.
 *
 *  Last-write-wins by `updatedAt`:
 *   - no existing timestamp → incoming wins (nothing to lose to);
 *   - no incoming timestamp → existing kept (an unstamped row can't outrank a
 *     stamped one — this is what stops a v1 backup's photos from clobbering
 *     newer local ones);
 *   - otherwise the newer timestamp wins, ties to incoming so re-running the
 *     same backup is idempotent.
 *
 *  Every timestamp in the app is a canonical `new Date().toISOString()`
 *  (fixed-width, UTC, ms precision), so a lexicographic compare is
 *  chronological. This is also the guard that stops a delete from being
 *  resurrected: a live row from an OLD backup has an older `updatedAt` than the
 *  local tombstone that replaced it, so it loses — PROVIDED the caller looks the
 *  existing row up WITHOUT filtering tombstones (getTinRaw / getSessionRaw).
 */
/** How far ahead of this device's clock an incoming timestamp may sit.
 *
 *  The merge is last-write-wins on a lexicographic ISO compare, so a row
 *  stamped "9999-01-01T00:00:00.000Z" outranks everything for ever: it can
 *  never be edited away, and re-restoring the same file re-applies it. Zod's
 *  .datetime() does not help — that string is perfectly valid ISO. A backup
 *  file is untrusted input, and real clock skew between two of your own
 *  devices is minutes, not years. */
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

/** Whether an incoming timestamp is impossibly far in the future. */
export function isImplausiblyFuture(ts: string | undefined, now = Date.now()): boolean {
	if (!ts) return false;
	const t = Date.parse(ts);
	return Number.isFinite(t) && t > now + MAX_CLOCK_SKEW_MS;
}

export function incomingWins(
	incoming: { updatedAt?: string },
	existing: { updatedAt?: string }
): boolean {
	if (!existing.updatedAt) return true;
	if (!incoming.updatedAt) return false;
	return incoming.updatedAt >= existing.updatedAt;
}
