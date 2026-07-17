# Chawan

Personal log for matcha sessions — a local-first SvelteKit PWA with a curated matcha catalog, tin inventory, flavor charts, and cloud sync. Ships as a native iOS app via Capacitor ("Chawan by KK").

- **Local-first:** sessions live on-device in IndexedDB (Dexie); the app works fully offline.
- **Sync:** signed-in devices sync through Supabase (magic-link / one-time-code auth, plus password sign-in for App Review).
- **Catalog:** a built-in catalog of matcha brands and blends with a flavor chart and Japan region map.
- **Sharing:** sessions render to a shareable image card (canvas).

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
│   ├── settings/          Settings, account, export
│   ├── auth/              Sign-in + callback
│   └── dev/               Dev-only component/chart playground
└── lib/
    ├── db/              ⭐ Data layer — START HERE
    │   ├── repository.ts        The ONLY database entry point; components
    │   │                        never touch Dexie/Supabase directly.
    │   ├── dexie.ts             IndexedDB schema
    │   └── types.ts             Session, Tin, and related record types
    ├── catalog/         Matcha catalog data, brands, search, snapshots
    ├── sessions/        Session domain logic (defaults, currency,
    │                    "brew this again" prefill, computed values)
    ├── insights/        Aggregations for the insights page
    ├── share/           Share-card rendering (canvas)
    ├── components/      Reusable UI (forms, flavor chart, Japan map…)
    ├── auth.svelte.ts   Supabase auth state
    ├── preferences.svelte.ts  Local user preferences
    └── supabase.ts      Supabase client
```

Supporting directories:

| Path | What it is |
|---|---|
| `ios/` | Capacitor-generated Xcode project (the iOS app) |
| `supabase/` | SQL migrations for the sync backend |
| `scripts/` | `ship.sh` (build + deploy pipeline), icon generation |
| `docs/` | Design briefs and product/design handoff docs |
| [ROADMAP.md](ROADMAP.md) | What's planned next |
| [CLAUDE.md](CLAUDE.md) | Project conventions for AI-assisted work |

## Develop

```sh
npm install
cp .env.example .env   # Supabase URL + anon key
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | Type-check (svelte-check) |
| `npm run lint` / `format` | Prettier + ESLint |
| `npm run build` | Production web build (deployed on Vercel) |
| `npm run native:build` | Capacitor build + sync for iOS |
| `npm run native:open` | Open the Xcode project |

## Sibling projects

- [coffee-brew-log](https://github.com/Mark6611/coffee-brew-log) — the coffee sibling of this app (same local-first + sync architecture).
