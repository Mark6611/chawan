import { describe, expect, it } from 'vitest';
import {
	averageBrew,
	averageRating,
	bowlsInWindow,
	busiestDayOfWeek,
	cafeSpendByCurrency,
	lifetimeBowls,
	mostUsedTin,
	mostVisitedCafe,
	ownedCatalogIds,
	palateCentroid,
	palatePhrase,
	ratedCount,
	styleSplit,
	totalGramsConsumed,
	whiskPreference
} from './compute';
import type { CafeSession, PersonalSession, Session, Tin } from '$lib/db/types';

function p(over: Partial<PersonalSession> = {}): PersonalSession {
	return {
		id: crypto.randomUUID(),
		kind: 'personal',
		brewedAt: '2026-05-20T07:00:00.000Z',
		style: 'usucha',
		tinId: 't1',
		powderGrams: 2,
		waterGrams: 60,
		waterTempC: 76,
		whisk: 'chasen-100',
		createdAt: '2026-05-20T07:00:00.000Z',
		updatedAt: '2026-05-20T07:00:00.000Z',
		...over
	};
}

function c(over: Partial<CafeSession> = {}): CafeSession {
	return {
		id: crypto.randomUUID(),
		kind: 'cafe',
		brewedAt: '2026-05-20T15:00:00.000Z',
		style: 'latte',
		cafeName: 'Stonemill',
		region: 'uji',
		createdAt: '2026-05-20T15:00:00.000Z',
		updatedAt: '2026-05-20T15:00:00.000Z',
		...over
	};
}

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

describe('consumption rhythm', () => {
	it('lifetimeBowls counts every session', () => {
		expect(lifetimeBowls([p(), c(), p()])).toBe(3);
		expect(lifetimeBowls([])).toBe(0);
	});

	it('bowlsInWindow counts within the rolling window', () => {
		const now = new Date('2026-05-20T12:00:00.000Z');
		const sessions: Session[] = [
			p({ brewedAt: '2026-05-20T07:00:00.000Z' }),
			p({ brewedAt: '2026-05-14T07:00:00.000Z' }),
			p({ brewedAt: '2026-05-01T07:00:00.000Z' })
		];
		expect(bowlsInWindow(sessions, 7, now)).toBe(2);
		expect(bowlsInWindow(sessions, 30, now)).toBe(3);
	});

	it('totalGramsConsumed sums personal powder only, ignoring cafe', () => {
		expect(totalGramsConsumed([p({ powderGrams: 2 }), p({ powderGrams: 2.5 }), c()])).toBe(4.5);
	});

	it('busiestDayOfWeek returns the modal day, null when empty', () => {
		// 2026-05-18 is a Monday, 2026-05-25 a Monday too.
		const monday1 = p({ brewedAt: '2026-05-18T07:00:00.000Z' });
		const monday2 = p({ brewedAt: '2026-05-25T07:00:00.000Z' });
		const friday = p({ brewedAt: '2026-05-22T07:00:00.000Z' });
		expect(busiestDayOfWeek([monday1, monday2, friday])).toBe('Monday');
		expect(busiestDayOfWeek([])).toBeNull();
	});
});

describe('style + brew habits', () => {
	it('styleSplit tallies all three styles', () => {
		expect(styleSplit([p({ style: 'usucha' }), p({ style: 'koicha' }), c({ style: 'latte' })])).toEqual(
			{ usucha: 1, koicha: 1, latte: 1 }
		);
	});

	it('averageBrew averages personal params, null when no personal', () => {
		const avg = averageBrew([p({ powderGrams: 2, waterGrams: 60, waterTempC: 76 }), p({ powderGrams: 4, waterGrams: 80, waterTempC: 80 })]);
		expect(avg).toEqual({ powderGrams: 3, waterGrams: 70, waterTempC: 78 });
		expect(averageBrew([c()])).toBeNull();
	});

	it('whiskPreference returns the modal whisk, null when none set', () => {
		expect(
			whiskPreference([p({ whisk: 'chasen-100' }), p({ whisk: 'chasen-100' }), p({ whisk: 'electric' })])
		).toBe('chasen-100');
		expect(whiskPreference([c()])).toBeNull();
	});
});

