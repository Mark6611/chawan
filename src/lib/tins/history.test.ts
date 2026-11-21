import { describe, expect, it } from 'vitest';
import { recentBowls, whatWorked } from './history';
import type { PersonalSession } from '$lib/db/types';

let n = 0;
function bowl(over: Partial<PersonalSession>): PersonalSession {
	n++;
	return {
		id: `s${String(n).padStart(3, '0')}`,
		kind: 'personal',
		brewedAt: `2026-05-${String((n % 27) + 1).padStart(2, '0')}T08:00:00.000Z`,
		style: 'usucha',
		tinId: 't1',
		powderGrams: 2,
		waterGrams: 60,
		waterTempC: 76,
		createdAt: '2026-05-01T08:00:00.000Z',
		updatedAt: '2026-05-01T08:00:00.000Z',
		...over
	};
}

describe('recentBowls', () => {
	it('returns only this tin, newest first, capped', () => {
		const all = [
			bowl({ brewedAt: '2026-05-01T08:00:00.000Z' }),
			bowl({ brewedAt: '2026-05-03T08:00:00.000Z' }),
			bowl({ brewedAt: '2026-05-02T08:00:00.000Z', tinId: 't2' }),
			bowl({ brewedAt: '2026-05-04T08:00:00.000Z' })
		];
		const r = recentBowls(all, 't1', 2);
		expect(r.map((s) => s.brewedAt.slice(8, 10))).toEqual(['04', '03']);
	});

	it('leaves out deleted bowls', () => {
		const all = [bowl({}), bowl({ deletedAt: '2026-05-05T08:00:00.000Z' })];
		expect(recentBowls(all, 't1')).toHaveLength(1);
	});

	it('orders two bowls from the same minute the same way every time', () => {
		const a = bowl({ id: 'aaa', brewedAt: '2026-05-01T08:00:00.000Z' });
		const b = bowl({ id: 'zzz', brewedAt: '2026-05-01T08:00:00.000Z' });
		expect(recentBowls([a, b], 't1').map((s) => s.id)).toEqual(['zzz', 'aaa']);
		expect(recentBowls([b, a], 't1').map((s) => s.id)).toEqual(['zzz', 'aaa']);
	});
});

describe('whatWorked', () => {
	it('averages the well-rated bowls of one style', () => {
		const all = [
			bowl({ rating: 5, waterTempC: 74, powderGrams: 2 }),
			bowl({ rating: 4, waterTempC: 78, powderGrams: 2.2 }),
			bowl({ rating: 2, waterTempC: 90, powderGrams: 3 })
		];
		expect(whatWorked(all, 't1', 'usucha')).toEqual({
			style: 'usucha',
			bowls: 2,
			powderGrams: 2.1,
			waterGrams: 60,
			waterTempC: 76
		});
	});

	it('says nothing from a single good bowl', () => {
		expect(whatWorked([bowl({ rating: 5 }), bowl({ rating: 3 })], 't1', 'usucha')).toBeNull();
	});

	// Averaging koicha into usucha would describe a bowl nobody makes.
	it('never mixes styles', () => {
		const all = [
			bowl({ rating: 5 }),
			bowl({ rating: 5 }),
			bowl({ rating: 5, style: 'koicha', powderGrams: 4, waterGrams: 40, waterTempC: 70 }),
			bowl({ rating: 5, style: 'koicha', powderGrams: 4, waterGrams: 40, waterTempC: 70 })
		];
		expect(whatWorked(all, 't1', 'usucha')?.waterGrams).toBe(60);
		expect(whatWorked(all, 't1', 'koicha')?.waterGrams).toBe(40);
	});

	it('ignores unrated bowls, other tins and deleted bowls', () => {
		const all = [
			bowl({ rating: 5 }),
			bowl({}),
			bowl({ rating: 5, tinId: 't2' }),
			bowl({ rating: 5, deletedAt: '2026-05-05T08:00:00.000Z' })
		];
		expect(whatWorked(all, 't1', 'usucha')).toBeNull();
	});
});
