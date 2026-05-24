// The matcha catalog — read-only reference library, ships in the JS bundle.
//
// v1 seed: 20 entries across three brands.
//   - Marukyu Kōyamaen: full 10 from their published flavor chart
//     (Aoarashi → Tenju on the diagonal sharp+refreshing → mild+full-body)
//   - Ippodo: 6 main products. They don't publish a taste chart — all
//     surface in the NotPlottedRail below the chart.
//   - Kanbayashi Shunsho: 4 products with inferred taste coords (best
//     human-judgement; refine when better source data lands).
//
// Adding an entry: pick a stable id (`<brand-prefix>-<kebab-name>`), set
// brand to a registered BrandId, fill grade + region + usucha/koicha
// suitability. Everything else is optional. taste is omitted when the
// maker doesn't publish a profile.
//
// Taste notes (`tasteNotes`) are short flavor descriptors curated as
// best-effort from each brand's public materials + the position on
// Marukyu's chart. Refine these in PRs when you've tasted a product
// and disagree with the published vocabulary.
//
// Note: Marukyu and Kanbayashi BOTH have a product called "Chigi no
// Shiro" — distinguish by brand-prefix in the id (mk-chigi-no-shiro vs
// kb-chigi-no-shiro). Different blends, same romaji name.

import type { CatalogEntry } from './types';

