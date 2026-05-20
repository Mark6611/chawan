# Chawan · design system

The complete token spec, component vocabulary, and motif inventory.
Read alongside `tokens.css` (drop-in Tailwind v4 theme) and
`design-reference.html` (the live mockups).

---

## 1. Voice

Chawan is **a calm, contemplative log for matcha sessions**. The visual
voice favours typographic restraint over decoration. Italic oldstyle serif
display, monospace metadata, big mono numerics, hairline structure. The
chawan glyph (concentric rings, seen-from-above bowl) is the single
recurring graphic — used quietly and at small size.

Sibling to the Coffee Brew Log: same hand (paper backgrounds, hairlines,
mono eyebrows, serif display), different family (oldstyle vs upright,
tea green vs copper, italic primary vs upright primary).

---

## 2. Color

### Night (default theme)

Deep earth-dark base with a barely-perceptible green undertone. Warm
off-white ink scale. A single tea-green accent.

| Token            | Value                              | Use                                            |
| ---------------- | ---------------------------------- | ---------------------------------------------- |
| `--color-paper`  | `oklch(0.175 0.006 145)`           | App base background                            |
| `--color-surface`| `oklch(0.205 0.008 145)`           | Raised surface (form fields, tiles)            |
| `--color-card`   | `oklch(0.235 0.008 145)`           | Cards / hero blocks                            |
| `--color-ink`    | `oklch(0.94 0.01 95)`              | Primary text                                   |
| `--color-ink-70` | `oklch(0.74 0.01 95)`              | Secondary text                                 |
| `--color-muted`  | `oklch(0.55 0.01 95)`              | Labels, eyebrows                               |
| `--color-faint`  | `oklch(0.38 0.01 95)`              | Lowest-emphasis text                           |
| `--color-hairline`| `rgba(225,230,220,0.09)`           | 0.5px structural lines                         |
| `--color-rule`   | `rgba(225,230,220,0.18)`           | Heavier section separators                     |
| `--color-tea`    | `oklch(0.62 0.09 152)`             | Selection outlines, primary CTA fill           |
| `--color-tea-wash`| `oklch(0.62 0.09 152 / 0.10)`      | Selected chip background                       |
| `--color-on-tea` | `#0e1310`                          | Text on tea-filled button                      |
| `--color-data`   | `oklch(0.62 0.09 152)` (= tea)     | Numerics, consumption rails, accent text       |

### Day (opt-in via `[data-theme="day"]`)

**Wood + white + black + minimal green.** Pale-oak paper, white cards,
near-black ink. Green reserved for button fills and selection outlines
only — `--color-data` drops to ink so numerics and rails read as
black-on-wood.

| Token            | Value                              | Use                                            |
| ---------------- | ---------------------------------- | ---------------------------------------------- |
| `--color-paper`  | `oklch(0.905 0.022 78)`            | Warm pale-oak wood                             |
| `--color-surface`| `oklch(0.945 0.018 78)`            | Lighter wood                                   |
| `--color-card`   | `#ffffff`                          | Pure white for raised content                  |
| `--color-ink`    | `oklch(0.18 0.010 70)`             | Near-black warm                                |
| `--color-ink-70` | `oklch(0.42 0.012 75)`             |                                                |
| `--color-muted`  | `oklch(0.58 0.010 75)`             |                                                |
| `--color-faint`  | `oklch(0.74 0.008 75)`             |                                                |
| `--color-hairline`| `rgba(60,40,15,0.13)`              |                                                |
| `--color-tea`    | `oklch(0.45 0.10 152)`             | Darker so it reads on wood                     |
| `--color-tea-wash`| `oklch(0.45 0.10 152 / 0.08)`     |                                                |
| `--color-on-tea` | `#ffffff`                          | White text on tea button (contrast)            |
| `--color-data`   | `oklch(0.18 0.010 70)` (= ink)     | **Numerics drop to ink in day mode**           |

### Where the accent goes — and doesn't

**Green (`--color-tea`) is allowed on:**
- Primary CTA button (filled tea)
- Selection outlines: segmented active, region chips, milk chips, whisk tiles
- Selection indicator dots (the 4×4px marker inside a selected segment)
- Save/Add button outlines
- Form input cursor blink

**Green (`--color-tea`) is NOT used on:**
- Numerics — use `--color-data` instead (ink in day, tea in night)
- Rating dots — use `--color-data`
- Consumption rails — use `--color-data`
- Eyebrows — use `--color-muted` normally; `--color-data` for accent
- The chawan glyph filled state — use `--color-data`

---

## 3. Typography

### Stack

```css
--font-display: 'Cormorant Garamond', 'EB Garamond', Georgia, serif;
--font-body:    'EB Garamond', Georgia, serif;
--font-mono:    'IBM Plex Mono', ui-monospace, monospace;
```

All three loaded from Google Fonts. **Different from the coffee app on
purpose** — coffee uses Newsreader + Geist + Geist Mono; Chawan signals
"different family" by switching to oldstyle Garamond + classical serif
body + the more architectural Plex Mono.

### Scale

