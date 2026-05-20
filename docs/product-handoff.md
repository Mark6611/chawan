# Chawan and Friend — Session Handoff

A personal matcha session log PWA. Sibling to the existing **Coffee Brew Log**. Two-mode product: log sessions you brewed yourself, or sessions you bought at a store. The name nods to the matcha bowl (*chawan*) and the personal-vs-store fork.

Status: **pre-build**. Architecture and product shape are decided. The design round is the next step — a Claude Design prompt is included below, ready to send.

---

## Product summary

Solo personal log of matcha sessions. Every time you drink matcha you record it. Sessions split into two kinds and share one chronological feed:

| | Personal | Store-bought |
|---|---|---|
| When | You made it at home | You bought a cup somewhere |
| Tin / source | Pulls from your tin inventory | Just record matcha's region (Yame, Uji, etc.) — no tin |
| Brewing details | Powder grams, water grams/ml, water temp, whisk type | None |
| Style | usucha / koicha / **latte** | usucha-equivalent (clear) / latte |
| Milk (if latte) | Type (cow / oat / almond / soy / coconut / other) | Same |
| Store-specific | — | Store name, price |
| Common | Rating, notes, isFavorite, sessionAt | Rating, notes, isFavorite, sessionAt |

**Tin inventory** (parallel to coffee bags): `name`, `maker`, `grade` (ceremonial / premium / culinary), `region` (enum: Uji / Nishio / Yame / Kagoshima / Shizuoka / Other), `cultivar` (optional — Yabukita / Okumidori / Samidori / etc.), `harvestDate`, `weightGrams`, `openedAt`, `archived`, `createdAt`.

**New session flow forks first**: when the user taps "+ new session", first decision is *personal or store?* — the form below changes shape accordingly.

---

## Architecture decisions (made)

1. **Separate repo** — `chawan-and-friend/` (or whatever name shakes out). Own Vercel deploy, own domain later. Treats the coffee codebase as a template to copy patterns from, not a workspace to share with. We can refactor to a monorepo later if a third app appears.
2. **Shared Supabase project** — same instance as coffee. New tables: `matcha_tins`, `matcha_sessions` (or whatever final names). Same magic-link auth, same user IDs, RLS scopes per-user as usual.
3. **Stack mirrors coffee**: SvelteKit + TypeScript + Tailwind v4 + Dexie (IndexedDB) + Zod + Supabase + @vite-pwa/sveltekit. Same local-first sync pattern.
4. **No origin flag system** — matcha is overwhelmingly from Japan; the region enum handles it cleanly. Don't port the resolve-and-flag indicator.
5. **No "ratio" or "brew time" as central metrics** — matcha brewing is "powder + water + whisk", not extraction. A derived water-to-powder ratio can show as a glance metric on the session detail page but shouldn't drive form layout.

---

## Visual identity — fresh canvas

The product owner explicitly chose **new design language**, not inheriting the coffee app's tokens. The matcha app should feel like a sibling from the same hand (typographic, restraint-first, no emoji-heavy UI) but with its own palette, type system, and mood.

Working instinct: a deeper, calmer tea-green accent rather than stereotype "vibrant matcha green"; possibly a different base paper tone. Matcha rituals are slower than espresso — the app should feel more contemplative.

The design round (prompt below) will produce the actual token spec, type pairings, and component motifs.

---

## Design prompt — ready to send to Claude Design

```
I'm building a second small PWA — a personal Matcha session log — alongside an existing Coffee Brew Log. They're separate apps sharing a Supabase backend and user account. I need a complete UX/UI design from scratch.

## Product

A solo personal log of matcha sessions. Every time I drink matcha I record it. Sessions split into two kinds:

1. **Personal** — made at home from my own tin of matcha powder. Captures: tin used, powder grams, water grams/ml, water temp, style (usucha / koicha / latte), whisk type, rating, notes.
2. **Store-bought** — bought a cup somewhere. Captures: store name, matcha region (Uji / Nishio / Yame / Kagoshima / Shizuoka / Other), style (clear / latte), price, rating, notes.

Both kinds appear in one chronological log feed.

**Latte sub-fork:** when style is "latte", capture milk type (cow / oat / almond / soy / coconut / other).

**Tin inventory** lives as a separate surface (mirrors the coffee app's bags): name, maker, grade (ceremonial / premium / culinary), region (enum, same set), optional cultivar (Yabukita / Okumidori / Samidori / etc.), harvest date, weight (grams), opened date, archived flag.

## Reference point

There's an existing sibling app (Coffee Brew Log) with a design language I value: warm dark "paper" background, copper accent, serif display + mono numerics, eyebrow-style mono uppercase metadata, restraint over decoration. I'm not asking you to copy it — I want the matcha app to have its own visual identity. But it should feel like it could come from the same hand: typographic, calm, no emoji-heavy UI, no neon.

Matcha-specific aesthetic instincts (use or override):
- Green is the obvious accent, but I'd rather not have stereotype "vibrant matcha green" everywhere. Maybe a deep tea green as accent on a different base palette.
- The serif/mono split could still work but with different families to signal "this is a different app."

## Screens you need to deliver

1. **Home / today** — current state, last session, maybe weekly stats. Equivalent to the coffee app's home.
2. **New session entry-point** — the personal-vs-store fork happens here.
3. **New personal session form** — picks tin, captures brew parameters.
4. **New store-bought session form** — captures store, region, price, etc.
5. **Sessions list** — chronological feed, both kinds intermixed, visually distinguishable at a glance.
6. **Session detail** — read view for a single logged session.
7. **Tin inventory list** — all tins, active vs archived.
8. **Tin detail** — usage history (sessions made from this tin), consumption rail.
9. **New tin / edit tin form**.
10. **Settings / account** — sign-in, sync status (the auth and sync mechanics will mirror the coffee app's).

## Design system to deliver

- Color palette tokens (paper, surface, ink shades, accent, hairline, etc.)
- Typography (display, body, mono — exact families with weights)
- Spacing scale
- Form input vocabulary
- Card and list-row patterns
- Component motifs reused across the surfaces (eyebrows, badges, the "icon + name + meta" row pattern)

## Constraints

- Mobile-first (used primarily on iPhone)
- PWA — installable, offline-first reads, dark by default (no light mode for v1)
- No origin flag system — matcha is all from Japan; the region enum handles it
- Keep brewing details simple. Matcha brewing is "powder + water + whisk", not extraction — don't try to surface "ratio" or "brew time" as central metrics. (A derived water:powder ratio is fine as a glance metric on the detail page, not a core form field.)
- The whole product should feel like a different mood from coffee — calmer, more contemplative. Matcha rituals are slower than espresso routines.

## Out of scope

- Sharing / blog / public posts
- Recommendations / AI / scoring
- Health metrics, caffeine tracking
- Social features

Deliver mockups (or precise verbal descriptions) for each screen, the token spec, and any UI motifs that would propagate across the system. I'll implement in SvelteKit + Tailwind v4 + Dexie + Supabase (the same stack as the coffee app).
```

