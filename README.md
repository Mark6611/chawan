# Chawan

**A personal log for matcha sessions — a local-first SvelteKit PWA with a curated matcha catalog, flavor charts, a Japan region map, and canvas share cards. Ships as a native iOS app via Capacitor ("Chawan by KK", App Store review in progress).**

[![CI](https://github.com/Mark6611/chawan/actions/workflows/ci.yml/badge.svg)](https://github.com/Mark6611/chawan/actions/workflows/ci.yml)
![SvelteKit](https://img.shields.io/badge/SvelteKit-Svelte%205-ff3e00)
![Data](https://img.shields.io/badge/data-local--only%20(IndexedDB)-4a7c59)
![iOS](https://img.shields.io/badge/iOS-Capacitor-111111)

- **Local-only:** all data lives on-device in IndexedDB (Dexie). No accounts, no backend, no data collection. The app works fully offline; JSON export/import is the backup path.
- **Catalog:** a curated, read-only library of matcha (20 entries across 3 brands — Marukyu Kōyamaen, Ippodo, Kanbayashi Shunsho) with per-brand flavor charts and a Japan growing-region map.
- **Insights:** consumption and flavor aggregations computed from your sessions at read time.
- **Sharing:** sessions render to a shareable image card, drawn on a canvas — no server round-trip.

## Architecture

Local-first, one write path:

```
UI (Svelte 5 routes/components)
        │  never touches the database directly
        ▼
src/lib/db/repository.ts   ← the ONLY data entry point
        ▼
Dexie (IndexedDB)          ← on-device, offline, the source of truth
```

- The **catalog is data, not a service** — it ships inside the JS bundle (`src/lib/catalog/`) and is versioned in git, so catalog pages work offline and load instantly.
- **Computed values** (insights, session derivations) are derived at read time, never stored.
- **Share cards** are rendered client-side to a canvas and handed to the native share sheet via Capacitor.
- The **iOS app is the same web build** wrapped in a Capacitor shell (`ios/`); the web build also deploys to Vercel as an installable PWA.
- A **sync layer exists but is switched off**: after App Review direction, Chawan ships local-only. `SYNC_ENABLED = false` in `src/lib/supabase.ts` is a hard kill switch — while false, no Supabase client is ever created and App Privacy is honestly "Data Not Collected". The auth/sync surfaces (`src/routes/auth/`, `src/lib/auth.svelte.ts`, `supabase/` migrations) remain in the tree behind that flag.

## Where the main code lives

**`src/` is the app.** The rest of the root is packaging (iOS shell, deploy config, tooling).

```text
src/
├── routes/              Pages (SvelteKit file-based routing)
│   ├── +page.svelte       Home
│   ├── sessions/          Session list, detail, and "log a session" form
│   ├── tins/              Tin (matcha inventory) list, detail, new
│   ├── catalog/           Browsable matcha catalog + detail pages
│   ├── insights/          Consumption + flavor insights
│   ├── settings/          Settings, export
│   ├── auth/              Sign-in surface (dormant — sync is switched off)
│   └── dev/               Dev-only component/chart playground
└── lib/
    ├── db/              ⭐ Data layer — START HERE
    │   ├── repository.ts        The ONLY database entry point; components
    │   │                        never touch Dexie directly.
    │   ├── dexie.ts             IndexedDB schema
    │   └── types.ts             Session, Tin, and related record types
    ├── catalog/         Matcha catalog data, brands, search, snapshots
    ├── sessions/        Session domain logic (defaults, currency,
    │                    "brew this again" prefill, computed values)
    ├── insights/        Aggregations for the insights page
    ├── share/           Share-card rendering (canvas)
    ├── components/      Reusable UI (forms, FlavorChart, JapanMap…)
    ├── preferences.svelte.ts  Local user preferences
    └── supabase.ts      Dormant sync client (SYNC_ENABLED = false)
```

Supporting directories:

| Path                     | What it is                                                |
| ------------------------ | --------------------------------------------------------- |
| `ios/`                   | Capacitor-generated Xcode project (the iOS app)           |
| `supabase/`              | SQL migrations for the dormant sync backend               |
| `scripts/`               | `ship.sh` (gated TestFlight pipeline), CSS gate, icons    |
| `docs/`                  | Design briefs and product/design handoff docs             |
| [ROADMAP.md](ROADMAP.md) | What's planned next                                       |
| [CLAUDE.md](CLAUDE.md)   | Project conventions for AI-assisted work                  |

## Engineering practice

- **164 unit tests in 13 files** (Vitest) over the data layer, catalog, session/tin/insight computations, backup merge, and share-card rendering — `npm test`.
- **CI on every push/PR** ([ci.yml](.github/workflows/ci.yml)): type-check (`svelte-check`), unit tests, a full production build, and a **browser-floor CSS gate** (`scripts/verify-bundle-css.mjs`) that scans the built bundle for CSS the iOS 15 floor can't parse (unpaired `backdrop-filter`, unguarded `color-mix`, media-query range syntax).
- **Gated ship pipeline** (`scripts/ship.sh`): unit tests → type-check → lint + format, then version bump, signed archive (manual distribution signing), IPA build-number sanity check, and TestFlight upload. Gates are never piped, so a red test run can't ship.
- **Accessibility first pass landed**: AA contrast tokens and visible keyboard focus across the app.
- Prettier + ESLint enforced (`npm run lint`).

## Develop

```sh
npm install
npm run dev
```

No environment variables are required — the app runs fully local. (`.env.example` documents the Supabase keys used only if the dormant sync layer is ever re-enabled.)

| Command                   | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `npm run dev`             | Dev server                                |
| `npm test`                | Unit tests (Vitest)                       |
| `npm run check`           | Type-check (svelte-check)                 |
| `npm run lint` / `format` | Prettier + ESLint                         |
| `npm run build`           | Production web build (deployed on Vercel) |
| `npm run native:build`    | Capacitor build + sync for iOS            |
| `npm run native:open`     | Open the Xcode project                    |

## Related projects

- [coffee-brew-log](https://github.com/Mark6611/coffee-brew-log) — the coffee sibling of this app (same local-first repository architecture). [On the App Store](https://apps.apple.com/app/id6786772685).
- [html-brew](https://github.com/Mark6611/html-brew) — Brew Sheet, the static Astro blog companion to the coffee app.
- [buffy](https://github.com/Mark6611/buffy) — BuffUp, a workout tracker from the same family. [On the App Store](https://apps.apple.com/app/id6785999682).