| Role                       | Family   | Size  | Weight | Style          | Notes                                  |
| -------------------------- | -------- | ----- | ------ | -------------- | -------------------------------------- |
| **Display XL (hero)**      | display  | 42px  | 400    | italic         | Tin detail, Session detail headlines   |
| **Display L (h1)**         | display  | 34–36px| 400   | italic / upright | Today, screen titles                  |
| **Display M (h2)**         | display  | 26–28px| 400   | italic         | Card titles, modal prompts             |
| **Display S (h3)**         | display  | 18–22px| 400   | upright        | Row titles, tin names                  |
| **Body**                   | body     | 16px  | 400    | regular        | Default paragraph                      |
| **Body italic (notes)**    | body     | 14–16px| 400   | italic         | Session notes, contemplative captions  |
| **Mono numeric XL**        | mono     | 36–64px| 300   | tabular-nums   | Big numerals (e.g. "3 bowls", "76°C")  |
| **Mono numeric L**         | mono     | 22–32px| 300–400| tabular-nums  | Detail stats (powder, water, ratio)    |
| **Mono numeric M**         | mono     | 15–18px| 400    | tabular-nums   | Row metrics (grams remaining)          |
| **Mono meta**              | mono     | 11–13px| 400    | regular        | Inline meta (Marukyu Kōyamaen · Uji)   |
| **Eyebrow**                | mono     | 10.5px | 500   | uppercase, 0.14em | Section labels, metadata               |
| **Eyebrow micro**          | mono     | 9–10px | 500   | uppercase, 0.16–0.20em | Section heads, faint labels    |

### The eyebrow pattern

Used everywhere as the structural label. **Always:** monospace, uppercase,
~10.5px, weight 500, letter-spacing 0.14em, color `--color-muted`. Coffee
uses identical spec; keep them aligned.

```html
<div class="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
	Mon 19 May · 07:55 · Personal
</div>
```

A `<Eyebrow>` component (see `file-structure.md`) wraps this so it's
written once and reused.

---

## 4. Spacing

The design board uses a Fibonacci-ish scale: **4 · 8 · 12 · 16 · 20 · 24 ·
32 · 40 · 56 · 72**. Tailwind's defaults cover all of these (`gap-1` …
`gap-18`).

- **Screen horizontal padding**: 24px (`px-6`)
- **Field vertical rhythm**: 14px above + 14px below
- **Section margin**: 28px (uses `Hairline` with `my-7` around it)
- **Between display elements + numeric block**: 18–22px

---

## 5. Components / motifs

### The eyebrow + display + meta triad

The most-repeated layout pattern across the app:

```
EYEBROW (mono, uppercase)
Display heading (italic serif)
mono meta · separators
```

Appears on the home "Last session" block, session rows, session detail,
tin detail, the forks. Lock this triad as a component, not a per-page
hand-roll.

### Hairlines as structure

0.5px lines at 9–13% ink alpha do the work of borders, dividers, and the
"frame" around field groups. **Do not** use heavier strokes or coloured
borders for emphasis. The whole grid is held together by hairlines.

### Big mono numerics

When showing brew parameters, the **numeral** is the hero. Pair a
`size 22–36 mono` with a much smaller `mono 11 var(--color-muted)` unit
below. Never make the unit competitive in size with the value.

```
POWDER
2.0  g          ← 22–36px / 11px
```

### Hairline rail (consumption)

A 2px-tall track of `--color-hairline` with a fill of `--color-data`.
Used on Home (currently-drinking tin), Tins list (per row), Tin detail
(with per-session tick marks above the rail).

### The Chawan glyph

Three concentric circles (radii 11, 8, 4.5 of 24). Either ring-only or
"filled" — the inner ring at 0.85 alpha of `--color-data`. Used at sizes
**18 · 22 · 28 · 48 · 72** depending on context. Disable globally via
`html.no-chawan .chawan-glyph { display: none }` if the user opts out.

### Segmented control

Hairline top + bottom, hairline dividers between options. Selected
option: `--color-tea` text + a 4×4 dot indicator before the label. No
background fill (the dot is the indicator).

### Chip group

For region + milk pickers + cultivar suggestions. `border-radius: 999px`,
0.5px hairline border, 6×11 padding, mono 11px text. Selected: tea border,
tea text, tea-wash background.

### Primary button

Full-width, 999 radius, tea fill, on-tea text colour, padding 15×20,
mono 11.5 letter-spacing 0.10em uppercase. Variants: `kind="tea"`,
`kind="line"` (hairline outline), `kind="ghost"`.

### Save / Add affordance

Small pill in the screen header's action slot — 4×12 padding, hairline-
size border, tea-coloured. Use this for header CTAs (Save, Add). For
primary save on long forms, **also** add a full-width PrimaryButton at
the bottom of the form (thumb reach) — see flow-review.md §2.

---

## 6. Iconography

Hand-drawn 24×24 line icons at `stroke-width: 1.4`. Library is
**not** imported — every icon lives in `src/lib/components/icons/` as a
tiny Svelte file. Set:

- **Today** — circle + dot in centre
- **Sessions** — 3 horizontal lines
- **Tins** — tin shape (lid + body)
- **Settings** — gear or sliders (pick one and commit)
- **Plus** — `M9 3v12 M3 9h12`
- **Chevron** — `M1 1l8 7-8 7`
- **Back chevron** — same, flipped

When you can use a typographic affordance (mono "BACK", "EDIT") instead
of an icon, prefer that.

---

## 7. Tailwind cheat-sheet

After dropping in `tokens.css`, the most common patterns:

```html
<!-- Eyebrow -->
<div class="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">…</div>

<!-- Display heading, italic -->
<h1 class="font-display text-[34px] italic leading-[1.05] tracking-[-0.015em] text-ink">Today</h1>

<!-- Mono numeric -->
<span class="font-mono text-[22px] font-normal tabular-nums text-ink">2.0</span>
<span class="font-mono text-[11px] text-muted">g</span>

<!-- Hairline -->
<div class="h-px bg-hairline"></div>

<!-- Field row (inside a form) -->
<div class="border-b-[0.5px] border-hairline py-[14px] flex flex-col gap-2">
	<div class="eyebrow">Powder</div>
	<div>…</div>
</div>

<!-- Primary button -->
<button class="bg-tea text-on-tea rounded-full px-5 py-4
              font-mono text-[11.5px] font-medium uppercase tracking-[0.10em]">
	Begin a session
</button>
```
