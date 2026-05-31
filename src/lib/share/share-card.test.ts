import { describe, expect, it } from 'vitest';
import {
	buildCafeCard,
	buildPersonalCard,
	derivePalatePhrase,
	shareDate,
	shareFilename
} from './share-card';
import type { CafeSession, PersonalSession, Tin } from '$lib/db/types';

const tin: Tin = {
	id: 't1',
	name: 'Eiju',
	maker: 'Marukyu Kōyamaen',
	grade: 'ceremonial',
	region: 'uji',
	weightGrams: 30,
	archived: false,
	createdAt: '2026-05-01T00:00:00.000Z',
	updatedAt: '2026-05-01T00:00:00.000Z'
};

function personal(over: Partial<PersonalSession> = {}): PersonalSession {
	return {
		id: 's1',
		kind: 'personal',
		brewedAt: '2026-05-20T07:55:00.000Z',
		style: 'usucha',
		tinId: 't1',
		powderGrams: 2,
		waterGrams: 60,
		waterTempC: 76,
		createdAt: '2026-05-20T07:55:00.000Z',
		updatedAt: '2026-05-20T07:55:00.000Z',
		...over
	};
}

function cafe(over: Partial<CafeSession> = {}): CafeSession {
	return {
		id: 'c1',
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

describe('shareDate', () => {
	it('formats date only, no time', () => {
		expect(shareDate('2026-05-20T07:55:00.000Z')).toMatch(/^20 May 2026$/);
	});
});

describe('buildPersonalCard', () => {
	it('maps style to a title and tin to the sub', () => {
		const card = buildPersonalCard(personal({ style: 'koicha' }), tin);
		expect(card.kind).toBe('session-personal');
		expect(card.title).toBe('Koicha');
		expect(card.sub).toBe('Eiju · Marukyu Kōyamaen');
	});

	it('builds the 4-metric row with ratio as the accent', () => {
		const card = buildPersonalCard(personal({ powderGrams: 2, waterGrams: 60 }), tin);
		expect(card.metrics.map((m) => m.label)).toEqual(['Powder', 'Water', 'Temp', 'Ratio']);
		expect(card.metrics[0]).toMatchObject({ value: '2.0', unit: 'g' });
		expect(card.metrics[3]).toMatchObject({ value: '1:30', accent: true });
	});

	it('keeps one decimal on small ratios (koicha)', () => {
		const card = buildPersonalCard(personal({ powderGrams: 2, waterGrams: 9 }), tin);
		expect(card.metrics[3].value).toBe('1:4.5');
	});

	it('passes rating + notes through', () => {
		const card = buildPersonalCard(personal({ rating: 4, notes: 'Lovely' }), tin);
		expect(card.rating).toBe(4);
		expect(card.notes).toBe('Lovely');
	});
});

describe('buildCafeCard', () => {
	it('shows Style · Milk · Price (accent) for a priced latte', () => {
		const card = buildCafeCard(
			cafe({ style: 'latte', milk: 'oat', priceCents: 750, priceCurrency: 'USD' })
		);
		expect(card.metrics.map((m) => m.label)).toEqual(['Style', 'Milk', 'Price']);
		expect(card.metrics[1]).toMatchObject({ value: 'Oat' });
		expect(card.metrics[2]).toMatchObject({ value: '$7.50', accent: true });
	});

	it('swaps Region in when there is no price — never an empty Price', () => {
		const card = buildCafeCard(cafe({ style: 'usucha', priceCents: undefined }));
		const labels = card.metrics.map((m) => m.label);
		expect(labels).toContain('Region');
		expect(labels).not.toContain('Price');
	});

	it('omits Milk when not a latte', () => {
		const card = buildCafeCard(cafe({ style: 'usucha', priceCents: 500, priceCurrency: 'USD' }));
		expect(card.metrics.map((m) => m.label)).not.toContain('Milk');
		expect(card.title).toBe('Stonemill');
	});

	it('appends the maker to the sub when present', () => {
		const card = buildCafeCard(cafe({ maker: 'Ippodo' }));
		expect(card.sub).toBe('Uji · Ippodo');
	});
});

describe('shareFilename', () => {
	it('builds "{title} · {date}.png"', () => {
		expect(shareFilename('Usucha', '20 May 2026')).toBe('Usucha · 20 May 2026.png');
	});

	it('strips filesystem-unsafe characters', () => {
		expect(shareFilename('A/B:C*?', '20 May 2026')).toBe('ABC · 20 May 2026.png');
	});

	it('falls back to Chawan when the title sanitizes to empty', () => {
		expect(shareFilename('///', '20 May 2026')).toBe('20 May 2026.png');
	});
});

describe('derivePalatePhrase', () => {
	const at = (x: number, y: number) => ({ taste: { x, y } });

	it('combines both axes when both are decisive', () => {
		expect(derivePalatePhrase([at(0.6, 0.6)])).toBe('Mostly mild,\nand full-bodied.');
		expect(derivePalatePhrase([at(-0.6, -0.6)])).toBe('Mostly sharp,\nand refreshing.');
	});

	it('uses one clause when only one axis is decisive', () => {
		expect(derivePalatePhrase([at(0.6, 0.1)])).toBe('Mostly\nmild.');
		expect(derivePalatePhrase([at(0.1, -0.6)])).toBe('Mostly\nrefreshing.');
	});

	it('falls to the middle when near origin', () => {
		expect(derivePalatePhrase([at(0.1, 0.1)])).toBe('Right down\nthe middle.');
	});

	it('handles the empty set', () => {
		expect(derivePalatePhrase([])).toBe('A palate\nstill forming.');
	});
});
