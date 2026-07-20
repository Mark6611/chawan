import { describe, expect, it } from 'vitest';
import { Dexie } from 'dexie';
import { isQuota } from './quota';

// Regression coverage for the quota-detection bug: isQuota() originally gated
// on `err instanceof DOMException`, which is true for the error the BROWSER
// throws but false for the one the app actually receives. Dexie installs a
// global rejectionMapper that rewraps it as a DexieError, so nothing thrown by
// db.*.put() ever matched — a full disk was reported to the user as a corrupt
// backup file, which is the one distinction this function exists to make.
describe('isQuota', () => {
	it('matches the native DOMException the browser throws', () => {
		expect(isQuota(new DOMException('quota', 'QuotaExceededError'))).toBe(true);
	});

	it('matches the Firefox spelling', () => {
		expect(isQuota(new DOMException('quota', 'NS_ERROR_DOM_QUOTA_REACHED'))).toBe(true);
	});

	it('matches what Dexie actually hands us after remapping', () => {
		// rejectionMapper is internal to Dexie — real at runtime, absent from the
		// published types. Reaching for it deliberately: the whole point is to
		// assert against the error the app really receives, not a stand-in.
		const mapper = (Dexie.Promise as unknown as { rejectionMapper: (e: unknown) => unknown })
			.rejectionMapper;
		const mapped = mapper(new DOMException('quota', 'QuotaExceededError'));

		// Guard the premise: if a Dexie upgrade ever stops remapping, this
		// assertion fails loudly rather than the test passing for the wrong
		// reason.
		expect(mapped).not.toBeInstanceOf(DOMException);
		expect(isQuota(mapped)).toBe(true);
	});

	it('does not match unrelated failures', () => {
		expect(isQuota(new Error('network down'))).toBe(false);
		expect(isQuota(new DOMException('nope', 'DataCloneError'))).toBe(false);
		expect(isQuota(null)).toBe(false);
		expect(isQuota(undefined)).toBe(false);
		expect(isQuota('QuotaExceededError')).toBe(false);
	});
});
