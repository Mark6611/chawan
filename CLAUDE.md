# Project conventions

## Architecture

- All database access goes through `src/lib/db/repository.ts`.
- Components never import the Dexie `db` instance directly.
- Reason: Phase 2 swaps the implementation to Supabase. The repository interface stays. Preserve this boundary.

## Data model

- Sessions are a **discriminated union** on `kind: 'personal' | 'store'`. Narrow via `isPersonal` / `isStore` from `db/types.ts` before reading kind-specific fields.
- `cultivar` is a free-form string with curated chip suggestions (not an enum) — tea varieties vary widely.
- All timestamps (`brewedAt`, `openedAt`, `harvestDate`, `createdAt`, `updatedAt`) are ISO strings, not `Date` objects.
- Money is stored as integer cents (`priceCents`), never floats.
- Computed values (water:powder ratio, tin remaining grams, freshness window, "Again?" suggestion) are derived at read time, never stored.

## Scope discipline

- **Phase 1** — solo, local-only (IndexedDB via Dexie). No auth, no backend. Settings shows sync status as a stub.
- **Phase 2** — Supabase (shared with coffee), magic-link auth via Resend, push-on-write sync.
- Do not add Phase 2 features into Phase 1 code "to save time later."

## Visual identity

- Two themes: `day` (default) and `night`. No `system` mode in v1.
- Theme persists in `localStorage` under key `chawan:theme`.
- Fonts self-hosted via Fontsource: Cormorant Garamond (display, italic primary), EB Garamond (body), IBM Plex Mono (mono). Deliberate divergence from the design handoff's Google Fonts link — keeps the PWA offline-first.
- Tea green (`--color-tea`) is for primary CTA fills, selection outlines, selection dots. Numerics + rails use `--color-data`, which drops to ink in day mode.

## Commits

- Plain commit messages. **No `Co-Authored-By: Claude` trailers.**
- Worktree branch tracks `origin/main` but doesn't share its name; push with `git push origin HEAD:main`.

## Reference

- `docs/product-handoff.md` — original product spec (the matcha session log brief).
- `docs/design-handoff/` — Claude Design's deliverable: tokens, system, flow review, data model.
- `ROADMAP.md` — the session-by-session plan to production. North star.
