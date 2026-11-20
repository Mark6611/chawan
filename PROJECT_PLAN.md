# Chawan project plan

Written 2026-11-20. Goal: the best personal-use matcha and tea tracking app.

The plan applies what Buffy and Brew Log have already shipped, in the order that
keeps Chawan shippable at every step, then goes past them where tea needs
something coffee and lifting do not.

`ROADMAP.md` is the original build roadmap from May 2026 and still holds the
locked design decisions. Its phases 1 and 3 shipped. Its phase 2 (Supabase sync)
was built, switched off after App Review, and removed in September. The phase
numbers below are this plan's own and start again from 0.

## Where Chawan stands

- **Live:** 1.1 (build 8), approved. Built 2026-08-22 with the iOS 26 SDK.
- **On main, never shipped (2026-09-07):** Supabase removed, the restore-time
  network request closed, photo tombstones (Dexie v4), honest restore results,
  backup format 3 with a version gate, recover-a-deleted-session, the five
  silent write failures, CSP and security headers, the storage-eviction
  warning, write validation, dev-route guards. 173 tests.
- **The next build will not launch on iOS 27 as things are.** This Mac has
  Xcode 27.2. Chawan is on Capacitor 8.4.1 with no scene lifecycle, and Buffy
  found that every iOS 27 SDK build without one dies about six seconds after
  launch (`3af7e4b`). The live 1.1 is unaffected because it was linked against
  the older SDK.
- **Never confirmed on a real phone:** camera tin photo, the native share
  sheet, status-bar legibility in night theme, safe-area insets.

## What the siblings have that Chawan lacks

| Update                                                                              | Buffy | Brew Log | Chawan                            |
| ----------------------------------------------------------------------------------- | ----- | -------- | --------------------------------- |
| Scene lifecycle + iOS 27.2 SDK                                                      | 1.5   | 1.6      | missing, blocks every build       |
| Layout pinned to px, Dynamic Type                                                   | 1.2   | 1.3      | missing                           |
| VoiceOver names and roles                                                           | 1.2   | 1.3      | one `<label>` in the app          |
| 44pt targets, reduced motion, reduced transparency                                  | 1.2   | 1.3      | rating halves are 6×12pt          |
| Type ramp with an 11pt floor, 4pt grid                                              | n/a   | 1.4      | 27 sites under 11pt               |
| AA contrast, focus rings                                                            | 1.2   | 1.3      | done (1.1)                        |
| In-app confirm sheet                                                                | n/a   | 1.4      | 3 browser `confirm()` left        |
| Native feel: controls are not text, theme declared to the engine, Increase Contrast | 1.5   | 1.7      | missing                           |
| Directional screen motion, haptics, UIKit follows the in-app theme                  | 1.5   | 1.7      | missing                           |
| History beside the form (last sessions, sweet spot, next move)                      | 1.5   | 1.7      | missing                           |
| iPhone Duo: hinge plugin, folded fit, unfolded split                                | 1.5   | 1.6–1.7  | missing                           |
| Layout and a11y gates (`verify:duo`, contrast, hit targets)                         | yes   | yes      | CSS floor and privacy parity only |
| iCloud sync with no account                                                         | no    | yes      | local only                        |
| Error boundary, load-failure recovery, persistent storage                           | n/a   | main     | done on main                      |
| Ship tooling: preflight, screenshots, privacy parity                                | yes   | yes      | done                              |

## Phases

Each phase ends in a build. Same rhythm as the Brew Log port: review the phase,
then commit, push and start the next.

### Phase 0 — Shippable again (1.2)

**Status 2026-11-20: built and on TestFlight as 1.2 (build 9). Not yet
submitted for review.** Still to do: an on-device pass, regenerated
screenshots, and the submission.

Get the ten weeks of unshipped fixes to the store. Nothing new is designed here.

- Capacitor 8.4.1 → current, run its scene-lifecycle migrator, add
  `SceneDelegate.swift`, build with the iOS 27.2 SDK. Buffy's two manual
  corrections after the migrator are in `3af7e4b` and `8e964ac`.
- Raise the deployment target from 15.0 to 16.4. Tailwind v4 needs Safari 16.4
  for its media-query range syntax; Brew Log made the same move in `55b6426`.
- Add `PrivacyInfo.xcprivacy`. Eight builds have shipped without one.
- Small defects from the September review: the share sheet's Download button
  does nothing on iOS, page content sits under the Dynamic Island (first line at
  48px against a 59px inset), the service worker never polls for updates, the
  cafe "Clear" style is labelled three different ways, dates are half
  hardcoded to `en-US`, and preferences are missing from the backup.
- Replace the three `confirm()` dialogs with Brew Log's `ConfirmSheet`.
- Regenerate screenshots, run the preflight, submit.

**Done when:** 1.2 launches on an iOS 27 simulator and a real phone, and is in
review. The on-device checklist above gets its first real pass here.

### Phase 1 — Accessibility foundation (1.3)

The remaining five steps of the HIG programme, in the order Brew Log proved.

1. Pin `--spacing`, containers and radii to px. Invisible, but without it
   Dynamic Type scales layout about three times at the largest size.
2. Names and roles. `Field` emits a real `<label for>`, which names about 45
   controls at once. Stepper values, `role="alert"` on the three error banners,
   one `h1` per route, the flavour chart's children made reachable.
