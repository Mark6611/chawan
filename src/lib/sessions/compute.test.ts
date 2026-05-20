import { describe, expect, it } from 'vitest';
import { bowlsThisWeek, formatRatio, formatTimeAgo } from './compute';
import type { PersonalSession, Session } from '$lib/db/types';

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

describe('bowlsThisWeek', () => {
	it('returns 0 for empty array', () => {
		expect(bowlsThisWeek([])).toBe(0);
	});

	it('counts sessions in the last 7 days, rolling', () => {
		const now = new Date('2026-05-20T12:00:00.000Z');
		const sessions: Session[] = [
			personal({ brewedAt: '2026-05-20T07:00:00.000Z' }), // today
			personal({ brewedAt: '2026-05-18T07:00:00.000Z' }), // 2 days ago
			personal({ brewedAt: '2026-05-14T07:00:00.000Z' }), // ~6 days ago
			personal({ brewedAt: '2026-05-10T07:00:00.000Z' }) // 10 days ago — out
		];
		expect(bowlsThisWeek(sessions, now)).toBe(3);
	});

	it('counts the boundary day correctly (exactly 7 days ago is in)', () => {
		const now = new Date('2026-05-20T12:00:00.000Z');
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
		expect(bowlsThisWeek([personal({ brewedAt: sevenDaysAgo })], now)).toBe(1);
	});
});

describe('formatTimeAgo', () => {
	const now = new Date('2026-05-20T12:00:00.000Z');

	it('shows "Just now" within 1 minute', () => {
		expect(formatTimeAgo(new Date(now.getTime() - 30_000).toISOString(), now)).toBe('Just now');
	});

	it('shows minutes within the hour', () => {
		expect(formatTimeAgo(new Date(now.getTime() - 15 * 60_000).toISOString(), now)).toBe('15m ago');
	});

	it('shows hours within the day', () => {
		expect(formatTimeAgo(new Date(now.getTime() - 14 * 60 * 60_000).toISOString(), now)).toBe(
			'14h ago'
		);
	});

	it('shows days under a month', () => {
		expect(
			formatTimeAgo(new Date(now.getTime() - 5 * 24 * 60 * 60_000).toISOString(), now)
		).toBe('5d ago');
	});

	it('shows months over 30 days', () => {
		expect(
			formatTimeAgo(new Date(now.getTime() - 65 * 24 * 60 * 60_000).toISOString(), now)
		).toBe('2mo ago');
	});
});
