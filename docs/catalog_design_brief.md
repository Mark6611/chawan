# Chawan · Catalog feature — design brief

Adding a **matcha catalog** to the existing chawan app. The catalog is a
read-only reference library of known matcha SKUs from leading Japanese
makers (Marukyu Kōyamaen, Ippodo, Kanbayashi Shunsho, possibly
Yamamasa-Koyamaen and Horii Shichimeien), so the user can:

1. **Browse** what's out there before they buy
2. **Pick from the catalog** when adding a tin (auto-fills maker, name,
   grade, region, cultivars, taste profile — they just enter weight + opened-date)
3. **Explore taste relationships** via each maker's flavor chart (the
   sharp↔mild × refreshing↔full-body cross-axis Marukyu publishes)

Status: **pre-build**. The existing chawan app is shipped through Phase 2
(Supabase auth + sync). This is Phase 3.

---

## Product summary

A library of ~50–100 curated matcha products. **Read-only**, ships in
code (`src/lib/catalog/`), updated via PRs — no admin UI, no community
contributions. Phase 3 ambition is a confident first version with
Marukyu fully covered (their flavor chart is the visual anchor) plus
Ippodo and Kanbayashi Shunsho's main lines.

### What an entry contains

| Field | Shape | Example |
|---|---|---|
| brand | string | "Marukyu Kōyamaen" |
| name | string | "Eiju 永寿" |
| grade | enum (ceremonial / premium / culinary) | ceremonial |
| region | enum (uji / nishio / yame / kagoshima / shizuoka / other) | uji |
| cultivars | optional string[] | ["Yabukita", "Asahi"] (blends OK) |
| tasteProfile | `{ x: number, y: number }` (each −1..+1) | `{ x: 0.6, y: 0.5 }` (mild + full-body) |
| usuchaSuitable / koichaSuitable | boolean | both true |
| price | optional `{ jpyPerGram: number }` | `{ jpyPerGram: 80 }` |
| description | optional string | one paragraph |
| productUrl | optional string | maker's product page |

Taste profile uses the **two-axis grid Marukyu publishes**: x-axis goes
`sharp (−1) ↔ mild (+1)`, y-axis goes `refreshing (−1) ↔ full-body
(+1)`. Other makers don't publish their own; we infer or omit.

---

## Architecture decisions (made)

1. **Static catalog file** — `src/lib/catalog/matcha-catalog.ts` exports
   a typed array. No DB table, no Supabase round-trip. Updates ship via
   commits.
2. **Type lives alongside existing types** — `CatalogEntry` in
   `src/lib/db/types.ts` (or a new `src/lib/catalog/types.ts`).
3. **Tin schema unchanged** — when a user picks from catalog, we copy
   the fields into a new Tin row; no foreign key. (If a catalog entry
   gets edited later, existing tins keep their snapshot. Tin remains
   the source of truth for "what I own".)
4. **No taste profile on Tin or Session for now** — taste lives only on
   catalog entries. (Future: let the user override per-tin if they
   disagree with the published profile.)

---

## Visual identity — extend, don't fork

The catalog ships inside the existing chawan app. Same design language:

- Day default (wood + white + black + minimal tea green), night opt-in
- Italic Cormorant Garamond display · EB Garamond body · IBM Plex Mono numerics
- Eyebrows, hairlines, big-mono numerics
- The chawan glyph as the recurring graphic
- Tea green for selection / accent; never for the chart's product dots

**The single new motif** Design needs to deliver is the **flavor chart**
— a 2D coordinate plot of products, mobile-first, ideally usable both
as a browse surface AND as a small inline element on detail pages.
Reference shape: the chart Marukyu publishes (attached). Don't mirror
their visual treatment (it reads as product photography). The chawan
version should feel like a typographic, hairline-structured diagram —
no photos, no rounded gradient backgrounds.

---

## Design prompt — ready to send to Claude Design

