# Chawan · Share card — design brief

A single new capability: **export a logged session (or a stat, or the
palate map) as an image** the user saves / AirDrops / pastes themselves.

Status: **pre-build, Design-first.** Everything else is shipped and live —
Phases 1–3 (logging, sync, catalog + flavor chart) and Phase 4's Insights
page. This brief is the **share-card-only** Design ask; it supersedes the
share-card section of `insights_design_brief.md` (Insights was built
without a Design round).

---

## ⚠️ Deliberate scope reversal — the philosophy

The original chawan brief listed "Sharing / blog / public posts" and
"Social features" as **explicitly out of scope.** The share card is a
*conscious, narrow* reversal — recorded so it's a decision, not a drift.

**The line:** a share card is **a file, not a network.** It's a local PNG
the user generates on-device and shares through the OS share sheet
(Messages, AirDrop, Photos, wherever). There is **no** feed, profile,
follow, comment, like, hosted page, or share *link*. Nothing leaves the
device except the image the user explicitly hands off. Design should hold
this line: the card is a beautiful artifact, not an on-ramp to social
features.

---

## What can go on a card — pick the minimal worthwhile set

The app has three things genuinely worth sharing. **Design's first job is
to decide which earn a card for v1** — one done beautifully beats three
done thinly. My leanings noted, but it's your call:

1. **Session card** *(likely the core)* — a single logged session.
   - Personal: tin name + maker, style, powder / water / temp (the
     big-mono brew block), water:powder ratio, rating, notes, date.
   - Cafe: cafe name, region, style, price, rating, notes, date.
