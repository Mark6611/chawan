# Chawan · Phase 4 — Insights + Share card — design brief

Two new surfaces on top of the shipped Phase 1–3 app:

1. **Insights** — a reflective surface that surfaces patterns from the
   sessions + tins you've already logged. The data all exists in the
   repository today; nothing is captured for it. Its hero visualization
   is your own **palate map** — your tins plotted on the catalog flavor
   chart, showing where your taste clusters.
2. **Share card** — export a session (or a stat, or your palate map) as
   an image you can save or share.

Status: **pre-build**. The app is live in production (SvelteKit + Dexie
+ Supabase sync + catalog). This is Phase 4. Read alongside
`../docs/catalog_design_brief.md` and the original chawan handoff
(`~/Downloads/handoff 3/`).

---

## ⚠️ Deliberate scope reversal — read first

The original chawan brief listed **"Sharing / blog / public posts" and
"Social features" as explicitly out of scope.** The share card is a
*conscious, narrow reversal* of that — documented here so it's a decision
on the record, not a silent drift.

**What the reversal IS:** the ability to generate a single image artifact
(PNG) the user can save to Photos / AirDrop / paste into a message
themselves. A local, user-initiated export.

**What it is NOT (still firmly out of scope):** feeds, profiles, follows,
public hosted pages, share *links*, comments, likes, discovery, any
server-rendered or server-hosted social surface. No account is ever
visible to anyone else. The card is a file, not a network.

If the product owner decides on reflection to keep chawan fully private,
**drop the share card from this brief** — Insights stands alone and is
the larger, higher-value surface regardless.

---

## Architecture decisions (made — don't relitigate)

1. **Insights computed at read time, no stored aggregates, no new table.**
   Matches the standing convention ("computed values derived at read
   time, never stored"). A new pure-functional `src/lib/insights/
   compute.ts` (unit-tested like `sessions/compute.ts` + `again.ts`)
   derives every metric from `repository.listSessions()` +
   `listTins()`. No Supabase schema change.

2. **`/insights` is a new route** in the bottom LinkRail's reach (it may
   replace or sit beside "Today" — see open questions). All data pulled
   through the repository; re-fetches on `syncState.tick` like every
   other read surface.

3. **The palate map reuses `FlavorChart`** with its existing `ownedIds`
   prop — no new chart component. The catalog already marks owned
   products; Insights presents the owned set as the primary content
   rather than an overlay.

4. **Share card renders client-side.** Compose as SVG/DOM, rasterize to
   PNG via canvas (or `html-to-image`-style approach), then hand to the
   Web Share API / download. **No image is uploaded or stored anywhere** —
   it's generated on-device, on demand, and discarded.

5. **No goals, targets, streaks-as-pressure, badges, or AI
   recommendations.** These are the gamification traps that would break
   the contemplative voice. Insights reflects; it does not nag, score,
   or coach. (Recommendations / AI were out of scope in the original
   brief and stay out.)

6. **Graceful low-data states are mandatory.** A user with 0–2 sessions
   must see calm "not enough yet — keep logging" states, never a broken
   or empty dashboard. Design must draw these.

---

## Insights — what data exists to draw on

Everything below is already in the schema. The Design challenge is
**curation and restraint** — which of these earn a place, and how to
show them as a calm reflective page rather than a metrics dashboard.

**Consumption rhythm**
- Bowls over time (rolling week / month / all-time)
- Busiest day-of-week, typical time-of-day
- Lifetime total bowls; total grams of matcha consumed

**Tins**
- Most-used tin; fastest-consumed tin
- Average grams per bowl; your typical water:powder ratio
- Active vs archived count; catalog coverage ("tried 6 of 20 cataloged")

**Ratings**
- Distribution across the half-star scale
- Average rating by tin / by style / by cafe
- Highest-rated sessions

**Brew habits (personal sessions)**
- Average powder / water / temperature
- Whisk preference; style split (usucha / koicha / latte %)

**Cafe sessions**
- Total spend; spend over time; average cup price
- Most-visited cafe; price by region (show source currency, no conversion
  — consistent with the catalog decision)

**Palate map (the hero)**
- Your tins (those linked to a catalog entry via `Tin.catalogId`, or
  with their own taste coords) plotted on the flavor chart
- Shows where your taste clusters — sharp/mild × refreshing/full-body
- "You drink mostly mild + full-body" as a derived one-liner

---

## Share card — scope + craft

- **What can be shared:** a single session card (the brew + rating +
  notes, beautifully set), a stat card (e.g. "32 bowls this season"), or
  the palate map. Design decides which are worth supporting for v1 — one
  format done well beats three done thinly.
- **Privacy on the card:** never the user's email or any account
  identifier. Cafe names + notes are user content and fine to include
  (the user chose to share). A small "Chawan" wordmark/glyph as quiet
  attribution.
- **Format:** mobile-share-friendly aspect (square 1080×1080 and/or
  story 1080×1920). Renders in the chawan visual language — paper
  background, italic display, hairlines, the chawan glyph.
- **Generation:** client-side rasterization, Web Share API on iOS
  (falls back to download). No server.

---

## Visual identity — extend, don't fork

Same locked system as Phases 1–3: day default (wood + white + ink +
minimal tea green), italic Cormorant Garamond display, EB Garamond body,
IBM Plex Mono numerics, eyebrows, hairlines-as-structure, the chawan
glyph as the single recurring graphic, tea green reserved for
selection/CTA. **No new fonts, no new base colors.** Big-mono numerics
are the established way to show a number — lean on them for the stats.

The one fresh challenge: how does a *reflective data surface* look in
this typographic, restraint-first language without becoming either (a) a
cold analytics dashboard or (b) a gamified scoreboard? That's the core
design question.

---

## Design prompt — ready to send to Claude Design

```
I'm adding Phase 4 to Chawan, a personal matcha-session log (SvelteKit
PWA, shipped through Phase 3 — local-first Dexie, Supabase sync, a
catalog with a 2-axis flavor chart). The existing design system is
locked; see ~/Downloads/handoff 3/ (design-system.md, tokens.css) and
the catalog handoff. Day default (wood + white + ink + minimal tea
green), italic Cormorant Garamond, eyebrows, hairlines, the chawan
glyph. Extend it — don't reinvent.

