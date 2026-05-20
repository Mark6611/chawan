import { describe, expect, it } from 'vitest';
import { detectUsual } from './again';
import type { CafeSession, PersonalSession } from '$lib/db/types';

function p(over: Partial<PersonalSession> = {}): PersonalSession {
	return {
		id: crypto.randomUUID(),
		kind: 'personal',
		brewedAt: '2026-05-10T07:55:00.000Z',
		style: 'usucha',
		tinId: 't1',
		powderGrams: 2,
		waterGrams: 60,
		waterTempC: 76,
		createdAt: '2026-05-10T07:55:00.000Z',
		updatedAt: '2026-05-10T07:55:00.000Z',
		...over
	};
}

const cafe: CafeSession = {
	id: 'c1',
	kind: 'cafe',
	brewedAt: '2026-05-10T15:00:00.000Z',
	style: 'latte',
	cafeName: 'Stonemill',
	region: 'uji',
	createdAt: '2026-05-10T15:00:00.000Z',
	updatedAt: '2026-05-10T15:00:00.000Z'
};

describe('detectUsual', () => {
	it('returns null with no sessions', () => {
		expect(detectUsual([])).toBeNull();
	});

	it('returns null with only one personal session (need a pattern, not a one-off)', () => {
		expect(detectUsual([p()])).toBeNull();
	});

	it('returns null when only cafe sessions exist', () => {
		expect(detectUsual([cafe, cafe])).toBeNull();
	});

	it('returns null when the two last personals use different tins', () => {
		expect(detectUsual([p({ tinId: 't1' }), p({ tinId: 't2' })])).toBeNull();
	});

	it('returns null when style differs', () => {
		expect(detectUsual([p({ style: 'usucha' }), p({ style: 'koicha' })])).toBeNull();
	});

	it('returns null when powder differs beyond ±0.2g tolerance', () => {
		expect(detectUsual([p({ powderGrams: 2.0 }), p({ powderGrams: 2.5 })])).toBeNull();
	});

	it('accepts powder within ±0.2g tolerance', () => {
		const result = detectUsual([p({ powderGrams: 2.0 }), p({ powderGrams: 2.1 })]);
		expect(result).not.toBeNull();
		expect(result?.session.powderGrams).toBe(2.0);
	});

	it('returns null when temp differs beyond ±2°C tolerance', () => {
		expect(detectUsual([p({ waterTempC: 76 }), p({ waterTempC: 80 })])).toBeNull();
	});

	it('accepts temp within ±2°C tolerance', () => {
		expect(detectUsual([p({ waterTempC: 76 }), p({ waterTempC: 78 })])).not.toBeNull();
	});

	it('suggests the most recent personal session when the last two match', () => {
		const last = p({ id: 'last', brewedAt: '2026-05-20T07:00:00.000Z' });
		const prev = p({ id: 'prev', brewedAt: '2026-05-19T07:00:00.000Z' });
		const result = detectUsual([last, prev]);
		expect(result?.session.id).toBe('last');
	});

	it('ignores intervening cafe sessions when finding the last two personals', () => {
		const result = detectUsual([cafe, p(), p()]);
		expect(result).not.toBeNull();
	});

	it('reports hours since the suggested session was brewed', () => {
		const now = new Date('2026-05-20T07:00:00.000Z');
		const brewedAt = '2026-05-19T17:00:00.000Z'; // 14h earlier
		const result = detectUsual([p({ brewedAt }), p({ brewedAt: '2026-05-18T17:00:00.000Z' })], now);
		expect(result?.hoursAgo).toBeCloseTo(14, 0);
	});
});