```
I'm extending an existing personal matcha log (Chawan, sibling to the
Coffee Brew Log). Phase 1 + Phase 2 are shipped. Phase 3 adds a
matcha catalog — a read-only reference library of ~50–100 SKUs from
leading Japanese makers, plus a 2-axis flavor chart UI motif.

Existing design system is locked: see the chawan handoff in
/Users/kornkrankeeratitejakarn/Desktop/CODE/design_handoff_chawan/.
Day default (wood + white + black + minimal tea green). Italic
Cormorant Garamond. The eyebrow + display + hairline vocabulary.
Don't reinvent any of that — extend it.

## What's new

A flavor chart. Reference: Marukyu Kōyamaen's published chart with
products plotted on two axes (sharp↔mild × refreshing↔full-body).
Used in three places:

1. **Catalog browse (primary)** — the whole chart visible, all
   plotted products tappable. Filters (brand, grade, region) shrink
   the visible set.
2. **Catalog detail** — small inline chart showing this product's
   position within its maker's lineup.
3. **Tin detail (future)** — bonus: overlay the user's owned tins
   onto their makers' charts so they see what they've tried vs the
   gap. Defer to a later iteration if it complicates the primary.

The chart needs to:
- Work on a phone screen (375px wide minimum)
- Use hairline structure instead of photography
- Allow tap on a plotted product → goes to catalog detail
- Distinguish brands visually without color noise (the existing
  palette uses tea green sparingly — don't introduce per-brand
  colors)
- Handle products without published coordinates (Ippodo doesn't
  publish, e.g.) — either hide or render as a "no profile yet"
  pile somewhere outside the chart proper

## Screens to deliver

1. **Catalog browse** (`/catalog`) — list + the flavor chart toggle.
   Filter rail (Brand · Grade · Region · "I've tried this"). Sort
   options.
2. **Catalog detail** (`/catalog/[id]`) — product hero (italic name,
   brand eyebrow, grade + region + cultivar meta), description if
   present, inline mini-chart showing position within maker's lineup,
   "Add to inventory" CTA (lands at /tins/new with prefilled fields).
3. **Tin form, catalog picker mode** — when the user taps "Browse
   catalog" from TinForm or TinPicker, they see a compact catalog
   browser (same data, narrower chrome). Pick → returns with
   the catalog entry prefilled.
4. **Empty / loading states** for the catalog list and chart.

## Constraints

- Mobile-first (used primarily on iPhone in installed PWA mode)
- Extends the existing chawan design system — no new fonts, no new
  base colors. New motifs only where genuinely needed (the chart).
- The flavor chart should be elegant at three sizes:
  - Hero (full-width, browse surface)
  - Card-inline (~280px wide, catalog detail)
  - Thumbnail (~120px, optional, future)
- Real data: Marukyu publishes 9 products on their chart (Aoarashi,
  Isuzu, Chigi no shiro, Yugen, Wako, Kinrin, Unkaku, Eiju, Choan,
  Tenju). Use those as the test set when designing.

## Out of scope

- User-contributed catalog entries
- Multiple flavor systems (we're standardizing on Marukyu's two axes;
  other makers' descriptors get mapped or omitted)
- Pricing / marketplace / "where to buy"
- Reviews, community ratings
- Notifications when a new product is added to the catalog

Deliver mockups (or precise verbal descriptions) for each screen, the
flavor chart component spec at three sizes, and any new motifs
(typography tweaks, badge patterns) that propagate across the system.
I'll implement in SvelteKit + Tailwind v4 (same stack as Phase 1+2).
```

---

## Reference data — the test set

Marukyu Kōyamaen's published chart (use these as the working set when
designing the chart):

| Product | Sharp↔Mild (x) | Refreshing↔Full-body (y) |
|---|---|---|
| Aoarashi 青嵐 | −0.85 | −0.7 |
| Isuzu 五十鈴 | −0.6 | −0.45 |
| Chigi no shiro 千木の白 | −0.4 | −0.2 |
| Yugen 又玄 | −0.15 | +0.05 |
| Wako 和光 | 0 | 0 |
| Kinrin 金輪 | +0.25 | +0.25 |
| Unkaku 雲鶴 | +0.4 | +0.4 |
| Eiju 永寿 | +0.55 | +0.55 |
| Choan 長寿 | +0.7 | +0.65 |
| Tenju 天授 | +0.85 | +0.7 |

(Approximate from the published chart. We'll refine when we have
better source data.)

---

## Open questions for Design

1. **Brand color coding** — can we distinguish 5+ brands on a chart
   without breaking the chawan palette discipline (only tea green as
   accent)? Per-brand glyphs? Per-brand typographic treatments?
2. **Plotting density** — with 50–100 products from 5 brands across
   one chart, do we need separate charts per brand by default?
3. **Filter behavior** — when filters narrow the visible set, does the
   chart's axis range stay fixed (anchor to ±1 always) or auto-scale
   to fit?
4. **Products without coordinates** — Ippodo doesn't publish a chart
   like Marukyu does. Best treatment for entries that have brand +
   grade but no taste profile?
5. **Tin overlay** (future) — when the user has a tin matching a
   catalog entry, how does that get visually marked on the chart? A
   filled vs ring chawan glyph? A tag?

---

End of brief.
