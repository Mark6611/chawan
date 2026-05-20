// Chawan data model.
//
// Zod schemas are the source of truth; TypeScript types are inferred.
// Conventions (mirroring the coffee app):
//   - ISO strings for timestamps (never Date objects)
//   - Money in integer cents (never floats)
//   - `cultivar` is freeform string with curated chip suggestions (not enum)
//   - Derived values (ratio, remaining, freshness) computed at read time
//   - All persistence flows through src/lib/db/repository.ts
//
// Phase 2 will reuse these schemas to validate payloads coming back from
// Supabase; the discriminated union keeps Personal vs Store narrowable.

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

export const RegionSchema = z.enum(['uji', 'nishio', 'yame', 'kagoshima', 'shizuoka', 'other']);
export type Region = z.infer<typeof RegionSchema>;

export const REGION_LABELS: Record<Region, string> = {
	uji: 'Uji',
	nishio: 'Nishio',
	yame: 'Yame',
	kagoshima: 'Kagoshima',
	shizuoka: 'Shizuoka',
	other: 'Other'
};

export const GradeSchema = z.enum(['ceremonial', 'premium', 'culinary']);
export type Grade = z.infer<typeof GradeSchema>;

export const GRADE_LABELS: Record<Grade, string> = {
	ceremonial: 'Ceremonial',
	premium: 'Premium',
	culinary: 'Culinary'
};

export const StyleSchema = z.enum(['usucha', 'koicha', 'latte']);
export type Style = z.infer<typeof StyleSchema>;

export const STYLE_LABELS: Record<Style, string> = {
	usucha: 'Usucha',
	koicha: 'Koicha',
	latte: 'Latte'
};

export const MilkSchema = z.enum(['cow', 'oat', 'almond', 'soy', 'coconut', 'other']);
export type Milk = z.infer<typeof MilkSchema>;

export const MILK_LABELS: Record<Milk, string> = {
	cow: 'Cow',
	oat: 'Oat',
	almond: 'Almond',
	soy: 'Soy',
	coconut: 'Coconut',
	other: 'Other'
};

export const WhiskSchema = z.enum(['chasen-80', 'chasen-100', 'chasen-120', 'electric']);
export type Whisk = z.infer<typeof WhiskSchema>;

export const WHISK_LABELS: Record<Whisk, string> = {
	'chasen-80': 'Chasen 80',
	'chasen-100': 'Chasen 100',
	'chasen-120': 'Chasen 120',
	electric: 'Electric'
};

// Cultivar — freeform string with curated chip suggestions in the UI.
export const SUGGESTED_CULTIVARS = [
	'Yabukita',
	'Okumidori',
	'Samidori',
	'Asahi',
	'Gokō',
	'Uji-hikari'
] as const;

// ─────────────────────────────────────────────────────────────
// Tin
// ─────────────────────────────────────────────────────────────

export const TinSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	maker: z.string(),
	grade: GradeSchema,
	region: RegionSchema,
	cultivar: z.string().optional(),
	harvestDate: z.string().optional(), // ISO YYYY-MM-DD
	weightGrams: z.number().positive(),
	openedAt: z.string().optional(), // ISO timestamp; undefined = unopened
	archived: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string()
});
export type Tin = z.infer<typeof TinSchema>;

// ─────────────────────────────────────────────────────────────
// Session — discriminated union on `kind`
// ─────────────────────────────────────────────────────────────

const sessionBaseShape = {
	id: z.string().min(1),
	brewedAt: z.string(), // ISO timestamp
	style: StyleSchema,
	// Milk is required if style === 'latte'; enforcement is at the form layer
	// (the storage shape stays optional so we can save drafts mid-edit).
	milk: MilkSchema.optional(),
	rating: z.number().int().min(0).max(5).optional(),
	notes: z.string().optional(),
	createdAt: z.string(),
	updatedAt: z.string()
};

export const PersonalSessionSchema = z.object({
	kind: z.literal('personal'),
	...sessionBaseShape,
	tinId: z.string().min(1),
	powderGrams: z.number().positive(),
	waterGrams: z.number().positive(),
	waterTempC: z.number().int().min(0).max(100),
	whisk: WhiskSchema.optional()
});
export type PersonalSession = z.infer<typeof PersonalSessionSchema>;

export const StoreSessionSchema = z.object({
	kind: z.literal('store'),
	...sessionBaseShape,
	storeName: z.string().min(1),
	region: RegionSchema,
	priceCents: z.number().int().nonnegative().optional(),
	priceCurrency: z.string().length(3).optional() // ISO 4217 (USD, JPY, …)
});
export type StoreSession = z.infer<typeof StoreSessionSchema>;

export const SessionSchema = z.discriminatedUnion('kind', [
	PersonalSessionSchema,
	StoreSessionSchema
]);
export type Session = z.infer<typeof SessionSchema>;

// ─────────────────────────────────────────────────────────────
// User defaults — applied when the personal form is opened.
// Lives in localStorage under `chawan:defaults`. NOT synced.
// ─────────────────────────────────────────────────────────────

export const UserDefaultsSchema = z.object({
	style: StyleSchema,
	waterTempC: z.number().int().min(0).max(100),
	whisk: WhiskSchema,
	powderGrams: z.number().positive().optional(),
	waterGrams: z.number().positive().optional()
});
export type UserDefaults = z.infer<typeof UserDefaultsSchema>;

export const DEFAULT_DEFAULTS: UserDefaults = {
	style: 'usucha',
	waterTempC: 76,
	whisk: 'chasen-100'
};

// ─────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────

export const isPersonal = (s: Session): s is PersonalSession => s.kind === 'personal';
export const isStore = (s: Session): s is StoreSession => s.kind === 'store';

// ─────────────────────────────────────────────────────────────
// Small factory helpers — used by forms and tests to construct
// records without hand-rolling id + timestamps.
// ─────────────────────────────────────────────────────────────

export function newId(): string {
	return crypto.randomUUID();
}

export function nowIso(): string {
	return new Date().toISOString();
}
