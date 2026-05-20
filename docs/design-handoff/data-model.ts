// src/lib/db/types.ts
//
// Chawan data model. Mirrors the coffee app's conventions:
//   - ISO strings for dates (not Date objects)
//   - Derived values (ratio, remaining grams) computed at read time, not stored
//   - String-keyed enums so they survive schema migrations cleanly
//   - All access goes through src/lib/db/repository.ts — components never
//     import the Dexie instance directly. Phase 2 swaps Dexie → Supabase
//     behind the repo's interface.

// ─────────────────────────────────────────────────────────────
// Shared enums
// ─────────────────────────────────────────────────────────────

export type Region =
	| 'uji'
	| 'nishio'
	| 'yame'
	| 'kagoshima'
	| 'shizuoka'
	| 'other';

export const REGION_LABELS: Record<Region, string> = {
	uji: 'Uji',
	nishio: 'Nishio',
	yame: 'Yame',
	kagoshima: 'Kagoshima',
	shizuoka: 'Shizuoka',
	other: 'Other',
};

export type Grade = 'ceremonial' | 'premium' | 'culinary';

export const GRADE_LABELS: Record<Grade, string> = {
	ceremonial: 'Ceremonial',
	premium: 'Premium',
	culinary: 'Culinary',
};

export type Style = 'usucha' | 'koicha' | 'latte';

export const STYLE_LABELS: Record<Style, string> = {
	usucha: 'Usucha',
	koicha: 'Koicha',
	latte: 'Latte',
};

export type Milk = 'cow' | 'oat' | 'almond' | 'soy' | 'coconut' | 'other';

export const MILK_LABELS: Record<Milk, string> = {
	cow: 'Cow',
	oat: 'Oat',
	almond: 'Almond',
	soy: 'Soy',
	coconut: 'Coconut',
	other: 'Other',
};

export type Whisk = 'chasen-80' | 'chasen-100' | 'chasen-120' | 'electric';

export const WHISK_LABELS: Record<Whisk, string> = {
	'chasen-80': 'Chasen 80',
	'chasen-100': 'Chasen 100',
	'chasen-120': 'Chasen 120',
	electric: 'Electric',
};

// Cultivar is intentionally a free-form string with curated suggestions —
// matches the coffee app's grindSetting (string, not enum). Surface these
// as chips with an "Other" text-entry escape in the UI.
export const SUGGESTED_CULTIVARS = [
	'Yabukita',
	'Okumidori',
	'Samidori',
	'Asahi',
	'Gokō',
	'Uji-hikari',
] as const;

// ─────────────────────────────────────────────────────────────
// Tin
// ─────────────────────────────────────────────────────────────

export interface Tin {
	id: string;              // crypto.randomUUID()
	name: string;            // "Eiju"
	maker: string;           // "Marukyu Kōyamaen"
	grade: Grade;
	region: Region;
	cultivar?: string;       // free-form; SUGGESTED_CULTIVARS for chip set
	harvestDate?: string;    // ISO date string, day precision (YYYY-MM-DD)
	weightGrams: number;     // original weight (e.g. 30, 40)
	openedAt?: string;       // ISO timestamp; undefined = unopened
	archived: boolean;       // user-archived (kept for history, not in rotation)
	createdAt: string;       // ISO timestamp
	updatedAt: string;       // ISO timestamp
}

// ─────────────────────────────────────────────────────────────
// Session — two kinds, intermixed in the same chronological feed.
// ─────────────────────────────────────────────────────────────

interface SessionBase {
	id: string;
	brewedAt: string;        // ISO timestamp — defaults to "now", editable
	style: Style;
	milk?: Milk;             // REQUIRED if style === 'latte', undefined otherwise
	rating?: number;         // 0–5 integer; undefined = not yet rated
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface PersonalSession extends SessionBase {
	kind: 'personal';
	tinId: string;           // foreign key → Tin.id
	powderGrams: number;     // e.g. 2.0
	waterGrams: number;      // e.g. 60 (grams, not ml — single source of truth)
	waterTempC: number;      // 0–100 integer
	whisk?: Whisk;
}

export interface StoreSession extends SessionBase {
	kind: 'store';
	storeName: string;
	region: Region;
	priceCents?: number;     // store as integer cents to avoid floats
	priceCurrency?: string;  // ISO 4217, default 'USD'
}

export type Session = PersonalSession | StoreSession;

// ─────────────────────────────────────────────────────────────
// User defaults — applied when the personal form is opened.
// Surfaces in Settings as the "Defaults" section.
// ─────────────────────────────────────────────────────────────

export interface UserDefaults {
	style: Style;            // default style for a new personal session
	waterTempC: number;      // default water temp
	whisk: Whisk;            // default whisk
	powderGrams?: number;    // optional — last-used wins if undefined
	waterGrams?: number;     // optional — derived from style if undefined
}

export const DEFAULT_DEFAULTS: UserDefaults = {
	style: 'usucha',
	waterTempC: 76,
	whisk: 'chasen-100',
};

// ─────────────────────────────────────────────────────────────
// Type guards — narrow Session to its kind
// ─────────────────────────────────────────────────────────────

export const isPersonal = (s: Session): s is PersonalSession =>
	s.kind === 'personal';

export const isStore = (s: Session): s is StoreSession => s.kind === 'store';

// ─────────────────────────────────────────────────────────────
// Derived values (computed at read time, never stored)
// Move into src/lib/sessions/compute.ts and src/lib/tins/compute.ts.
// ─────────────────────────────────────────────────────────────

/** "1:30" — water-to-powder ratio for a personal session. */
export function formatRatio(s: PersonalSession): string {
	if (!s.powderGrams) return '—';
	const r = s.waterGrams / s.powderGrams;
	return `1:${r >= 10 ? Math.round(r) : r.toFixed(1)}`;
}

/** Remaining grams in a tin, given all personal sessions made from it. */
export function tinRemaining(tin: Tin, sessions: PersonalSession[]): number {
	const used = sessions
		.filter((s) => s.tinId === tin.id)
		.reduce((acc, s) => acc + (s.powderGrams || 0), 0);
	return Math.max(0, tin.weightGrams - used);
}

/** "8 days · ~9 bowls left", given remaining grams and recent usage cadence. */
export function tinFreshness(
	tin: Tin,
	sessions: PersonalSession[],
): { days: number | null; bowlsLeft: number | null } {
	const days = tin.openedAt
		? Math.floor(
				(Date.now() - new Date(tin.openedAt).getTime()) / (1000 * 60 * 60 * 24),
			)
		: null;

	const remaining = tinRemaining(tin, sessions);
	const tinSessions = sessions.filter((s) => s.tinId === tin.id);
	const avgPerSession =
		tinSessions.length > 0
			? tinSessions.reduce((acc, s) => acc + (s.powderGrams || 0), 0) /
				tinSessions.length
			: null;
	const bowlsLeft = avgPerSession ? Math.round(remaining / avgPerSession) : null;

	return { days, bowlsLeft };
}
