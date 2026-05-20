import { describe, expect, it } from 'vitest';
import { formatRatio } from './compute';
import type { PersonalSession } from '$lib/db/types';

function personal(over: Partial<PersonalSession>): PersonalSession {
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

describe('formatRatio', () => {
	it('rounds to integer when ratio >= 10 (1:30 for 2g/60g)', () => {
		expect(formatRatio(personal({ powderGrams: 2, waterGrams: 60 }))).toBe('1:30');
	});

	it('rounds to integer for 1:15 (2g/30g)', () => {
		expect(formatRatio(personal({ powderGrams: 2, waterGrams: 30 }))).toBe('1:15');
	});

	it('keeps one decimal when ratio < 10 (1:4.5 for 2g/9g koicha)', () => {
		expect(formatRatio(personal({ powderGrams: 2, waterGrams: 9 }))).toBe('1:4.5');
	});

	it('handles fractional powder (2.5g/25g → 1:10)', () => {
		expect(formatRatio(personal({ powderGrams: 2.5, waterGrams: 25 }))).toBe('1:10');
	});

	it('returns em-dash on zero powder (no division)', () => {
		expect(formatRatio(personal({ powderGrams: 0, waterGrams: 60 }))).toBe('—');
	});
});
