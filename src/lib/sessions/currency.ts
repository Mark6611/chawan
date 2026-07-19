// Sticky currency code for cafe sessions + tins. Defaults to THB.
// Per-device preference, not synced. The picker remembers the last
// currency used (writeCurrency on save), so a THB-first user never
// re-picks; the fallback only applies on a fresh device.

const KEY = 'chawan:currency';
const FALLBACK: Currency = 'THB';

// THB first — the default currency leads the picker.
export const SUPPORTED_CURRENCIES = ['THB', 'USD', 'JPY', 'EUR', 'GBP', 'AUD', 'CAD'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface CurrencyInfo {
	code: Currency;
	symbol: string;
	decimals: number; // 0 for JPY (whole-yen prices), 2 for everything else
}

export const CURRENCIES: CurrencyInfo[] = [
	{ code: 'THB', symbol: '฿', decimals: 2 },
	{ code: 'USD', symbol: '$', decimals: 2 },
	{ code: 'JPY', symbol: '¥', decimals: 0 },
	{ code: 'EUR', symbol: '€', decimals: 2 },
	{ code: 'GBP', symbol: '£', decimals: 2 },
	{ code: 'AUD', symbol: 'A$', decimals: 2 },
	{ code: 'CAD', symbol: 'C$', decimals: 2 }
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

/** Parse a user-typed string like "7.50" or "600" into integer cents.
 *  Currency-agnostic on purpose: "600" is always 60000 cents; the DISPLAY
 *  layer (formatPrice) handles JPY's zero-decimal rendering. The `_code`
 *  param is kept so call sites read naturally and the signature can grow
 *  currency-aware later without churn. */
export function parsePrice(text: string, _code: string): number {
	// Strip thousands separators before parsing: parseFloat("1,200") stops at
	// the comma and yields 1, silently saving ฿1 for a ฿1,200 tea. Our display
	// layer never emits grouping separators and inputs are dot-decimal, so a
	// comma here is always a thousands separator — safe to remove.
	const trimmed = text.trim().replace(/,/g, '');
	if (!trimmed) return 0;
	const n = Number.parseFloat(trimmed);
	if (Number.isNaN(n) || n < 0) return 0;
	return Math.round(n * 100);
}