---

## Reference: the coffee app

Lives at `/Users/kornkrankeeratitejakarn/Desktop/CODE/` (deployed at [coffee-brew-log-git-main-kornkran-s-projects.vercel.app](https://coffee-brew-log-git-main-kornkran-s-projects.vercel.app)). Use it as a *pattern source*, not a template to fork.

**Patterns worth carrying over:**
- The local-first sync layer ([src/lib/sync.ts](../CODE/src/lib/sync.ts)) — push-on-write, pull-on-sign-in, manual "Sync now". Includes the Postgres-timestamp normalization that took two sessions to find.
- The repository boundary ([src/lib/db/repository.ts](../CODE/src/lib/db/repository.ts)) — components never touch Dexie directly. Same architecture rule should apply in the matcha app.
- Zod schemas at the type layer ([src/lib/db/types.ts](../CODE/src/lib/db/types.ts)) — single source of truth for shape + runtime validation.
- Magic-link OTP auth pattern with Resend SMTP — already wired into Supabase for this project; the matcha app gets it for free since they share the project.
- The weekly backup script pattern (`scripts/export.mjs` + launchd plist) — when the matcha app is shipped, set up a sibling backup job for `matcha_tins` + `matcha_sessions`.

**Patterns to NOT carry over:**
- The origin flag system (resolveOrigin + OriginFlag + OriginInput) — irrelevant for matcha.
- The brew-method discriminated Zod union (espresso vs pour-over) — matcha has three styles but the structure is different (latte adds milk fields, store-bought skips brew details entirely). Probably needs a fresher schema design rather than copying.
- The copper-accented dark paper palette — Design will produce a new one.

**Conventions to honor (from coffee app's CLAUDE.md):**
- All DB access through `repository.ts` boundary
- Timestamps stored as ISO strings (not Date objects)
- Computed values (ratios, derived metrics) computed at read time, never stored
- No `Co-Authored-By: Claude` trailers on commits
- Worktree branch tracks `origin/main` but doesn't share its name; push with `git push origin HEAD:main`

---

## What's open / decisions still to make

- Final app name (`Chawan and Friend` is the working title — could be just "Chawan", or something else after design round)
- Domain (defer until after design ships)
- Whether to use the same auth flow (magic-link via Resend) or simplify (it's free either way, since Supabase project is shared)
- Whether to ship without auth in v1 (single-user local-only, like coffee v1) and add auth later — probably easier to do auth from day 1 since the patterns exist
- Schema column for "isPersonal vs isStore" — discriminator field name (`source`? `kind`? `origin`?), enum values
- Whether tins need a "favorite tin" concept (probably no, defer)

---

## Suggested next session flow

1. Read this handoff.
2. Send the design prompt above to Claude Design.
3. Wait for the design handoff to come back.
4. Read CLAUDE.md and project memory for the coffee app to absorb the conventions (the same conventions should govern matcha).
5. Once design lands, decide repo location: `/Users/kornkrankeeratitejakarn/Desktop/CODE/chawan-and-friend/` is the natural spot.
6. Bootstrap the SvelteKit project, copy auth/sync/repository scaffolding from coffee, adapt to the new schema.
7. Build screens in roughly the order: tin inventory → new tin form → new personal session → sessions list → session detail → home → store-bought session flow → settings.

---

## Status of the other project (Coffee Brew Log)

Active and in production. Phase 2 (Supabase sync, magic-link auth, origin flag indicator system) is shipped. Continues in a parallel session — don't touch its repo from the Chawan session unless explicitly asked.

Pending hygiene items on the coffee side (FYI, not your concern):
- Rotate Resend SMTP key (deferred)
- Rotate Supabase service role key (was pasted in chat last session)

---

End of handoff.
