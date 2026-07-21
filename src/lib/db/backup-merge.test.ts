import { describe, expect, it } from 'vitest';
import { incomingWins } from './backup-merge';

// The restore merge is the app's only disaster path, and two of its defects
// were data-loss class (a delete resurrected, a newer photo clobbered). The
// decision itself lives here; the tombstone-aware LOOKUP that feeds it is the
// other half of each fix and is exercised by hand — this pins the arithmetic.
describe('incomingWins', () => {
	const T1 = '2026-06-01T00:00:00.000Z';
	const T2 = '2026-07-01T00:00:00.000Z';

	it('newer incoming replaces an older existing row', () => {
		expect(incomingWins({ updatedAt: T2 }, { updatedAt: T1 })).toBe(true);
	});

	it('older incoming loses to a newer existing row', () => {
		expect(incomingWins({ updatedAt: T1 }, { updatedAt: T2 })).toBe(false);
	});

	it('equal timestamps: incoming wins, so re-running a backup is idempotent', () => {
		expect(incomingWins({ updatedAt: T1 }, { updatedAt: T1 })).toBe(true);
	});

	it('existing has no timestamp: incoming wins', () => {
		expect(incomingWins({ updatedAt: T1 }, {})).toBe(true);
	});

	it('incoming has no timestamp: existing kept (a v1 photo cannot clobber)', () => {
		expect(incomingWins({}, { updatedAt: T1 })).toBe(false);
	});

	it('both missing: incoming wins', () => {
		expect(incomingWins({}, {})).toBe(true);
	});

	// Resurrection, expressed as timestamps: a LIVE row from an old backup must
	// lose to the NEWER tombstone that deleted it locally. (The other half of
	// the fix is that the caller looks the tombstone up via getTinRaw, so this
	// comparison actually runs instead of being skipped on a null existing.)
	it('a live row from an old backup loses to a newer local tombstone', () => {
		const localTombstone = { updatedAt: T2, deletedAt: T2 };
		const backupLive = { updatedAt: T1 };
		expect(incomingWins(backupLive, localTombstone)).toBe(false);
	});

	// The converse still merges: a delete recorded in the backup that is newer
	// than the local live row should win and propagate the deletion.
	it('a tombstone from a newer backup wins over an older local live row', () => {
		const backupTombstone = { updatedAt: T2, deletedAt: T2 };
		const localLive = { updatedAt: T1 };
		expect(incomingWins(backupTombstone, localLive)).toBe(true);
	});
});
