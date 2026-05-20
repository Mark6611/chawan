# Chawan · Roadmap

The North Star. Phase 0 decisions are locked. Phase 1 ships local-only with
Dexie behind a repository boundary; Phase 2 layers Supabase + magic-link
sync on the same shared backend as the coffee app.

---

## Phase 0 — Decisions (locked)

| # | Decision | Resolution |
| - | -------- | ---------- |
| 1 | Fork screen (personal-vs-store first step) | **Keep.** Home → fork → form. |
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
| **4** | Home (Today) + fork screen | Home reads from repo; renders cold / normal / again-visible / again-hidden / empty states. Fork screen routes to personal or store. |
| **5** | Tin inventory | `/tins` list + `/tins/[id]` detail (rail + freshness signal) + new/edit forms. |
| **6** | Personal session form | Tin picker + style segmented with latte sub-fork + powder/water/temp steppers + whisk tiles + rating/notes + `NOW` eyebrow + bottom save. |
| **7** | Store-bought form | Store autocomplete + region + style+latte sub-fork + price keypad + rating/notes. |
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

## Cross-cutting reminders

- **Repository boundary is non-negotiable** — components never import `db` directly.
- **ISO strings** for all timestamps; **computed values** at read time only.
- **No `Co-Authored-By: Claude`** trailers on commits.
- **Phase discipline** — no Phase 2 features in Phase 1 code.
- **Don't extend scope silently** — if something feels out of brief, stop and ask.
