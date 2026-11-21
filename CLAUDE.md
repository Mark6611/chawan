# Project conventions

## Architecture

- All database access goes through `src/lib/db/repository.ts`.
- Components never import the Dexie `db` instance directly.
- Reason: storage stays swappable (iCloud sync is planned) without touching the UI. Preserve this boundary.

## Data model

- Sessions are a **discriminated union** on `kind: 'personal' | 'cafe'`. Narrow via `isPersonal` / `isCafe` from `db/types.ts` before reading kind-specific fields.
- `CafeSession.maker` is optional — set when the cafe is upfront about which matcha brand they source from. Most cafe logs won't have it.
- `cultivar` is a free-form string with curated chip suggestions (not an enum) — tea varieties vary widely.
- All timestamps (`brewedAt`, `openedAt`, `harvestDate`, `createdAt`, `updatedAt`) are ISO strings, not `Date` objects.
- Money is stored as integer cents (`priceCents`), never floats.
- Computed values (water:powder ratio, tin remaining grams, freshness window, "Again?" suggestion) are derived at read time, never stored.

## Scope discipline

- The app is **local-only**: IndexedDB via Dexie, no accounts, no backend, no network requests at all. Supabase sync was built, switched off after App Review (5.1.1) and removed in September 2026. App Privacy is "Data Not Collected".
- `PROJECT_PLAN.md` is the current plan and its phases are the unit of work. Do not pull a later phase's feature into an earlier one "to save time later."
- Any change to a Dexie row shape ships with a version bump and an `upgrade()` in the same commit, and a backup format bump if the file contract changes.

## Visual identity

- Two themes: `day` (default) and `night`. No `system` mode in v1.
- Theme persists in `localStorage` under key `chawan:theme`.
- Fonts self-hosted via Fontsource: Cormorant Garamond (display, italic primary), EB Garamond (body), IBM Plex Mono (mono). Deliberate divergence from the design handoff's Google Fonts link — keeps the PWA offline-first.
- Tea green (`--color-tea`) is for primary CTA fills, selection outlines, selection dots. Numerics + rails use `--color-data`, which drops to ink in day mode.

## iOS shell

- Built with the iOS 27 SDK, which makes the **scene lifecycle mandatory**: without it UIKit traps about six seconds after launch on iOS 27. `SceneDelegate.swift` uses the window UIKit already built from `Main.storyboard`. Do not restore Capacitor's template body, which builds a second window.
- Deployment target is **16.4** (Tailwind v4's real floor). The built CSS is still lowered to the iOS 15 floor and gated by `scripts/verify-bundle-css.mjs`; that is deliberately stricter than the target.
- The web view runs under the status bar. Pages take their top padding from the `pt-page` utility, never a flat `py-12`.
- Confirmations go through `confirmSheet()` from `$lib/confirm.svelte`, never `window.confirm`.
- Ship with `node scripts/asc-preflight.mjs` first, then `scripts/ship.sh`, never piped. An approved version closes its TestFlight train, so the marketing version must be above the live one.

## iPhone Duo

- The Duo is told apart from an iPad by the native shell, not by CSS: `HingePlugin.swift` (registered in `ViewController.swift`) reports the hinge, `src/lib/hinge.ts` sets `data-foldable` on `<html>`, and it is never cleared. WebKit on 27.2 has no viewport-segments support.
- Measured geometry (Buffy, on the simulator): folded 466×678pt; unfolded **951×669pt landscape, hinge down the middle**; the status column takes **84pt on the right** on both displays.
- Unfolded, every page uses both halves, with the fold BETWEEN columns. Two layouts in `layout.css`:
  - `.split` — the page (`.split-main`, the RIGHT half, the one you touch) beside a read-only pane (`.split-aside`, left). Today, Sessions, Tins, Catalog and the personal session form.
  - `.duo-flow` — a long page flows into two balanced columns whose gap sits on the fold. Insights, Settings, the detail pages, the cafe and tin forms.
- **The half you touch goes on the right** (the user's call, first made for Buffy). Apply it to any new two-pane layout.
- Keyed on `data-foldable` + `min-width: 860px`. `SPLIT_MIN_WIDTH` in `src/lib/split.svelte.ts` and `SPLIT_MIN` in the gate must match the CSS.
- A feature must never exist in one pose only. The tin history is the pane beside the form when unfolded and the History sheet everywhere else.
- Side safe areas are separate: `body` pads left and right by their insets, and anything `position: fixed` adds its own (tab rail, theme toggle, update prompt, the sheets).
- **Never put `env()` in an inline style.** The gate substitutes real insets into the built CSS only, so an inline one would be invisible to it.
- Gate: `npm run build && npm run verify:duo` — 13 routes × 5 poses. It is mutation-tested; if you change it, prove it still fails on a swapped pane.

## Commits

- Plain commit messages. **No `Co-Authored-By: Claude` trailers.**
- Worktree branch tracks `origin/main` but doesn't share its name; push with `git push origin HEAD:main`.

## Reference

- `docs/product-handoff.md` — original product spec (the matcha session log brief).
- `docs/design-handoff/` — Claude Design's deliverable: tokens, system, flow review, data model.
- `PROJECT_PLAN.md` — the current plan, from 1.2 onward.
- `ROADMAP.md` — the original build roadmap (May 2026). Still holds the locked design decisions; its phase 2 (sync) no longer exists.