describe('ratings', () => {
	it('averageRating ignores unrated (0 / undefined)', () => {
		expect(averageRating([p({ rating: 4 }), p({ rating: 5 }), p({ rating: 0 }), p()])).toBe(4.5);
		expect(averageRating([p()])).toBeNull();
	});

	it('ratedCount counts rating > 0', () => {
		expect(ratedCount([p({ rating: 4 }), p({ rating: 0 }), p()])).toBe(1);
	});
});

describe('tins', () => {
	it('mostUsedTin picks the tin with most personal sessions', () => {
		const tins = [tin({ id: 't1', name: 'Eiju' }), tin({ id: 't2', name: 'Wako' })];
		const sessions = [p({ tinId: 't1' }), p({ tinId: 't1' }), p({ tinId: 't2' })];
		const result = mostUsedTin(sessions, tins);
		expect(result?.tin.id).toBe('t1');
		expect(result?.count).toBe(2);
	});

	it('mostUsedTin returns null when no tins or no usage', () => {
		expect(mostUsedTin([p()], [])).toBeNull();
		expect(mostUsedTin([c()], [tin()])).toBeNull();
	});
});

describe('cafe spend', () => {
	it('groups spend by currency, never mixing', () => {
		const sessions = [
			c({ priceCents: 750, priceCurrency: 'USD' }),
			c({ priceCents: 500, priceCurrency: 'USD' }),
			c({ priceCents: 60000, priceCurrency: 'JPY' })
		];
		expect(cafeSpendByCurrency(sessions)).toEqual({ USD: 1250, JPY: 60000 });
	});

	it('ignores cafe sessions without a price', () => {
		expect(cafeSpendByCurrency([c(), c({ priceCents: 500, priceCurrency: 'USD' })])).toEqual({
			USD: 500
		});
	});

	it('mostVisitedCafe returns the modal cafe, null when none', () => {
		expect(
			mostVisitedCafe([c({ cafeName: 'Stonemill' }), c({ cafeName: 'Stonemill' }), c({ cafeName: 'Cha Cha' })])
				?.name
		).toBe('Stonemill');
		expect(mostVisitedCafe([p()])).toBeNull();
	});
});

describe('catalog coverage + palate', () => {
	it('ownedCatalogIds dedupes catalogId across tins', () => {
		const tins = [
			tin({ id: 't1', catalogId: 'mk-eiju' }),
			tin({ id: 't2', catalogId: 'mk-eiju' }),
			tin({ id: 't3', catalogId: 'mk-wako' }),
			tin({ id: 't4' }) // no catalogId
		];
		expect(ownedCatalogIds(tins).sort()).toEqual(['mk-eiju', 'mk-wako']);
	});

	it('palateCentroid averages mapped tins, null when none map', () => {
		// mk-eiju taste { x: 0.55, y: 0.55 }, mk-tenju { x: 0.85, y: 0.7 }
		const tins = [tin({ id: 't1', catalogId: 'mk-eiju' }), tin({ id: 't2', catalogId: 'mk-tenju' })];
		const centroid = palateCentroid(tins);
		expect(centroid?.mappedCount).toBe(2);
		expect(centroid?.x).toBeCloseTo(0.7, 5);
		expect(centroid?.y).toBeCloseTo(0.625, 5);
		expect(palateCentroid([tin({ id: 't9' })])).toBeNull();
	});

	it('palatePhrase bands each axis at ±0.33', () => {
		expect(palatePhrase({ x: 0.6, y: 0.6, mappedCount: 1 })).toBe('mild + full-body');
		expect(palatePhrase({ x: -0.6, y: -0.6, mappedCount: 1 })).toBe('sharp + refreshing');
		expect(palatePhrase({ x: 0.1, y: 0.1, mappedCount: 1 })).toBe('balanced');
		expect(palatePhrase({ x: 0.6, y: 0.1, mappedCount: 1 })).toBe('mild');
		expect(palatePhrase({ x: 0.1, y: -0.6, mappedCount: 1 })).toBe('refreshing');
	});
});
