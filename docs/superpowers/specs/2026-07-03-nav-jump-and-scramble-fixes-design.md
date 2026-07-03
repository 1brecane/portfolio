# Nav jump smoothing (#10) + topbar scramble freeze fix (#8)

Date: 2026-07-03
Issues: [#10](https://github.com/1brecane/portfolio/issues/10),
[#8](https://github.com/1brecane/portfolio/issues/8)

Two small, low-risk fixes to the journey navigation. They are independent and can
land in one branch.

---

## #10 — Smoother nav/rail jump (controlled duration/easing + calm camera)

### Problem

`scrollToZone()` (`src/composables/useJourneyScroll.js`) jumps with
`window.scrollTo({ behavior: "smooth" })`. Native smooth scroll over a long distance
(e.g. Home → Contact) is very fast and abrupt. Worse, while the page scrolls,
`useGalaxyJourney` maps the live scroll position to the camera frame-by-frame, so a
long jump flies through **all five gaps** with their per-gap warp streaks and
pull-back arcs — the camera reads as chaotic.

### Approach

1. **Custom eased rAF scroll** in `useJourneyScroll.js`, replacing the native smooth
   `window.scrollTo`:
   - Easing: `easeInOutCubic`.
   - Duration: clamped by distance, `~550ms` (short hops) to `~1100ms` (full-page
     jumps). A long jump is no faster than a short one but stays contained.
   - Under `prefers-reduced-motion`: instant jump (`window.scrollTo` with `auto`),
     exactly as today. No animation, no camera-jump state.
   - Guard against overlap: a new `scrollToZone` call cancels any in-flight jump rAF.

2. **Calm camera during the jump.** A module-level shared state in
   `useJourneyScroll.js`:

   ```js
   export const journeyJump = reactive({ active: false, toId: null, progress: 0 });
   ```

   - `scrollToZone` sets `active = true`, `toId = zoneId`, updates `progress` (0→1)
     each rAF frame, and sets `active = false` when the scroll finishes (or is
     cancelled).
   - `useGalaxyJourney.update()` checks `journeyJump.active` first. When active it
     **bypasses the gap-by-gap sequence**: on the rising edge (active flips true) it
     captures the current camera state (`zoom`, `center.x`, `center.y`, `intensity`)
     as the "from"; each frame it interpolates directly toward the destination
     zone's target (looked up by `toId` in `ZONES`) by `smoothstep(journeyJump.progress)`,
     with `travel = 0` (no warp streaks). `activeIndex`/`progress` (the rail values)
     follow the destination so the rail lights up correctly.
   - On the falling edge (jump ends) normal scroll-driven mapping resumes — by then
     scrollY is at the destination, so `update()` naturally holds the destination
     zone with no snap.

### Isolation

- `journeyJump` lives in `useJourneyScroll.js` (already the owner of `scrollToZone`).
- `useGalaxyJourney` imports it **read-only** and looks up `toId` in its own `ZONES`.
- No index coupling across files: the camera interpolates from the live captured
  state to the destination zone target.

### Edge cases

- Jump target is the current zone → still runs a (tiny/zero-distance) scroll; camera
  from==to so no visible motion. Fine.
- `reduced` motion: no `journeyJump` activation; instant jump; camera untouched
  (already reset/off under reduced motion).
- Flat/small/reduced-data ("soft off"): `scrollToZone` already falls back to a plain
  top-of-element scroll; the camera is held at hero, so `journeyJump` need not drive
  it. `update()` returns early on `softOff()` anyway — keep that guard ahead of the
  jump branch so soft-off wins.

---

## #8 — Topbar scramble left frozen half-decoded (`Stack` → `Sta#@`)

### Problem

Nav-link labels use the hover-only `v-scramble` directive
(`src/directives/scramble.js`) with `mouseenter`/`mouseleave` listeners. The NavBar
is `position: fixed`, so when you click a link mid-scramble and the page scrolls,
the cursor stays over the same link — **no `mouseleave` fires**. If the scramble
interval is then stopped by `cancel()` (which clears the timer but does **not**
restore the DOM), the text is left frozen at a partial frame like `Sta#@`.

### Fix

Guarantee the element is never left frozen mid-scramble:

1. Add a `pointerdown` (and `blur`) listener that calls `restore()` — clicking a
   nav link snaps the text back to full before navigation.
2. Harden the `updated` hook's `cancel()` path: only freeze when Vue genuinely
   rewrote the text node (its new value must win); otherwise `restore()` to the
   captured original instead of leaving a partial frame.

Confirm the exact trigger via reproduction (systematic-debugging) before finalizing;
step 1 alone may be sufficient. Keep the directive's existing contract: hover-only,
no-op on coarse pointers / reduced-motion, text read at hover time (locale-correct),
single-text-node elements only.

---

## Verification

- `npm run lint` → 0 errors (3 pre-existing warnings allowed).
- `npm run build` → succeeds.
- Manual (`/run`): long nav jump (Home → Contact) eases in/out over ~1s with a calm,
  direct camera move (no warp streaks); rail dot lights the destination. Clicking a
  nav title mid-scramble leaves the label fully readable, not frozen.
