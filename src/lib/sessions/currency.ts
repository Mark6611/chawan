// Sticky currency code for cafe sessions. Defaults to USD.
// Per-device preference, not synced — same shape as defaults.ts.
// When Session 9 ships Settings, "default currency" can move into the
// UserDefaults schema; for now, a small dedicated module keeps the
// cafe form self-contained.

const KEY = 'chawan:currency';
const FALLBACK: Currency = 'USD';

export const SUPPORTED_CURRENCIES = ['USD', 'JPY', 'EUR', 'GBP', 'AUD', 'CAD', 'THB'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface CurrencyInfo {
	code: Currency;
	symbol: string;
	decimals: number; // 0 for JPY (whole-yen prices), 2 for everything else
}

export const CURRENCIES: CurrencyInfo[] = [
	{ code: 'USD', symbol: '$', decimals: 2 },
	{ code: 'JPY', symbol: '¥', decimals: 0 },
	{ code: 'EUR', symbol: '€', decimals: 2 },
	{ code: 'GBP', symbol: '£', decimals: 2 },
	{ code: 'AUD', symbol: 'A$', decimals: 2 },
	{ code: 'CAD', symbol: 'C$', decimals: 2 },
	{ code: 'THB', symbol: '฿', decimals: 2 }
];

export function isCurrency(s: string): s is Currency {
	return (SUPPORTED_CURRENCIES as readonly string[]).includes(s);
}

export function readCurrency(): Currency {
	if (typeof localStorage === 'undefined') return FALLBACK;
	const saved = localStorage.getItem(KEY);
	if (saved && isCurrency(saved)) return saved;
	return FALLBACK;
}

export function writeCurrency(code: string): void {
	if (typeof localStorage === 'undefined') return;
	if (!isCurrency(code)) return; // silently ignore garbage
	try {
		localStorage.setItem(KEY, code);
	} catch {
		// localStorage may be full or disabled — silently no-op.
	}
}

export function getCurrency(code: string): CurrencyInfo {
	return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** Format integer cents as a human currency string ("$7.50", "¥600"). */
export function formatPrice(cents: number, code: string): string {
	const info = getCurrency(code);
	const value = info.decimals === 0 ? Math.round(cents / 100) : cents / 100;
	return `${info.symbol}${value.toFixed(info.decimals)}`;
}

/** Parse a user-typed string like "7.50" or "750" into integer cents.
 *  Respects the currency's decimal count — JPY parses "600" as 60000 cents. */
export function parsePrice(text: string, code: string): number {
	const info = getCurrency(code);
	const trimmed = text.trim();
	if (!trimmed) return 0;
	const n = Number.parseFloat(trimmed);
	if (Number.isNaN(n) || n < 0) return 0;
	return Math.round(n * 100);
}
