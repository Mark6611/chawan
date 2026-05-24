# Chawan · Roadmap

The North Star. Phase 0 decisions are locked. Phase 1 ships local-only with
Dexie behind a repository boundary; Phase 2 layers Supabase + magic-link
sync on the same shared backend as the coffee app.

---

## Phase 0 — Decisions (locked)

| # | Decision | Resolution |
| - | -------- | ---------- |
| 1 | Fork screen (personal-vs-cafe first step) | **Keep.** Home → fork → form. |
| 2 | "Again?" one-tap repeat on Home | **Ship in v1.** `sessions/again.ts` detects same tin + powder ±0.2g + style + temp ±2°C. |
| 3 | Bottom nav style | **Link rail** (typographic, in-family with coffee). |
| 4 | Time-of-brew eyebrow on form | **Yes.** `NOW · 14:32`, tappable for retrospective logging. |
| 5 | Auth strategy | **Phase 2.** Phase 1 is local-only Dexie. |

Phase 1 visual divergence from the design handoff: **self-host fonts via
Fontsource** rather than the Google Fonts CDN link, matching the coffee
app and keeping the PWA offline-friendly.

---

## Phase 1 — Local-only Dexie app

| Session | Goal | Done when |
| ------- | ---- | --------- |
| **1** | Bootstrap | SvelteKit + Tailwind v4 + tokens + fonts + theme boot; placeholder Home renders in both themes. Repo on Vercel. |
| **2** | Data model & repository boundary | `types.ts` + Zod schemas + Dexie schema + Phase-1 repo impl + Vitest tests pass. |
| **3** | Atoms | `Eyebrow`, `Display`, `Mono`, `Chawan`, `Hairline`, `Rating`, `Field`, `Segmented`, `Stepper`, `ChipGroup`, `PrimaryButton`, `ConsumptionRail`, `LinkRail`. `/dev/kit` exhibits each in both themes. |
| **4** | Home (Today) + fork screen | Home reads from repo; renders cold / normal / again-visible / again-hidden / empty states. Fork screen routes to personal or cafe. |
| **5** | Tin inventory | `/tins` list + `/tins/[id]` detail (rail + freshness signal) + new/edit forms. |
| **6** | Personal session form | Tin picker + style segmented with latte sub-fork + powder/water/temp steppers + whisk tiles + rating/notes + `NOW` eyebrow + bottom save. |
| **7** | Cafe-bought form | Cafe name autocomplete + optional matcha maker + region + style+latte sub-fork + price keypad + rating/notes. |
| **8** | Sessions list + detail + edit | Feed grouped by day, sticky headers, filter rail, two row templates, edit re-uses forms. Personal-edit re-deducts grams from new tin / credits old. |
| **9** | Settings, empty states, PWA polish | Defaults (style/temp/whisk) + theme toggle + sync stub + no-chawan toggle. Empty states for Home/Sessions/Tins. Manifest + icons + service worker. |
| **10** | Phase 1 ship | iPhone QA pass, Lighthouse ≥90 mobile, Vercel domain, weekly local CSV/JSON backup via launchd. |

---

## Phase 2 — Sync (after Phase 1 stable ~2 weeks of real use)

