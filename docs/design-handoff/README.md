# Chawan · design handoff

A solo personal log of matcha sessions. Sibling to the Coffee Brew Log —
same hand, different family. Mobile-first PWA, offline-first reads, dark
by default with a day theme available.

## What's in this package

| File                        | What it is                                                              |
| --------------------------- | ----------------------------------------------------------------------- |
| `design-reference.html`     | Self-contained design board (10 screens + design system + day/night reference). Open in a browser. |
| `design-system.md`          | The complete token spec, type scale, components, and Tailwind cheat-sheet. |
| `tokens.css`                | Drop-in Tailwind v4 `@theme` block. Replace `src/routes/layout.css` with this. |
| `data-model.ts`             | TypeScript types (`Tin`, `Session`, enums) + derived-value helpers. Drop into `src/lib/db/types.ts`. |
| `file-structure.md`         | Proposed SvelteKit folder layout. Mirrors the coffee app's conventions. |
| `flow-review.md`            | UX/flow critique of the logging path. Read this before cutting code.    |

---

## Where to start

1. **Open `design-reference.html`** in a browser. Pan/zoom the canvas;
	 click any artboard's expand button to see it fullscreen. The Tweaks
	 panel (bottom-right toolbar in omelette, or visible by default in the
	 download) lets you flip the global theme.

2. **Read `flow-review.md`**. There are 3 friction points worth fixing
	 before you implement anything — flagged in priority order at the bottom.

3. **Drop in `tokens.css`** and add the Google Fonts:

	 ```html
	 <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=EB+Garamond:ital,wght@0,400;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap" />
	 ```

4. **Stand up the structure** from `file-structure.md`. Repository
	 boundary first (so components never import Dexie directly). Then
	 atoms (`Eyebrow`, `Display`, `Mono`, `Chawan`, `Hairline`) before
	 composing rows and screens.

5. **Build screens in this order** (cheapest dependency chain):

	 1. Home — uses the most components but no forms; gets the visual
			vocabulary into your hands fast
	 2. Tin list + tin detail — exercises the consumption rail
	 3. New tin form — exercises the form field vocabulary
	 4. Personal session form — wires defaults + tin picker + the latte
			sub-fork
	 5. Store-bought form — straight port of Personal's vocabulary
	 6. Sessions list + session detail — pure read views
	 7. Settings — last, mostly chrome you already have from the coffee app

---

## Theme

Night is the default — pure dark with a deep tea-green accent. Day is
**wood paper + white cards + near-black ink** with green pulled back to
button fills and selection outlines only.

Toggle via `<html data-theme="day">` or `<html data-theme="night">`. The
boot script pattern (the same one the coffee app uses, in
`src/app.html`) reads the user's preference from `localStorage` and sets
the attribute before paint:

```html
<script>
	(() => {
		try {
			const t = localStorage.getItem('chawan:theme') ?? 'night';
			document.documentElement.setAttribute('data-theme', t);
		} catch {}
	})();
</script>
```

Defaulting to `'night'` (not `'system'`) matches the brief: dark by
default for v1.

---

## Compatibility with the coffee app

Where the two apps share patterns intentionally:

- **Eyebrow** — same monospace 10.5px / 0.14em / uppercase / muted spec.
	Lift `Eyebrow.svelte` directly from the coffee app.
- **Repository boundary** — same. Components never import Dexie.
- **Sync indicator** — same pattern (dot + "Up to date" + last-sync time).
	Settings screen mirrors the coffee app's; lift it.
- **PWA boot script** — same shape (theme bootstrapping, service worker
	registration).

Where the two apps diverge intentionally:

- **Font stack** — Cormorant Garamond + EB Garamond + IBM Plex Mono
	(vs. Newsreader + Geist + Geist Mono). Signals "different app".
- **Display posture** — italic primary (Chawan) vs upright primary (coffee).
	Adds the contemplative voice without restructuring layout.
- **Accent** — tea green (vs copper).
- **Hero card pattern** — Chawan uses typographic stacks with hairlines
	(no rounded card around the home hero); coffee uses a `rounded-[22px]`
	surface card with a corner colour blob. **Worth a call**: if you'd rather
	standardise Chawan onto the coffee app's hero card, the swap is mechanical.
- **Bottom navigation** — Chawan currently has an icon tab bar; the
	coffee app has a horizontal mono link rail. The link rail is more
	in-family. See `flow-review.md` for the trade-off.

---

## Phase discipline (per coffee `CLAUDE.md`)

- **Phase 1** — solo, local-only, Dexie via repository. No auth, no Supabase.
	Settings shows sync indicator as a stub (`Status: Local only`).
- **Phase 2** — Supabase + magic-link auth + sync. Repository interface
	stays.

Do not add Phase 2 features into Phase 1 code.

---

## Open questions before implementation

1. **Tab bar vs link rail** — pick one (see flow-review.md and §
	 "Compatibility with the coffee app" above).
2. **Should the fork screen go away** — see flow-review.md §1.
3. **"Again?" quick-log** — yes/no/how visible? See flow-review.md §1.
4. **Cultivar — enum or freeform** — Chawan currently does freeform with
	 chip suggestions. Coffee does freeform `grindSetting`. Match.
5. **Time of brew on form** — explicit `Now · 14:32` eyebrow or no? See
	 flow-review.md §2.

Resolve these before cutting routes; they affect the route tree.
