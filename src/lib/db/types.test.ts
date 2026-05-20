import { describe, expect, it } from 'vitest';
import {
	isPersonal,
	isStore,
	PersonalSessionSchema,
	SessionSchema,
	StoreSessionSchema,
	TinSchema,
	UserDefaultsSchema,
	type PersonalSession,
	type Session,
	type StoreSession,
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

const validStore: StoreSession = {
	id: 's2',
	kind: 'store',
	brewedAt: '2026-05-11T14:00:00.000Z',
	style: 'latte',
	milk: 'oat',
	storeName: 'Stonemill',
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

	it('StoreSessionSchema parses a valid store session', () => {
		expect(StoreSessionSchema.parse(validStore)).toEqual(validStore);
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
		expect(() => StoreSessionSchema.parse({ ...validStore, priceCurrency: 'JP' })).toThrow();
	});

	it('SessionSchema discriminates on `kind`', () => {
		const personal: Session = SessionSchema.parse(validPersonal);
		const store: Session = SessionSchema.parse(validStore);
		expect(personal.kind).toBe('personal');
		expect(store.kind).toBe('store');
	});

	it('SessionSchema rejects unknown kind', () => {
		expect(() => SessionSchema.parse({ ...validPersonal, kind: 'mystery' })).toThrow();
	});
});

describe('type guards', () => {
	it('isPersonal narrows correctly', () => {
		expect(isPersonal(validPersonal)).toBe(true);
		expect(isPersonal(validStore)).toBe(false);
		if (isPersonal(validPersonal)) {
			// Compile-time proof: `tinId` is accessible only after narrowing.
			expect(validPersonal.tinId).toBe('t1');
		}
	});

	it('isStore narrows correctly', () => {
		expect(isStore(validStore)).toBe(true);
		expect(isStore(validPersonal)).toBe(false);
		if (isStore(validStore)) {
			expect(validStore.storeName).toBe('Stonemill');
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