export const MATCHA_CATALOG: readonly CatalogEntry[] = [
	// ─── Marukyu Kōyamaen ──────────────────────────────────────
	{
		id: 'mk-aoarashi',
		brand: 'marukyu',
		name: 'Aoarashi',
		kanji: '青嵐',
		grade: 'culinary',
		region: 'uji',
		taste: { x: -0.85, y: -0.7 },
		usuchaSuitable: true,
		koichaSuitable: false,
		tasteNotes: ['bright', 'grassy', 'sharp'],
		description:
			'The sharpest, most refreshing end of Marukyu Kōyamaen\'s lineup. An everyday matcha for cooking, lattes, and casual usucha.'
	},
	{
		id: 'mk-isuzu',
		brand: 'marukyu',
		name: 'Isuzu',
		kanji: '五十鈴',
		grade: 'culinary',
		region: 'uji',
		taste: { x: -0.6, y: -0.45 },
		usuchaSuitable: true,
		koichaSuitable: false,
		tasteNotes: ['brisk', 'vegetal', 'light umami']
	},
	{
		id: 'mk-chigi-no-shiro',
		brand: 'marukyu',
		name: 'Chigi no Shiro',
		kanji: '千木の白',
		grade: 'premium',
		region: 'uji',
		taste: { x: -0.4, y: -0.2 },
		usuchaSuitable: true,
		koichaSuitable: false,
		tasteNotes: ['delicate', 'vegetal', 'smooth']
	},
	{
		id: 'mk-yugen',
		brand: 'marukyu',
		name: 'Yugen',
		kanji: '又玄',
		grade: 'premium',
		region: 'uji',
		taste: { x: -0.15, y: 0.05 },
		usuchaSuitable: true,
		koichaSuitable: false,
		tasteNotes: ['mellow', 'umami', 'balanced']
	},
	{
		id: 'mk-wako',
		brand: 'marukyu',
		name: 'Wako',
		kanji: '和光',
		grade: 'ceremonial',
		region: 'uji',
		taste: { x: 0, y: 0 },
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['balanced', 'mellow', 'gentle umami'],
		description:
			'The center of Marukyu Kōyamaen\'s flavor chart — a balanced ceremonial usucha that sits at the origin of sharp / mild and refreshing / full-body.'
	},
	{
		id: 'mk-kinrin',
		brand: 'marukyu',
		name: 'Kinrin',
		kanji: '金輪',
		grade: 'ceremonial',
		region: 'uji',
		taste: { x: 0.25, y: 0.25 },
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['smooth', 'rich umami', 'sweet finish']
	},
	{
		id: 'mk-unkaku',
		brand: 'marukyu',
		name: 'Unkaku',
		kanji: '雲鶴',
		grade: 'ceremonial',
		region: 'uji',
		taste: { x: 0.4, y: 0.4 },
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['creamy', 'deep umami', 'lingering sweetness']
	},
	{
		id: 'mk-eiju',
		brand: 'marukyu',
		name: 'Eiju',
		kanji: '永寿',
		grade: 'ceremonial',
		region: 'uji',
		taste: { x: 0.55, y: 0.55 },
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['mellow', 'umami', 'natural sweetness'],
		description:
			'One of Marukyu Kōyamaen\'s widely-loved ceremonial matchas — full-bodied, mellow, with a quiet natural sweetness.'
	},
	{
		id: 'mk-choan',
		brand: 'marukyu',
		name: 'Choan',
		kanji: '長寿',
		grade: 'ceremonial',
		region: 'uji',
		taste: { x: 0.7, y: 0.65 },
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['rich', 'deep umami', 'creamy']
	},
	{
		id: 'mk-tenju',
		brand: 'marukyu',
		name: 'Tenju',
		kanji: '天授',
		grade: 'ceremonial',
		region: 'uji',
		taste: { x: 0.85, y: 0.7 },
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['deep umami', 'creamy', 'koicha-prized'],
		description:
			'The top-right corner of Marukyu\'s chart. Mild, deeply full-bodied, prized for koicha.'
	},

	// ─── Ippodo (no published taste chart; surface in NotPlottedRail) ──
	{
		id: 'ip-sayaka',
		brand: 'ippodo',
		name: 'Sayaka',
		kanji: 'さやか',
		grade: 'ceremonial',
		region: 'uji',
		usuchaSuitable: true,
		koichaSuitable: false,
		tasteNotes: ['bright', 'fresh', 'everyday usucha']
	},
	{
		id: 'ip-kanro',
		brand: 'ippodo',
		name: 'Kanro',
		kanji: '甘露',
		grade: 'ceremonial',
		region: 'uji',
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['balanced', 'smooth', 'subtle sweetness']
	},
	{
		id: 'ip-kaboku',
		brand: 'ippodo',
		name: 'Kaboku',
		kanji: '加保木',
		grade: 'premium',
		region: 'uji',
		usuchaSuitable: true,
		koichaSuitable: false,
		tasteNotes: ['soft', 'vegetal', 'easy-drinking']
	},
	{
		id: 'ip-kanon',
		brand: 'ippodo',
		name: 'Kanon',
		kanji: '華音',
		grade: 'ceremonial',
		region: 'uji',
		usuchaSuitable: true,
		koichaSuitable: false,
		tasteNotes: ['fragrant', 'delicate', 'floral']
	},
	{
		id: 'ip-ikuyo-no-mukashi',
		brand: 'ippodo',
		name: 'Ikuyo no Mukashi',
		kanji: '幾世の昔',
		grade: 'ceremonial',
		region: 'uji',
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['full-bodied', 'rich umami', 'versatile']
	},
	{
		id: 'ip-ummon-no-mukashi',
		brand: 'ippodo',
		name: 'Ummon no Mukashi',
		kanji: '雲門の昔',
		grade: 'ceremonial',
		region: 'uji',
		usuchaSuitable: false,
		koichaSuitable: true,
		tasteNotes: ['rich', 'thick', 'deep umami'],
		description: 'Ippodo\'s flagship koicha-style matcha. Rich, thick, slowly grown.'
	},

	// ─── Kanbayashi Shunsho (inferred coords) ─────────────────
	{
		id: 'kb-tenju-no-mukashi',
		brand: 'kanbayashi',
		name: 'Tenju no Mukashi',
		kanji: '天授の昔',
		grade: 'ceremonial',
		region: 'uji',
		taste: { x: 0.65, y: 0.6 },
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['full-bodied', 'deep umami', 'smooth']
	},
	{
		id: 'kb-chigi-no-shiro',
		brand: 'kanbayashi',
		name: 'Chigi no Shiro',
		kanji: '千木の白',
		grade: 'premium',
		region: 'uji',
		taste: { x: -0.3, y: -0.1 },
		usuchaSuitable: true,
		koichaSuitable: false,
		tasteNotes: ['delicate', 'vegetal', 'bright']
	},
	{
		id: 'kb-aoi',
		brand: 'kanbayashi',
		name: 'Aoi',
		kanji: '葵',
		grade: 'ceremonial',
		region: 'uji',
		taste: { x: 0.4, y: 0.45 },
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['mellow', 'umami', 'balanced']
	},
	{
		id: 'kb-tachibanasaki',
		brand: 'kanbayashi',
		name: 'Tachibanasaki',
		kanji: '橘咲',
		grade: 'ceremonial',
		region: 'uji',
		taste: { x: 0.2, y: 0.3 },
		usuchaSuitable: true,
		koichaSuitable: true,
		tasteNotes: ['floral', 'bright', 'fresh']
	}
];

/** Map id → entry for O(1) detail / picker lookup. */
export const CATALOG_BY_ID: Record<string, CatalogEntry> = Object.fromEntries(
	MATCHA_CATALOG.map((e) => [e.id, e])
);

export function getCatalogEntry(id: string): CatalogEntry | undefined {
	return CATALOG_BY_ID[id];
}
