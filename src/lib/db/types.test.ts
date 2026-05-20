import { describe, expect, it } from 'vitest';
import {
	CafeSessionSchema,
	isCafe,
	isPersonal,
	PersonalSessionSchema,
	SessionSchema,
	TinSchema,
	UserDefaultsSchema,
	type CafeSession,
	type PersonalSession,
	type Session,
	type Tin
} from './types';

// Minimal fixture builders so tests stay readable.
const validTin: Tin = {
	id: 't1',
	name: 'Eiju',
	maker: 'Marukyu Kōyamaen',
	grade: 'ceremonial',
	region: 'uji',
	cultivar: 'Asahi',
	weightGrams: 30,
	archived: false,
	createdAt: '2026-05-01T00:00:00.000Z',
	updatedAt: '2026-05-01T00:00:00.000Z'
};

const validPersonal: PersonalSession = {
	id: 's1',
	kind: 'personal',
	brewedAt: '2026-05-10T07:55:00.000Z',
	style: 'usucha',
	tinId: 't1',
	powderGrams: 2,
	waterGrams: 60,
	waterTempC: 76,
	whisk: 'chasen-100',
	createdAt: '2026-05-10T07:55:00.000Z',
	updatedAt: '2026-05-10T07:55:00.000Z'
};

const validCafe: CafeSession = {
	id: 's2',
	kind: 'cafe',
	brewedAt: '2026-05-11T14:00:00.000Z',
	style: 'latte',
	milk: 'oat',
	cafeName: 'Stonemill',
	maker: 'Marukyu Kōyamaen',
	region: 'uji',
	priceCents: 750,
	priceCurrency: 'USD',
	createdAt: '2026-05-11T14:00:00.000Z',
	updatedAt: '2026-05-11T14:00:00.000Z'
};

describe('TinSchema', () => {
	it('parses a valid tin', () => {
		expect(TinSchema.parse(validTin)).toEqual(validTin);
	});

	it('rejects empty name', () => {
		expect(() => TinSchema.parse({ ...validTin, name: '' })).toThrow();
	});

	it('rejects non-positive weightGrams', () => {
		expect(() => TinSchema.parse({ ...validTin, weightGrams: 0 })).toThrow();
		expect(() => TinSchema.parse({ ...validTin, weightGrams: -5 })).toThrow();
	});

	it('rejects unknown region', () => {
		expect(() => TinSchema.parse({ ...validTin, region: 'kyoto' })).toThrow();
	});

	it('accepts a tin without cultivar or harvestDate', () => {
		const { cultivar: _c, harvestDate: _h, ...minimal } = validTin;
		void _c;
		void _h;
		expect(TinSchema.parse(minimal)).toMatchObject({ id: 't1' });
	});
});

describe('Session schemas', () => {
	it('PersonalSessionSchema parses a valid personal session', () => {
		expect(PersonalSessionSchema.parse(validPersonal)).toEqual(validPersonal);
	});

	it('CafeSessionSchema parses a valid cafe session', () => {
		expect(CafeSessionSchema.parse(validCafe)).toEqual(validCafe);
	});

	it('CafeSessionSchema accepts a cafe session without maker', () => {
		const { maker: _m, ...withoutMaker } = validCafe;
		void _m;
		expect(CafeSessionSchema.parse(withoutMaker)).toMatchObject({ cafeName: 'Stonemill' });
	});

	it('rejects personal session without tinId', () => {
		const { tinId: _t, ...broken } = validPersonal;
		void _t;
		expect(() => PersonalSessionSchema.parse(broken)).toThrow();
	});

	it('rejects non-positive powderGrams', () => {
		expect(() => PersonalSessionSchema.parse({ ...validPersonal, powderGrams: 0 })).toThrow();
	});

	it('rejects waterTempC out of range', () => {
		expect(() => PersonalSessionSchema.parse({ ...validPersonal, waterTempC: 200 })).toThrow();
		expect(() => PersonalSessionSchema.parse({ ...validPersonal, waterTempC: -1 })).toThrow();
	});

	it('rejects bad currency code length', () => {
		expect(() => CafeSessionSchema.parse({ ...validCafe, priceCurrency: 'JP' })).toThrow();
	});

	it('SessionSchema discriminates on `kind`', () => {
		const personal: Session = SessionSchema.parse(validPersonal);
		const cafe: Session = SessionSchema.parse(validCafe);
		expect(personal.kind).toBe('personal');
		expect(cafe.kind).toBe('cafe');
	});

	it('SessionSchema rejects unknown kind', () => {
		expect(() => SessionSchema.parse({ ...validPersonal, kind: 'mystery' })).toThrow();
	});
});

describe('type guards', () => {
	it('isPersonal narrows correctly', () => {
		expect(isPersonal(validPersonal)).toBe(true);
		expect(isPersonal(validCafe)).toBe(false);
		if (isPersonal(validPersonal)) {
			// Compile-time proof: `tinId` is accessible only after narrowing.
			expect(validPersonal.tinId).toBe('t1');
		}
	});

	it('isCafe narrows correctly', () => {
		expect(isCafe(validCafe)).toBe(true);
		expect(isCafe(validPersonal)).toBe(false);
		if (isCafe(validCafe)) {
			expect(validCafe.cafeName).toBe('Stonemill');
			expect(validCafe.maker).toBe('Marukyu Kōyamaen');
		}
	});
});

describe('UserDefaultsSchema', () => {
	it('parses defaults with required fields only', () => {
		expect(
			UserDefaultsSchema.parse({ style: 'usucha', waterTempC: 76, whisk: 'chasen-100' })
		).toMatchObject({ style: 'usucha' });
	});

	it('rejects unknown whisk', () => {
		expect(() =>
			UserDefaultsSchema.parse({ style: 'usucha', waterTempC: 76, whisk: 'bamboo-stick' })
		).toThrow();
	});
});