| Session | Goal |
| ------- | ---- |
| **11** | Auth scaffolding (magic-link via Resend; lift coffee's `auth.svelte.ts`). |
| **12** | Supabase tables + RLS (`matcha_tins`, `matcha_sessions` in shared project). Two-impl repo (Dexie cache + Supabase source of truth). |
| **13** | Sync layer (push-on-write, pull-on-sign-in, manual "Sync now"). Carry coffee's Postgres-timestamp normalization fix forward. |
| **14** | Phase 2 ship. Second-device test. Backup script switches to Supabase pull. |

---

## Phase 3 — Matcha catalog (~4 sessions)

A read-only reference library of curated SKUs from leading Japanese
makers, plus a 2-axis flavor chart UI motif modeled on Marukyu
Kōyamaen's published chart. See `docs/catalog_design_brief.md` and
the Design handoff at `~/Downloads/handoff 3/catalog/`.

### Phase-3 decisions (locked from the Design handoff + this roadmap)

| # | Decision | Resolution |
| - | -------- | ---------- |
| 1 | Brand differentiation on chart | **Per-brand shape glyphs in `--data`** (disc / ring / diamond / triangle / square-open). No per-brand colors. |
| 2 | One chart or per-brand charts | **One chart, all brands overlaid.** Brand filter dims non-matching dots to 18%. |
| 3 | Axis range behaviour | **Locked to ±1 always.** Never auto-scale. |
| 4 | Products without taste coords | **`<NotPlottedRail>` below the chart** — hairline chips, tappable to detail. |
| 5 | Tin overlay ("I've tried" on chart) | **Ship in v1, sequenced over Sessions 15/17/18** — add `Tin.catalogId?` in 15, render in 17, write in 18. |
| 6 | Catalog persistence | **Static `src/lib/catalog/matcha-catalog.ts`.** No DB table. Updates via PR. |
| 7 | Snapshot semantics | **Copy fields into Tin at pick time.** No FK from Tin to CatalogEntry. `snapshotForTin()` is the one-way helper. |
| 8 | Picker location | **Sub-route `/catalog/picker?return=...`** (not modal). URL-shareable, plays nice with iOS swipe-back. |
| 9 | View toggle on `/catalog` | **Single segmented control, URL-persistent** (`?view=chart`). |
| 10 | Currency display | **Show source (`¥200/g`); no live conversion.** Keep simple. |

### Seed-data scope (~20 entries for v1)

| Brand | Count | Taste coords |
| ----- | ----- | ------------ |
| Marukyu Kōyamaen | 10 (Aoarashi → Tenju, the published chart) | Yes — from maker |
| Ippodo | 6 (Sayaka, Ummon, Kanro, Ikuyo no Mukashi, Kaboku, Kanon) | None — not-plotted rail |
| Kanbayashi Shunsho | 4 (Tenju no Mukashi, Chigi no Shiro, Aoi, Tachibanasaki) | Inferred (human-judgement plot) |

ID convention: `<brand-prefix>-<kebab-name>` — `mk-eiju`, `ip-sayaka`, `kb-tenju-no-mukashi`. Note: Marukyu and Kanbayashi both have a "Chigi no Shiro" product; distinguish by id prefix.

### Sessions

| Session | Goal | Done when |
| ------- | ---- | --------- |
| **15** | Catalog data + atoms + `Tin.catalogId` | `src/lib/catalog/{types,brands,matcha-catalog,snapshot}.ts` populated with the ~20 entries above. `BrandGlyph.svelte` + `CatalogRow.svelte`. `Tin.catalogId?: string` added to schema + Supabase migration 0004 (`alter table matcha_tins add column "catalogId" text`). Vitest covers `snapshotForTin` + `hasTaste`. Type-check + tests pass. |
| **16** | FlavorChart + companions | `FlavorChart.svelte` at three sizes (hero 320×320 / inline 248×248 / thumb 72×72) per `flavor-chart.md`. `NotPlottedRail.svelte`. `ChartLegend.svelte`. `/dev/chart` exhibit verifies the Marukyu test set reads as a diagonal stripe and brand glyph identity is preserved in both themes. |
| **17** | `/catalog` routes | `/catalog` browse with LIST/CHART toggle + filter rail (Brand · Grade · Region · "I've tried"). `/catalog/[id]` detail with inline mini-chart + grade/region/cultivar meta + "Add to inventory" CTA. "I've tried" indicator reads `Tin.catalogId` from the repo and surfaces a small chawan glyph next to plotted dots + on rows. |
| **18** | Tin form catalog picker | `/catalog/picker?return=/tins/new` reuses CatalogRow in picker mode. On pick → `goto('${return}?catalogId=${id}')`. TinForm reads `?catalogId`, snapshots via `snapshotForTin()`, and persists `catalogId` on save. TinPicker grows a third footer affordance: "Browse catalog". End-to-end loop: TinPicker → Browse catalog → pick → return → save tin → see "tried" indicator surface on `/catalog`. |

### What stays open (resolve mid-build if needed)

- **Sort controls on `/catalog` list** — none in v1. Brand-then-grade grouping. Add explicit sort if it bites.
- **"I've tried" indicator visual treatment** — small filled chawan glyph next to the dot. Exact size + offset to be eyeballed during Session 17.
- **Picker modal vs sub-route revisit** — if the sub-route feels heavy on iPhone PWA, fall back to a modal.

---

## Cross-cutting reminders

- **Repository boundary is non-negotiable** — components never import `db` directly.
- **ISO strings** for all timestamps; **computed values** at read time only.
- **No `Co-Authored-By: Claude`** trailers on commits.
- **Phase discipline** — no Phase 2 features in Phase 1 code.
- **Don't extend scope silently** — if something feels out of brief, stop and ask.
