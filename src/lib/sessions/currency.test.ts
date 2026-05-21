import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	CURRENCIES,
	formatPrice,
	getCurrency,
	isCurrency,
	parsePrice,
	readCurrency,
	writeCurrency
} from './currency';

function stubLocalStorage() {
	const store = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
		setItem: (k: string, v: string) => {
			store.set(k, v);
		},
		removeItem: (k: string) => {
			store.delete(k);
		},
		clear: () => store.clear()
	});
}

describe('isCurrency', () => {
	it('accepts supported codes', () => {
		expect(isCurrency('USD')).toBe(true);
		expect(isCurrency('JPY')).toBe(true);
		expect(isCurrency('THB')).toBe(true);
	});

	it('rejects unsupported codes', () => {
		expect(isCurrency('MXN')).toBe(false);
		expect(isCurrency('')).toBe(false);
		expect(isCurrency('usd')).toBe(false); // case-sensitive
	});
});

describe('readCurrency / writeCurrency', () => {
	beforeEach(stubLocalStorage);
	afterEach(() => vi.unstubAllGlobals());

	it('reads USD when nothing has been saved', () => {
		expect(readCurrency()).toBe('USD');
	});

	it('persists a supported code and reads it back', () => {
		writeCurrency('JPY');
		expect(readCurrency()).toBe('JPY');
	});

	it('falls back to USD when stored code is unsupported', () => {
		localStorage.setItem('chawan:currency', 'MXN');
		expect(readCurrency()).toBe('USD');
	});

	it('writeCurrency silently ignores unsupported codes', () => {
		writeCurrency('MXN');
		expect(localStorage.getItem('chawan:currency')).toBeNull();
	});
});

describe('getCurrency', () => {
	it('returns the expected info for each supported code', () => {
		for (const c of CURRENCIES) {
			expect(getCurrency(c.code)).toEqual(c);
		}
	});

	it('falls back to USD info on unknown code', () => {
		expect(getCurrency('MXN').code).toBe('USD');
	});
});

describe('formatPrice', () => {
	it('formats USD with 2 decimals', () => {
		expect(formatPrice(750, 'USD')).toBe('$7.50');
		expect(formatPrice(1000, 'USD')).toBe('$10.00');
	});

	it('formats JPY with 0 decimals (whole-yen)', () => {
		expect(formatPrice(60000, 'JPY')).toBe('¥600');
	});

	it('formats GBP and EUR with their symbols', () => {
		expect(formatPrice(450, 'GBP')).toBe('£4.50');
		expect(formatPrice(395, 'EUR')).toBe('€3.95');
	});

	it('formats THB with the baht symbol', () => {
		expect(formatPrice(15000, 'THB')).toBe('฿150.00');
	});
});

describe('parsePrice', () => {
	it('parses "7.50" as 750 cents', () => {
		expect(parsePrice('7.50', 'USD')).toBe(750);
	});

	it('parses "600" as 60000 cents (universal — display layer handles JPY rounding)', () => {
		expect(parsePrice('600', 'JPY')).toBe(60000);
	});

	it('returns 0 for empty or invalid input', () => {
		expect(parsePrice('', 'USD')).toBe(0);
		expect(parsePrice('abc', 'USD')).toBe(0);
		expect(parsePrice('   ', 'USD')).toBe(0);
	});

	it('returns 0 for negative numbers', () => {
		expect(parsePrice('-1', 'USD')).toBe(0);
	});

	it('rounds to integer cents (no fractional storage)', () => {
		expect(parsePrice('7.501', 'USD')).toBe(750);
		expect(parsePrice('7.509', 'USD')).toBe(751);
	});
});
