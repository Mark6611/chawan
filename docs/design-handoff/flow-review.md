# Chawan · Flow review

A pass on the logging flow as currently designed — what's working, what I'd push on before you cut code. Headed with **🟢 keep**, **🟡 worth a call**, **🔴 friction worth fixing**.

---

## The five-second take

> The current flow asks the same number of taps for every session, but the population isn't uniform — most logs will be a near-repeat of the last one. A "the usual" affordance on Home would do more for daily friction than any form polish.

---

## 1. Home → CTA → fork → form → save

### 🔴 The fork screen is friction for the 80% case

You'll drink personal at home far more often than buy a cup somewhere. Forcing both through the same fork costs every personal log an extra tap.

**Recommendation.** Replace the fork with two affordances on Home:

- **Primary** — `Begin a session` opens the Personal form directly (with active tin + defaults pre-filled)
- **Secondary** — a mono link below the CTA: `or log a store-bought →`

Same total surface area; saves a tap on the common path. The dedicated fork screen can stay around for a long-press / "I'm not sure which one I want" entry but it stops being the default.

### 🟡 "The usual" pattern

When the last 1–2 sessions are near-identical (same tin, same powder, same temp), Home should surface a one-tap repeat:

```
LAST · 14h ago
"Again? · Usucha, Eiju, 2.0g · 60g · 76°C"   →
```

Tap = log an identical session right now. This is the matcha-ritual equivalent of the coffee app's "favorites" pattern but cheaper to interact with.

### 🟢 The contemplative landing surface

The big "3 bowls this week" numeric + last session card is the right opening note. Don't bury it under quick actions.

---

## 2. Personal form

### 🟡 Latte sub-fork is implied but not wired

Style segmented has `Usucha · Koicha · Latte`. When the user picks Latte, the **Milk** picker should slide in below Style (same chip pattern as Store form). The mock doesn't show this transition state — wire it.

### 🟡 Show defaults are applied

Settings has default style + temp + whisk. The form should:

- Pre-populate those values on first open
- Show a small eyebrow at the very top: `Defaults applied · tap any field to change`
- Reset the indicator if the user touches any field

Otherwise it's invisible that defaults are doing anything.

### 🟡 Active-tin auto-pick, but make change obvious

Form picks the most-recently-used active tin. The "Change" affordance is currently a small mono label in the field action slot — fine but easy to miss. Consider making the whole tin row tappable, with a chevron at the right edge to make it read as a picker.

### 🟡 "After this bowl" preview

When the user has chosen powder grams + tin, show the **post-deduction remaining**:

```
Powder · water
2.0g           60g
After this bowl: 16g remaining in Eiju · ~8 bowls left
```

Stops surprises like "wait, my tin is empty?" and gently nudges restraint.

### 🟢 The numerics are the right hero

Powder/water/temp as big mono — keep it. Resist the urge to make any of these less prominent.

### 🟡 When?

Forms default to "now". For retrospective logging (forgot to log this morning), add a small eyebrow at the top:

```
NOW · 14:32                           ← tappable
```

Tapping opens a quiet datetime picker. 99% of logs use the default; the option being there for the 1% matters.

### 🔴 Save target ambiguous

A small outlined `SAVE` pill in the top-right is understated for the primary action of the screen. Two options:

- Move Save to a full-width pill button at the bottom (thumb reach, primary affordance pattern)
- Keep the top-right pill but make it filled (tea/green) instead of outlined, so it reads as the affordance

I'd take option 1.

---

## 3. Store-bought form

### 🟢 Region + style + price + milk-when-latte is the right shape

Don't add fields. Resist the temptation to capture roast date, sweetness, temperature, etc. — the spec was clear that store-bought is meant to be casual.

### 🟡 Price input

Currently shown as a big "$ 7 . 50" display block. For actual input, use:

- A single numeric keypad that lets the user type "750" → displays "$7.50"
- Currency picker as a small affordance below (default USD, sticky)

The current mock just shows the result, not the input affordance.

### 🟡 "Where" autocomplete

If the user has been to Stonemill before, typing "St" should suggest it. Cheaper UX than re-typing the name every time + keeps the store name consistent across sessions (no `Stonemill Matcha` vs `Stonemill Matcha Co.`).

---

## 4. Sessions list

### 🟢 Distinct row templates are the right call

Personal leads with style + brew; store leads with store name + region. Visually distinguishable at a glance, both readable.

### 🟡 Day grouping vs infinite scroll

`Tuesday · 20 May` headers are nice for sparse logs. For dense ones, consider:

- Sticky day headers that pin while scrolling
- A vertical month-scrubber on the right edge for jumping back

Phase 1 don't bother. Phase 2 maybe.

### 🟡 Filter rail

`All · Personal · Store-bought` is fine. Don't add more (favorites, by-tin, by-region) until you find yourself wanting them. Most personal logs won't use any filter — keep it minimal.

---

## 5. Tin detail

### 🟢 Consumption rail is the central visual

Horizontal rail with per-session ticks is right. Don't replace it with a 3D tin illustration or anything cute.

### 🟡 "Opened X days ago" → freshness

Coffee app has a freshness signal (within roast window). Matcha has the same property — opened tins oxidize quickly. Consider adding:

```
OPENED 12 MAY · 8 DAYS
●●○○○   "Open recently"      // green dot if <14 days
● Out of window              // amber/red after ~21 days
```

Small ambient signal, no nag.

### 🟡 The "From this tin" history

The session list under the tin should jump directly to session detail on tap. Currently the rows look passive — add a faint chevron or change the row affordance so it reads as tappable.

---

## 6. Tin form

### 🟢 Fields are right

Name, maker, grade, region, cultivar (optional), harvest date, weight, opened date. No surprises.

### 🟡 Cultivar as fuzzy chips, not freeform text

You listed Yabukita / Okumidori / Samidori as common cultivars. Render them as chips like region, with an "Other (text)" escape hatch. Cuts typos, surfaces what you tend to drink.

### 🟡 Harvest date doesn't need a calendar

Matcha is sold by season/year. A two-field row (`May` `2024`) or just (`2024 · 1st pluck`) is enough. A full date picker is overkill.

---

## 7. Settings

### 🟢 Sync indicator pattern matches the coffee app

Status dot + "Up to date" + last-sync time. Don't deviate.

### 🟡 Defaults section is in the right place

`Default style`, `Default water temp`, `Default whisk` are the three that matter. Don't add more (e.g., default tin) — auto-pick is better than a Setting.

---

## Cross-cutting

### 🔴 Quick-log gesture

After all the above, **the single highest-leverage interaction to add is**:

> A long-press on the Home CTA — or a swipe from Home — that immediately logs "the usual" without opening the form at all. Drink, log, done. The form is the slow path; this is the contemplative-but-not-slow path.

### 🟡 Empty states

You haven't drawn empty states. Worth one mockup each:

- Home with zero sessions: large display "Your first bowl." + CTA
- Sessions list empty: a chawan glyph + "No sessions yet"
- Tins list empty: "Add your first tin"

### 🟡 Editing past sessions

Session detail has Edit. Confirm:

- Edit lets you change every field, including timestamp + tin
- If the user changes which tin a personal session was made from, the system re-deducts grams from the new tin and credits the old one
- Past sessions show "edited X ago" if modified

---

## Recommendation priority

If you only do three things from this list:

1. **Skip the fork screen.** Two affordances on Home, primary → Personal.
2. **Wire the latte sub-fork.** Style = Latte → Milk picker appears.
3. **"Again?" CTA on Home.** Repeat the last session in one tap.

Everything else is polish.
