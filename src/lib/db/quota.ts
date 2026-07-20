/** Storage-quota detection.
 *
 *  Its own module so it can be unit-tested: importing it from backup.ts would
 *  drag in repository → sync → auth, whose module-level runes can't evaluate
 *  outside a Svelte context.
 */

/** True when `err` is a storage-quota failure, whatever wrapped it.
 *
 *  Matches on `name`, NOT `instanceof DOMException`. Dexie installs a global
 *  rejectionMapper that rewraps the native QuotaExceededError as a DexieError —
 *  it keeps the name but is no longer a DOMException, so an instanceof check
 *  never fired for anything thrown by db.*.put(). That made a full disk look
 *  like a corrupt backup file ("Skipped 87 invalid"), pointing the user at the
 *  wrong culprit — the one distinction this function exists to make.
 */
export function isQuota(err: unknown): boolean {
	if (typeof err !== 'object' || err === null) return false;
	const name = (err as { name?: unknown }).name;
	return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}