## Two new surfaces

### 1. Insights (the anchor)
A calm, reflective page surfacing patterns from sessions + tins the
user has already logged — NOT a dashboard, NOT gamified. No goals,
streaks-as-pressure, badges, scores, or coaching. The mood is
"a quiet look back," like flipping through a journal, not a fitness app.

Data available (all already logged): bowls over time, busiest
day/time, lifetime totals, most-used + fastest-consumed tins, average
grams/ratio/temp, whisk + style preferences, rating distribution and
averages, cafe spend over time + average price + most-visited cafe,
and catalog coverage.

Its hero visualization is the user's PALATE MAP: their tins plotted on
the existing catalog flavor chart (sharp↔mild × refreshing↔full-body),
showing where their taste clusters, with a derived one-liner like "you
drink mostly mild + full-body." Reuse the existing FlavorChart
component.

The hard part is curation + restraint: which metrics earn a place, and
how to set them in a typographic, hairline, big-mono-numeric language
without it reading as analytics. Also: low-data states (0–2 sessions)
must feel calm and intentional, never broken.

Time windows: propose a set (week / month / all-time?) and where the
toggle lives.

### 2. Share card (secondary)
Export a session, a stat, or the palate map as an IMAGE (PNG) the user
saves/AirDrops/pastes themselves. NOT a social feature — no feed, no
hosted link, no profile. Just a beautiful local artifact in the chawan
visual language. Mobile-share aspect (square and/or story). Carries a
quiet "Chawan" wordmark; never shows the user's email/account.

## Screens to deliver
1. Insights — full page, normal-data state
2. Insights — low-data / empty state
3. The palate-map section in detail (it's the hero)
4. Share card — at least the session-card format; the stat + palate
   formats if they earn it
5. The share affordance — where the "share" action lives on a session
   detail / insights surface, and the iOS share-sheet handoff moment

## Constraints
- Mobile-first, installed-PWA primary
- Extends the existing system — no new fonts/base colors
- Reflective, not gamified — this is the whole voice risk
- Show source currency (¥/$) on spend, no conversion
- Client-side image generation only; nothing uploaded

## Out of scope
- Comparison to other users; any multi-user surface
- AI / recommendations / "you might like"
- Goals, targets, reminders, notifications
- Health / caffeine tracking
- Hosted share links, feeds, profiles, follows, comments

Deliver mockups (or precise verbal descriptions) for each screen, any
new motif the insights page needs, and the share-card layout(s). I'll
implement in SvelteKit + Tailwind v4.
```

---

## Open questions for Design

1. **`/insights` vs `/today`** — Home already shows bowls-this-week + last
   session + tin-in-use. Does Insights replace Home, sit beside it as a
   6th tab (the LinkRail is already at 5), or get reached from a link on
   Home? The LinkRail is getting crowded — a real IA question.
2. **Time-window control** — week / month / all-time, or season-based
   (matcha is seasonal)? Where does the toggle live and does it persist
   in URL like the catalog view toggle?
3. **Palate-map plotting** — only tins linked to a catalog entry have
   taste coords. Manually-created tins (no `catalogId`) can't be
   plotted. Same not-plotted problem as the catalog. Best treatment:
   a count ("4 of your 7 tins are mapped") + the unmapped ones listed?
4. **Share card formats** — one (session) or three (session / stat /
   palate)? Recommend the minimal set that's genuinely worth it.
5. **Where "share" lives** — a share action on session detail? On
   Insights? Both? Don't scatter it.

---

## Build sequence after Design lands (~3 sessions)

| Session | Goal |
| ------- | ---- |
| **Warm-up** | Close the 3 loose ends: confirm Supabase migrations 0003 + 0004, guard `/dev/*` routes out of production, trim font subsets to latin. |
| **19** | `src/lib/insights/compute.ts` (pure, fully unit-tested) + `/insights` route, normal + low-data states, palate map via FlavorChart. |
| **20** | Share card — client-side PNG generation, Web Share API + download fallback, the share affordance. |

---

End of brief.