2. **Palate card** *(distinctive second)* — the user's FlavorChart with
   their tins plotted + the derived phrase ("Mostly mild + full-body").
   Already exists as a component; rasterizes cleanly (it's SVG).
3. **Stat card** *(nice-to-have)* — e.g. "32 bowls this season" or a
   week/month rhythm number. Risk: closest to the gamification the rest
   of the app avoids — handle with the same restraint as Insights.

---

## Format

- **Aspect ratio**: square 1080×1080 (most versatile — feed, Messages,
  anywhere) and/or story 1080×1920. Recommend starting with **square**;
  add story only if it earns it.
- **Resolution**: spec at 1080px (or @1x with a 2–3× scale factor noted),
  since it renders to a fixed-pixel canvas.
- **Quiet attribution**: a small "Chawan" wordmark or the chawan glyph in
  a corner. Not a watermark splash — a maker's mark.

---

## Visual language — extend chawan, and lean flat

Same locked system: day-default palette (wood + white + ink + minimal tea
green) or the night deep-earth — **Design decides whether the card is
fixed to one treatment** (a card looks more intentional with a consistent
look regardless of the user's current theme; the dark/night treatment
tends to photograph richer) **or follows the user's active theme.** Italic
Cormorant Garamond display, EB Garamond body, IBM Plex Mono numerics, the
chawan glyph, hairlines, big-mono numerics for any figure.

**Lean flat + typographic** — which is the chawan voice anyway, so this is
alignment not compromise. See the technical constraint below: heavy
effects (blur, blend modes, layered gradients, soft shadows) are
expensive/fragile to render to canvas. A card that's type + hairlines +
the glyph + flat fills is both on-voice and clean to implement.

---

## Technical constraints Design must respect

The card renders **client-side to a PNG** (no server). I'll handle the
rendering — likely drawing directly to a `<canvas>` after
`document.fonts.ready` so the custom fonts come out accurate. For that to
be faithful to the mockup, the design should:

- Be expressible as **text + simple shapes + flat fills + the chawan
  glyph + (optionally) the flavor chart**. All of that rasterizes cleanly.
- **Avoid** blur, mix-blend-mode, multi-stop gradients, soft drop
  shadows, backdrop filters — each is a canvas-rendering headache and
  none are in the chawan voice anyway.
- Specify exact positions / sizes at the target resolution (a layout
  grid for 1080×1080), since canvas drawing is imperative — "centered,
  72px from top" beats "roughly up here."

---

## Privacy

- **Never** the user's email or any account identifier on the card.
- Cafe names + session notes are user content — fine to include (the user
  chose to share this session).
- No precise timestamps beyond the date unless the user's content implies
  it; a date like "20 May 2026" is enough, no need for "14:32".

---

## Design prompt — ready to send to Claude Design

```
I'm adding a share-card export to Chawan, a personal matcha-session log
(SvelteKit PWA, fully shipped — logging, Supabase sync, a catalog with a
2-axis flavor chart, and an Insights page). The design system is locked;
see ~/Downloads/handoff 3/ (design-system.md, tokens.css) + the catalog
handoff. Day-default palette (wood + white + ink + minimal tea green) or
the night deep-earth alt; italic Cormorant Garamond, EB Garamond body,
IBM Plex Mono numerics, hairlines, the chawan glyph (concentric bowl).
Extend it — don't reinvent.

## The capability
Export a logged session (or a stat, or the user's palate map) as a PNG
the user saves / AirDrops / pastes themselves. It is a FILE, not a
network — no feed, profile, link, or hosted page. A beautiful local
artifact, full stop. (This is a deliberate, narrow reversal of the
original "no social" rule; hold the line at "a file.")

## Decide the minimal set
Three candidates — pick which earn a card for v1 (one done beautifully >
three done thinly):
1. Session card — one logged session. Personal: tin + maker, style,
   powder/water/temp big-mono block, ratio, rating, notes, date. Cafe:
   cafe name, region, style, price, rating, notes, date.
2. Palate card — the user's flavor chart (tins plotted) + derived phrase
   ("Mostly mild + full-body"). Reuses the existing FlavorChart.
3. Stat card — e.g. "32 bowls this season." Closest to gamification the
   app otherwise avoids; restraint.

## Format
Square 1080×1080 (recommend starting here), optionally story 1080×1920.
Quiet "Chawan" maker's mark in a corner. Decide whether the card is fixed
to one theme (more intentional; night photographs richer) or follows the
user's active theme.

## Hard technical constraint
Renders client-side to a canvas → PNG. Design must be expressible as
text + flat fills + simple shapes + the chawan glyph + (optionally) the
flavor chart. AVOID blur, blend modes, multi-stop gradients, soft
shadows — fragile to canvas-render and off-voice anyway. Spec exact
positions/sizes on a 1080px grid (canvas drawing is imperative).

## Privacy
Never the user's email/account. Cafe names + notes are fine (user chose
to share). Date only, no precise time needed.

## Screens to deliver
1. The card itself — at least the session format (personal + cafe
   variants), plus palate and/or stat if they earn it. Specced on a
   1080×1080 grid.
2. The share affordance — where the "share" action lives (session detail?
   insights? both — but don't scatter it) and the iOS share-sheet
   handoff moment.
3. Empty/edge cases — a session with no notes, no rating, no price.

## Out of scope
Feeds, profiles, follows, comments, likes, hosted share links/pages,
discovery, any multi-user surface. Just the local image.

Deliver the card layout(s) on a precise pixel grid, the share affordance
placement, and edge-case handling. I'll implement the canvas rendering
in SvelteKit.
```

---

## Open questions for Design

1. **Which formats earn v1** — session only, or session + palate? (Stat
   card is the most skippable.)
2. **Fixed theme vs follows-active** — a card consistent across users
   reads more intentional, but following the user's theme is more
   personal. Lean: fixed night treatment for richness; confirm.
3. **Where the share action lives** — session detail is the obvious home
   (share *this* session). Does Insights also get a "share my palate"
   action? Don't scatter share buttons across the app.
4. **Square only, or square + story** — start square; story later if
   wanted.

---

## Build slot (after Design lands)

**Session 20** — implement the card(s) via direct-canvas rendering
(`document.fonts.ready` → draw text + shapes + glyph + optional chart),
Web Share API with a download fallback, and the share affordance per
Design's placement. No new dependency unless Design's layout genuinely
needs one.

---

End of brief.
