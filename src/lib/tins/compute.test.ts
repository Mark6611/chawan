import { describe, expect, it } from 'vitest';
import { tinFreshness, tinRemaining } from './compute';
import type { PersonalSession, Tin } from '$lib/db/types';

function tin(over: Partial<Tin> = {}): Tin {
	return {
		id: 't1',
		name: 'Eiju',
		maker: 'Marukyu Kōyamaen',
		grade: 'ceremonial',
		region: 'uji',
		weightGrams: 30,
		archived: false,
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
		...over
	};
}

function ps(over: Partial<PersonalSession> = {}): PersonalSession {
	return {
		id: 's',
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

describe('tinRemaining', () => {
	it('returns full weight when there are no sessions', () => {
		expect(tinRemaining(tin(), [])).toBe(30);
	});

	it('subtracts the powder used across this tin\'s sessions', () => {
		expect(tinRemaining(tin(), [ps({ powderGrams: 2 }), ps({ powderGrams: 2.5 })])).toBe(25.5);
	});

	it('ignores sessions made from other tins', () => {
		expect(
			tinRemaining(tin({ id: 't1' }), [
				ps({ powderGrams: 2, tinId: 't1' }),
				ps({ powderGrams: 5, tinId: 't2' })
			])
		).toBe(28);
	});

	it('clamps at zero when used > weight', () => {
		expect(tinRemaining(tin({ weightGrams: 5 }), [ps({ powderGrams: 7 })])).toBe(0);
	});
});

describe('tinFreshness', () => {
	it('returns days=null for an unopened tin', () => {
		const { days } = tinFreshness(tin(), []);
		expect(days).toBeNull();
	});

	it('reports days since openedAt', () => {
		const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
		const { days } = tinFreshness(tin({ openedAt: tenDaysAgo }), []);
		expect(days).toBe(10);
	});

	it('returns bowlsLeft=null when no sessions have been made from the tin', () => {
		const { bowlsLeft } = tinFreshness(tin({ openedAt: '2026-05-01T00:00:00.000Z' }), []);
		expect(bowlsLeft).toBeNull();
	});

	it('estimates bowlsLeft from average historical powder use', () => {
		// 30g tin. Two sessions used 2g each → 4g used, 26g remaining, avg 2g per bowl → 13 bowls left.
		const sessions = [ps({ powderGrams: 2 }), ps({ powderGrams: 2 })];
		const { bowlsLeft } = tinFreshness(tin({ openedAt: '2026-05-01T00:00:00.000Z' }), sessions);
		expect(bowlsLeft).toBe(13);
	});
});
