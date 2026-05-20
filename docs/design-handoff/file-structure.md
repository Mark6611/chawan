# Chawan · proposed file structure

Mirrors the coffee app's conventions exactly. The boundaries the coffee
app enforces (repository pattern, no direct Dexie imports in components,
ISO strings for dates, computed values derived at read time) are the same
boundaries Chawan should enforce — same product family, same discipline.

```
src/
├── app.html                          # boot script (theme from localStorage), service worker register
├── app.d.ts
├── lib/
│   ├── auth.svelte.ts                # Phase-2 magic-link auth (same shape as coffee app)
│   ├── supabase.ts                   # client init (Phase 2)
│   ├── sync.ts                       # offline-first sync (Phase 2; fires `chawan:synced` event)
│   ├── db/
│   │   ├── types.ts                  # see handoff/data-model.ts — Tin, Session, enums
│   │   ├── dexie.ts                  # Dexie schema + db instance (NEVER imported by components)
│   │   ├── repository.ts             # Phase 1: Dexie impl. Phase 2: dispatch to supabase + dexie cache.
│   │   └── repository.types.ts       # interface that both impls satisfy
│   ├── sessions/
│   │   ├── compute.ts                # formatRatio, weekStats, formatTimeAgo, defaultsApplied
│   │   ├── defaults.ts               # read/write UserDefaults (localStorage, with migration story)
│   │   └── again.ts                  # "the usual" detection — see flow-review.md
│   ├── tins/
│   │   ├── compute.ts                # tinRemaining, tinFreshness, sessionsForTin
│   │   └── consumption.ts            # rail percentage + per-session tick positions
│   ├── theme/
│   │   ├── theme.svelte.ts           # writable store, persists to localStorage, mirrors data-theme attr
│   │   └── tokens.css                # see handoff/tokens.css — imported by layout.css
│   └── components/
│       ├── AppHeader.svelte          # eyebrow + 32px display + optional action
│       ├── Eyebrow.svelte            # mono 10.5px uppercase tracking-[0.14em] (matches coffee)
│       ├── Display.svelte            # serif heading at configurable size, italic by default
│       ├── Mono.svelte               # mono numeric with tabular-nums + size prop
│       ├── Chawan.svelte             # concentric bowl glyph (3 rings), size + filled props
│       ├── Hairline.svelte           # 0.5px structural line (use --color-hairline)
│       ├── Rating.svelte             # 5-dot scale, filled with --color-data
│       ├── Field.svelte              # form field with eyebrow label + slot for value + optional action
│       ├── Segmented.svelte          # 2- or 3-option segmented control (Usucha/Koicha/Latte etc.)
│       ├── Stepper.svelte            # ±-flanked big-mono numeric (powder, water, temp)
│       ├── PrimaryButton.svelte      # tea fill / hairline outline / ghost variants
│       ├── SessionRow.svelte         # the single feed-row component; switches template via {#if session.kind}
│       ├── TinRow.svelte             # tin card + consumption rail slot
│       ├── ConsumptionRail.svelte    # the horizontal rail with optional per-session ticks
│       ├── TabBar.svelte             # bottom nav (Today / Sessions / Tins / Settings) — OR replace
│       │                             # with a coffee-style bottom link rail; see flow-review.md
│       └── icons/
│           ├── ChevronRight.svelte
│           ├── Plus.svelte
│           └── … one tiny SVG per icon, no library
└── routes/
    ├── +layout.svelte                # global chrome + tab bar + sync indicator
    ├── +layout.ts
    ├── layout.css                    # @import 'tokens.css'; layer base/components overrides
    ├── +page.svelte                  # Home / Today — quiet moment + last session + tin in use + CTA
    ├── sessions/
    │   ├── +page.svelte              # chronological feed, grouped by day, filter rail
    │   ├── new/
    │   │   ├── +page.svelte          # the fork — SEE flow-review.md, may be removed
    │   │   ├── personal/+page.svelte # Personal session form
    │   │   └── store/+page.svelte    # Store-bought form
    │   └── [id]/
    │       ├── +page.svelte          # session detail (read view)
    │       └── edit/+page.svelte     # session detail (edit view; same components, write mode)
    ├── tins/
    │   ├── +page.svelte              # inventory list (active + archived sections)
    │   ├── new/+page.svelte          # new tin form
    │   └── [id]/
    │       ├── +page.svelte          # tin detail with consumption rail + usage history
    │       └── edit/+page.svelte
    ├── settings/+page.svelte
    └── auth/                         # Phase 2 — magic-link callback, sign-in, etc.
└── static/
    ├── manifest.webmanifest          # PWA install
    ├── icon.svg                      # the chawan glyph at 512 (used as the maskable icon too)
    ├── icon-180.png                  # apple-touch-icon
    └── sw.js                         # service worker (offline-first cache)
```

## Notes

### Repository boundary (non-negotiable)

The Dexie instance lives in `src/lib/db/dexie.ts` and is **only imported
by** `src/lib/db/repository.ts`. Components and pages call
`repository.listSessions()`, `repository.saveSession()`, etc. — never
`db.sessions.toArray()` directly.

When you swap Dexie → Supabase in Phase 2, only `repository.ts` and
`dexie.ts` change. The page/component layer doesn't know.

### Stores vs $state

The coffee app uses `$state` rune for component-level state and a
`.svelte.ts` module for module-scoped state (see `auth.svelte.ts`).
Follow the same pattern. The theme store is a good fit for `.svelte.ts`.

### Why a single SessionRow

Personal and store sessions render with different templates but share
hover/tap/key behaviour, the eyebrow + time stamp, the rating dots, and
the route. Keep them in one component and switch the inner template via
`{#if session.kind === 'personal'}` so the row-level affordances don't
drift between the two types.

### Defaults persistence

`UserDefaults` lives in `localStorage` under `chawan:defaults`. It's
read by the Personal form on mount and written by Settings. Don't put it
in Dexie — it's not synced data, it's device preferences.

### The "Again?" affordance

`sessions/again.ts` exports `detectUsual(sessions: Session[])` which
returns either `null` or the suggested repeat. It looks at the last
1–2 sessions and asks: same tin, same powder±0.2g, same style, same
temp±2°C? If yes, offer the repeat. Drives the Home one-tap log.

### Phase discipline

Per `CLAUDE.md`: don't add Phase 2 features into Phase 1 code "to save
time later." Specifically:

- **Phase 1** — single-user, Dexie, no auth, no sync. Settings shows
  sync state but it's a stub.
- **Phase 2** — Supabase, magic link, sync, sign-in screen.

Keep the repository interface stable across phases; that's the only
shared contract.

### Routes that don't yet exist in the design

The design doesn't draw these but they should exist as stubs:

- `/sessions/[id]/edit` — the Edit affordance from session detail
- `/tins/[id]/edit` — the Edit affordance from tin detail
- Empty states for `/sessions`, `/tins`, and Home (zero-session case)

See `flow-review.md` for what each empty state should look like.
