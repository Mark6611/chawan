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

/** Parse a user-typed price string into integer cents.
 *
 *  Handles BOTH decimal conventions, because the price field is
 *  `inputmode="decimal"` and iOS renders the DEVICE LOCALE's separator on that
 *  keypad — a comma-decimal locale (much of Europe / Latin America) offers a
 *  comma, not a dot. The old code blindly stripped commas as thousands
 *  separators, which turned "4,50" (€4.50) into 45000 cents (€450) — a
 *  plausible-looking 100× overcharge that never errors.
 *
 *  Working on the digits + `.` + `,` left after symbols/spaces are stripped:
 *   - Both separators present → the LAST one is the decimal point and the other
 *     is grouping, so "12,345.67" and "1.200,50" both come out right.
 *   - A dot is the decimal point unless it repeats (then it's grouping:
 *     "1.234.567"). This is the app's own format (formatPrice emits a dot), and
 *     it's why "7.501" must stay a decimal, not read as a thousands group.
 *   - A lone comma is grouping when it has exactly 3 trailing digits ("1,200")
 *     or repeats ("1,2,3"); otherwise it's the decimal point ("4,50", "1,2").
 *
 *  Currency-agnostic on cents: "600" is 60000 cents for every currency; the
 *  DISPLAY layer (formatPrice) handles JPY's zero-decimal rendering. `_code`
 *  stays unused but keeps call sites readable and leaves room for per-currency
 *  parsing later.
 */
export function parsePrice(text: string, _code: string): number {
	// Drop currency symbols, spaces and stray letters; keep digits, separators
	// and a sign. "฿1,200" → "1,200", "$4.50" → "4.50".
	const s = text.replace(/[^\d.,-]/g, '');
	if (!s) return 0;

	const lastDot = s.lastIndexOf('.');
	const lastComma = s.lastIndexOf(',');

	let decimalSep: '.' | ',' | null;
	if (lastDot !== -1 && lastComma !== -1) {
		decimalSep = lastComma > lastDot ? ',' : '.';
	} else if (lastComma !== -1) {
		const trailing = s.length - lastComma - 1;
		const repeats = s.indexOf(',') !== lastComma;
		decimalSep = repeats || trailing === 3 ? null : ',';
	} else if (lastDot !== -1) {
		const repeats = s.indexOf('.') !== lastDot;
		decimalSep = repeats ? null : '.';
	} else {
		decimalSep = null;
	}

	let normalized: string;
	if (decimalSep === null) {
		normalized = s.replace(/[.,]/g, ''); // every separator is grouping
	} else {
		const grouping = decimalSep === ',' ? '.' : ',';
		normalized = s.split(grouping).join('').replace(decimalSep, '.');
	}

	const n = Number.parseFloat(normalized);
	if (Number.isNaN(n) || n < 0) return 0;
	return Math.round(n * 100);
}
