import { describe, expect, it } from 'vitest';
import {
	normalizeFromServer,
	parseSessionFromServer,
	parseTinFromServer
} from './sync-normalize';

const num = new Set(['amount', 'rating']);
const ts = new Set(['createdAt']);

describe('normalizeFromServer', () => {
	it('strips userId (Supabase-internal field)', () => {
		expect(normalizeFromServer({ userId: 'u1', id: 'x' }, num, ts)).toEqual({ id: 'x' });
	});

	it('drops nulls so optional fields stay undefined', () => {
		expect(normalizeFromServer({ id: 'x', name: null }, num, ts)).toEqual({ id: 'x' });
	});

	it('coerces numeric strings to numbers on numeric keys', () => {
		expect(normalizeFromServer({ amount: '12.50' }, num, ts)).toEqual({ amount: 12.5 });
		expect(normalizeFromServer({ rating: '4' }, num, ts)).toEqual({ rating: 4 });
	});

	it('leaves non-numeric strings on numeric keys untouched', () => {
		expect(normalizeFromServer({ amount: 'twelve' }, num, ts)).toEqual({ amount: 'twelve' });
	});

	it('does not coerce strings on non-numeric keys', () => {
		expect(normalizeFromServer({ id: '12.50' }, num, ts)).toEqual({ id: '12.50' });
	});

	it('normalizes timestamps with +00:00 offset to Z-suffix UTC', () => {
		const out = normalizeFromServer({ createdAt: '2026-05-21T14:32:00+00:00' }, num, ts);
		expect(out.createdAt).toBe('2026-05-21T14:32:00.000Z');
	});

	it('normalizes timestamps with non-UTC offset, shifting to UTC', () => {
		const out = normalizeFromServer({ createdAt: '2026-05-21T14:32:00-07:00' }, num, ts);
		expect(out.createdAt).toBe('2026-05-21T21:32:00.000Z');
	});

	it('leaves non-timestamp strings alone', () => {
		expect(normalizeFromServer({ name: 'Eiju' }, num, ts)).toEqual({ name: 'Eiju' });
	});

	it('passes booleans + numbers through unchanged', () => {
		expect(normalizeFromServer({ archived: true, count: 3 }, num, ts)).toEqual({
			archived: true,
			count: 3
		});
	});
});

describe('parseTinFromServer', () => {
	it('parses a valid tin row from PostgREST (weightGrams as string)', () => {
		const tin = parseTinFromServer({
			userId: 'u1',
			id: 't1',
			name: 'Eiju',
			maker: 'Marukyu Kōyamaen',
			grade: 'ceremonial',
			region: 'uji',
			weightGrams: '30', // string-from-Postgres
			archived: false,
			createdAt: '2026-05-01T00:00:00+00:00',
			updatedAt: '2026-05-01T00:00:00+00:00'
		});
		expect(tin).not.toBeNull();
		expect(tin?.weightGrams).toBe(30);
		expect(tin?.createdAt).toBe('2026-05-01T00:00:00.000Z');
	});

	it('returns null on schema violation', () => {
		const tin = parseTinFromServer({ id: '', name: '', grade: 'mystery' });
		expect(tin).toBeNull();
	});

	it('strips a null openedAt → undefined (unopened tin)', () => {
		const tin = parseTinFromServer({
			userId: 'u1',
			id: 't1',
			name: 'Eiju',
			maker: 'Marukyu Kōyamaen',
			grade: 'ceremonial',
			region: 'uji',
			weightGrams: '30',
			openedAt: null,
			archived: false,
			createdAt: '2026-05-01T00:00:00+00:00',
			updatedAt: '2026-05-01T00:00:00+00:00'
		});
		expect(tin?.openedAt).toBeUndefined();
	});
});

describe('parseSessionFromServer', () => {
	it('parses a personal session with numeric strings coerced', () => {
		const session = parseSessionFromServer({
			userId: 'u1',
			id: 's1',
			kind: 'personal',
			brewedAt: '2026-05-10T07:55:00+00:00',
			style: 'usucha',
			tinId: 't1',
			powderGrams: '2.0',
			waterGrams: '60',
			waterTempC: 76,
			createdAt: '2026-05-10T07:55:00+00:00',
			updatedAt: '2026-05-10T07:55:00+00:00'
		});
		expect(session?.kind).toBe('personal');
		if (session?.kind === 'personal') {
			expect(session.powderGrams).toBe(2);
			expect(session.waterGrams).toBe(60);
			expect(session.brewedAt).toBe('2026-05-10T07:55:00.000Z');
		}
	});

	it('parses a cafe session with priceCents coerced', () => {
		const session = parseSessionFromServer({
			userId: 'u1',
			id: 's2',
			kind: 'cafe',
			brewedAt: '2026-05-11T14:00:00+00:00',
			style: 'latte',
			milk: 'oat',
			cafeName: 'Stonemill',
			region: 'uji',
			priceCents: '750',
			priceCurrency: 'USD',
			createdAt: '2026-05-11T14:00:00+00:00',
			updatedAt: '2026-05-11T14:00:00+00:00'
		});
		expect(session?.kind).toBe('cafe');
		if (session?.kind === 'cafe') {
			expect(session.cafeName).toBe('Stonemill');
			expect(session.priceCents).toBe(750);
		}
	});

	it('preserves the deletedAt tombstone on roundtrip', () => {
		const session = parseSessionFromServer({
			userId: 'u1',
			id: 's3',
			kind: 'personal',
			brewedAt: '2026-05-10T07:55:00+00:00',
			style: 'usucha',
			tinId: 't1',
			powderGrams: '2.0',
			waterGrams: '60',
			waterTempC: 76,
			createdAt: '2026-05-10T07:55:00+00:00',
			updatedAt: '2026-05-10T10:00:00+00:00',
			deletedAt: '2026-05-10T10:00:00+00:00'
		});
		expect(session?.deletedAt).toBe('2026-05-10T10:00:00.000Z');
	});

	it('returns null on unknown kind', () => {
		const session = parseSessionFromServer({
			id: 's4',
			kind: 'mystery',
			brewedAt: '2026-05-10T07:55:00+00:00',
			style: 'usucha',
			createdAt: '2026-05-10T07:55:00+00:00',
			updatedAt: '2026-05-10T07:55:00+00:00'
		});
		expect(session).toBeNull();
	});
});