3. Hit targets and motion. Rating halves grow vertically only, or neighbours
   steal each other's taps. A `motion.svelte.ts` for the five Svelte transitions,
   which CSS reduced-motion cannot reach.
4. Dynamic Type through `:root { font: -apple-system-body }`.
5. Type ramp to an 11pt floor (the 10.5px eyebrow is used 83 times), then the
   4pt grid.

Port Buffy's four verify scripts so each step has a gate. Playwright is already
installed here.

**Done when:** every screen is usable at the largest accessibility text size
and the gates run in CI.

### Phase 2 — Native feel (1.4)

Brew Log's 1.7 port, minus what does not apply.

- Controls stop behaving like text: no selection, no callout, no tap flash.
- Theme declared to the engine, and an `AppearancePlugin` so the keyboard and
  date picker follow the in-app day/night choice.
- Increase Contrast tokens.
- Screens arrive by direction. Use `left`, not a transform: a transform
  re-anchors fixed controls to the page for the length of the animation.
- Haptics on steppers, rating, save and "Again?".
- A shared `Sheet` and modal helper, which phase 4 needs.

**Done when:** the app passes for native in a side-by-side with Brew Log 1.7.

### Phase 3 — iPhone Duo (1.5)

- Hinge plugin and the `data-foldable` flag.
- Folded: clear the 84pt status column on the outer display.
- Unfolded (951×669pt landscape): the form on the right, the reference pane on
  the left, split floor 860px. This is the handedness you chose for Buffy and
  Brew Log.
- `verify:duo`, mutation-tested, wired into the ship script.

**Risk:** all three Duo simulators on this Mac failed to boot on 2026-11-20.
This phase may be verified in a browser at Duo sizes only, as Buffy's unfolded
pose was.

### Phase 4 — Tin intelligence (1.6)

Where Chawan stops catching up and starts being good at tea. Buffy has exercise
history beside the workout and Brew Log has bag history with a sweet spot;
Chawan has the data for both and shows neither.

- **Tin history on the session form.** Last five bowls from this tin, set by
  set: grams, water, temperature, whisk, rating. A sheet on a phone, the left
  pane on an unfolded Duo.
- **Sweet spot per tin.** A read-time calibrator in the shape of Brew Log's
  `calibrate.ts`: converge on the temperature and ratio of the bowls you rated
  well, weight recent ones more, say how confident it is. Nothing stored.
- **Next move.** One suggestion from the last bowl: bitter at 80°C suggests
  trying 75°C.
- **Catalog linking fixed.** A tin made by hand can never be linked to the
  catalog today, and first run forces that path, so the palate chart stays
  empty for exactly the people it is for. Add "pick from catalog" on new and
  "link to catalog" on edit.
- Insights promoted out of its single 10.5px link. Catalog search box (the
  matcher already exists). Cafe sessions can reference a catalog product.
- Catalog grown past 20 products from three Uji makers.
- Real tin deletion, with the same recovery path sessions now have.

**Done when:** opening the form for a tin you have used tells you what to do
differently this time.

### Phase 5 — Tea, not only matcha (2.0)

The data model is matcha-shaped: three styles (usucha, koicha, latte), three
grades, five Japanese regions, a whisk field. Tea needs:

- A tea type on the tin: matcha, sencha, gyokuro, hojicha, genmaicha, oolong,
  black, white, pu-erh, herbal. Existing tins default to matcha.
- A second preparation on the session. Whisked keeps today's fields. Steeped
  adds leaf grams, water, temperature, steep time, infusion number and vessel.
- Freshness rules by type. Matcha fades in weeks after opening; pu-erh improves
  for years.
- Insights and the sweet spot split by type, so a hojicha at 95°C does not pull
  a matcha suggestion upward.

Additive only: a Dexie version bump with an `upgrade()` in the same commit and
a backup format bump, per the house rule. Region and grade become open-ended
rather than Japan-only enums.

### Phase 6 — Durability and reach (2.1)

- **iCloud sync with no account**, using Brew Log's CloudKit rail. Today one
  lost phone loses everything unless a manual backup exists. App Privacy stays
  "Data Not Collected", as it does for Brew Log.
- Home-screen quick actions ("Log a bowl", "Again").
- A low-stock nudge when a tin is nearly empty.
- Widgets only if the above leave appetite; they are the expensive item.

Tea comes before iCloud so the record shapes settle before a sync rail
carries them.

## Carried risks

- The scene-lifecycle crash is confirmed on Chawan. On an iOS 27.2 simulator
  the pre-migration build trapped in
  `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, and the
  migrated build ran for 160 seconds and rendered Today. The trap fires when
  the scene is created, not at a fixed six seconds: on a slow machine it came
  at 35 seconds, so any future check needs a window of a minute or more.
- No Chawan build has ever been confirmed on a physical device.
- Brew Log deferred three items that Chawan will meet too: a sticky pane's
  height under the keyboard on an unfolded Duo, idle-versus-highlighted bars
  under Increase Contrast, and small accent labels on tinted cards in the dark
  theme.

## Decisions (made 2026-11-20)

1. **Tea means all tea**, oolong and pu-erh included. The steeped model in
   phase 5 covers both, and the schema cost is nearly the same as Japanese
   greens alone.
2. **iCloud sync: yes**, in phase 6, on Brew Log's CloudKit rail.
3. **The iOS floor rises to 16.4** in phase 0.
