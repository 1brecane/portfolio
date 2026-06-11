# Journey & Galaxy Enhancements — Design

**Date:** 2026-06-12
**Branch:** `development`
**Status:** Approved by Samuele (visual companion session: all four options A–D selected; intro frequency decided as "first visit only")

## Goal

Four additions to the cinematic journey/galaxy system: a first-visit camera intro,
rare ASCII comets, a richer chapter rail, and scroll-velocity-aware warp streaks.
None of them may regress the galaxy hard rules (no rotation; per-particle twinkle;
zoom enlarges existing glyphs on the fixed hashed grid) or the journey guards
(reduced-motion / mobile / reduced-data / flat all hold the hero view with a static
or calm galaxy; holds keep a stable backdrop).

## A — First-visit intro fly-in (`src/composables/useGalaxyJourney.js`)

On mount, the composable runs a one-shot ~1.8s camera animation **only when ALL
of these hold**:

- `window.scrollY` ≈ 0 (top of page)
- `location.hash` is empty (deep links land elsewhere; no intro)
- The journey is actually running — i.e. none of the existing hold-the-hero-view
  conditions are active (reduced motion, < 768px, reduced data, flat mode). Reuse
  the exact checks the composable already has; do not duplicate them.
- `localStorage.getItem("journey-intro-seen")` is null. (Storage access wrapped in
  try/catch like `useJourneyMode` does — private-mode safe. On storage failure,
  treat as seen: skip the intro.)

Behavior:

- Animate `zoom` from `INTRO_START_ZOOM = 0.35` to the hero zoom (1.0) over
  `INTRO_MS = 1800` with ease-out cubic; `center` stays at the hero center (0,0).
- Emit `travel = sin(π·t) · (1 − t)` during the intro so the existing warp-streak
  pipeline draws the flight scia and fully dies by arrival (crisp landing).
- `intensity` stays 1 (hero is a `bright` zone).
- Write `journey-intro-seen = "1"` **when the intro starts** (a mid-intro reload
  counts as seen).
- **Cancellation:** the user's first `wheel`, `touchstart`, `keydown` (scrolling
  keys or any key — any is fine and simpler) or actual scroll (`scrollY > 0`)
  cancels the intro instantly: stop the rAF loop, hand `zoom/center/travel`
  straight back to the normal scroll-driven update. Never block or delay input.
- While the intro runs, the normal scroll handler must not fight it: either gate
  the scroll-driven write with an `introActive` flag (cleared on cancel/finish)
  or cancel-on-first-scroll before it writes. Cancellation must leave NO stale
  values (the next scroll frame recomputes everything).
- Hero page content is untouched — only the camera flies.

Knobs: `INTRO_START_ZOOM`, `INTRO_MS` (module constants, commented as TUNABLE).

## B — Occasional ASCII comets (`src/components/GalaxyBackground.vue`)

A rare comet crosses the sky during normal animated rendering:

- **Spawning:** one comet at a time; next spawn scheduled at a random delay in
  `[COMET_MIN_DELAY = 15s, COMET_MAX_DELAY = 30s]`. Timer only progresses while
  the canvas is in animated mode AND `document.visibilityState === "visible"`
  (a `visibilitychange` listener pauses/resumes scheduling; no comet burst on
  tab return).
- **Never** in static mode (mobile / reduced-data / reduced-motion already render
  static — comets are automatically excluded there; verify the guard hooks into
  the same existing static flag, not a new media check).
- **Rendering:** screen-space (not galaxy-space): a head glyph `*` plus a trail of
  `COMET_TRAIL = 10` `·` ghosts along the recent path, alpha fading toward the
  tail. Diagonal trajectory (random side entry, slight downward drift), lifespan
  ~2s, removed when off-screen. Drawn **after** the particle pass, same
  `fillText` pipeline, colored with the galaxy's current palette color (it must
  follow the `color N` hover scheme like the stars do).
- Perf: one comet = ~11 fillText calls/frame max — negligible. No allocation per
  frame (reuse the trail array).

Knobs: `COMET_MIN_DELAY`, `COMET_MAX_DELAY`, `COMET_TRAIL` (commented TUNABLE).

## C — Richer chapter rail (`src/components/JourneyRail.vue`)

- **Chapter numbers:** a small `01`–`06` (zero-padded index) rendered next to each
  dot, always visible (unlike the hover-revealed labels): muted color, `~10px`
  mono; the active chapter's number in the primary color. `aria-hidden="true"`
  (the existing accessible labels already name the buttons).
- **Arrival ping:** when `activeIndex` changes, the newly active dot emits a
  one-shot radar ping (an expanding fading ring, CSS keyframes ~1s). Re-trigger
  mechanism: key the ping element on `activeIndex` (or restart the animation by
  element re-creation) — it must fire on every arrival, not just the first.
- No behavior change for clicks/labels/positioning; rail remains hidden < 768px
  and in flat view. `prefers-reduced-motion`: the global 0.01ms override makes
  the ping effectively invisible — additionally `display: none` the ping ring
  under reduced motion for cleanliness (the rail itself is hidden in most
  reduced setups anyway since the journey is off, but the rule is cheap).
- No new i18n keys (numbers are numerals).

## D — Velocity-aware warp (`src/composables/useGalaxyJourney.js`)

- Track scroll velocity in the existing scroll/rAF handler: `px/s`, smoothed
  (exponential moving average, factor ~0.15), normalized to a 0→1 factor
  `vel = clamp(speed / VEL_FULL, 0, 1)` with `VEL_FULL = 3000` px/s.
- In **gaps**, the emitted `travel` becomes `arc · (VEL_FLOOR + (1 − VEL_FLOOR) · vel)`
  with `VEL_FLOOR = 0.5`: slow cruising keeps shorter streaks, fast scrolling
  reaches the full hyperspace look.
- During **holds** `travel` stays exactly 0 — the stable reading backdrop is
  untouched. The intro (A) bypasses this scaling (it emits its own travel).
- `GalaxyBackground` is unchanged (it already maps `travel` → streak length).

Knobs: `VEL_FULL`, `VEL_FLOOR` (module constants, commented TUNABLE).

## Out of scope

- AsciiStarfield (do-not-change layer), hero content timing, JourneyRail layout
  overhaul, any new i18n keys, comets in static mode, intro on every load.

## Verification

`npm run lint` (0 errors; 3 pre-existing warnings baseline) + `npm run build`,
plus a visual pass: first-visit intro (clear the localStorage key), intro
cancellation by scrolling mid-flight, a comet (temporarily lower the delay to
test), rail numbers + ping while scrolling chapter to chapter, slow-vs-fast gap
scrolling, and a check that mobile emulation + reduced-motion show none of it.

`docs/features.md` is updated in the same change: intro fly-in (camera section),
comets (galaxy section), rail numbers/ping (chapter rail bullet), velocity warp
(warp streaks bullet), plus tunables rows for every new knob.
