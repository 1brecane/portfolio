# Nav jump smoothing (#10) + scramble freeze fix (#8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make long nav/rail jumps ease in/out with a calm, direct camera move, and stop the topbar hover-scramble from freezing half-decoded when a link is clicked mid-animation.

**Architecture:** `scrollToZone` gains a custom easeInOutCubic rAF scroll and publishes a shared reactive `journeyJump` state; `useGalaxyJourney` reads that state to interpolate the camera straight to the destination zone (no per-gap warp) during a jump. The `v-scramble` directive gains a `pointerdown`/`blur` restore so the label always returns to full text before navigation.

**Tech Stack:** Vue 3.5 (Composition API), plain DOM/rAF, no new dependencies.

## Global Constraints

- No test suite. Verification per task = `npm run lint` (**0 errors**; 3 pre-existing warnings in `ProjectsSection` ×2 + `CvCaptchaModal` are allowed) + `npm run build` + manual check via `/run`.
- Honor `prefers-reduced-motion`: jumps are instant (no animation, no camera-jump state) under reduced motion.
- Background invariants unchanged: never add a CSS `opacity` to a canvas; `intensity` stays baked into per-glyph alpha (we only feed `intensity`/`zoom`/`center`/`travel` values, not styling).
- No new npm dependencies.
- Branch already created: `fix/nav-jump-and-scramble`. Spec: `docs/superpowers/specs/2026-07-03-nav-jump-and-scramble-fixes-design.md`.

---

### Task 1: Eased custom scroll + shared `journeyJump` state

**Files:**
- Modify: `src/composables/useJourneyScroll.js` (whole file rewrite — currently only exports `scrollToZone`)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `scrollToZone(zoneId: string): void` — unchanged signature; now animates the scroll with easeInOutCubic and (when animating) drives `journeyJump`.
  - `export const journeyJump` — a Vue `reactive({ active: boolean, toId: string | null, progress: number })`. `active` true while a programmatic jump animates; `toId` is the destination zone id; `progress` is 0→1 eased-scroll time fraction (raw `t`, not eased). Task 2 reads this.

- [ ] **Step 1: Rewrite `useJourneyScroll.js`**

```js
import { reactive } from "vue";

/**
 * scrollToZone(zoneId)
 *
 * Smart anchor scroll for the journey. A nav/rail click can't just jump to
 * `#about`: the section is `position: sticky` inside a tall `.present-track`, so
 * landing at the track's top shows the slide *un-revealed* (`--present ≈ 0`,
 * content faded out). Instead we scroll to the point inside the track where the
 * slide is fully revealed and holding.
 *
 * Reveal math (see globals.css): a slide is fully in and not yet exiting around
 * `--present ≈ 0.65`, i.e. `trackTop + 0.65 * (trackHeight - viewport)`.
 *
 * In "flat" mode, on small screens, or under reduced motion the track isn't
 * pinned, so we fall back to a plain top-of-element scroll (minus the nav bar).
 *
 * The scroll itself is a custom easeInOutCubic rAF animation (not native
 * `behavior:"smooth"`), with a distance-clamped duration so a full-page jump
 * isn't a disorienting blink. While it animates it publishes `journeyJump` so
 * useGalaxyJourney can fly the camera straight to the destination zone instead of
 * warping through every gap in between. Under reduced motion the jump is instant.
 */
const NAV_OFFSET = 80; // fixed NavBar height, so the heading isn't hidden under it
const REVEAL_POINT = 0.65; // --present where a slide is fully shown, pre-exit

// Jump duration is clamped by distance: a short hop isn't sluggish, a full-page
// jump isn't a blink. TUNABLE.
const MIN_MS = 550;
const MAX_MS = 1100;
const MS_PER_PX = 0.2;

// Shared state, read by useGalaxyJourney to keep the camera calm during a
// programmatic jump: one direct move to the destination zone, no per-gap warp.
export const journeyJump = reactive({ active: false, toId: null, progress: 0 });

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

let rafId = null;

function endJump() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  journeyJump.active = false;
  journeyJump.toId = null;
  journeyJump.progress = 0;
}

// Animate window scroll from the current position to `targetTop`, publishing
// `journeyJump` for the given zone id. A new call cancels any in-flight jump.
function animatedScrollTo(targetTop, zoneId) {
  const startTop = window.scrollY;
  const distance = targetTop - startTop;
  if (rafId !== null) cancelAnimationFrame(rafId);
  if (Math.abs(distance) < 2) {
    endJump();
    return;
  }
  const duration = Math.min(MAX_MS, Math.max(MIN_MS, Math.abs(distance) * MS_PER_PX));

  journeyJump.active = true;
  journeyJump.toId = zoneId;
  journeyJump.progress = 0;

  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, startTop + distance * easeInOutCubic(t));
    journeyJump.progress = t;
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      endJump();
    }
  };
  rafId = requestAnimationFrame(step);
}

export function scrollToZone(zoneId) {
  if (typeof window === "undefined" || !zoneId) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flat = document.documentElement.dataset.journeyMode === "flat";
  const small = window.innerWidth < 768;
  const pinned = !reduced && !flat && !small;

  const track = document.querySelector(`.present-track[data-journey="${zoneId}"]`);

  let top;
  if (track && pinned) {
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const revealDist = Math.max(0, track.offsetHeight - window.innerHeight);
    top = trackTop + revealDist * REVEAL_POINT;
  } else {
    const el = track || document.getElementById(zoneId);
    if (!el) return;
    top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  }
  top = Math.max(0, top);

  if (reduced) {
    window.scrollTo({ top, behavior: "auto" });
    return;
  }
  animatedScrollTo(top, zoneId);
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors (3 pre-existing warnings only).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual check via `/run`**

Load the app, click the Contact nav link from the top. Expected: the page eases in and out over ~1s (not a native fast snap), landing on the revealed Contact slide. (Camera calm is Task 2 — warp may still look busy here; that's fine.)

- [ ] **Step 5: Commit**

```bash
git add src/composables/useJourneyScroll.js
git commit -m "Feat(#10): eased custom nav-jump scroll + shared journeyJump state

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JixpwmuNa5pHt2287hVVJx"
```

---

### Task 2: Calm camera during a jump (useGalaxyJourney)

**Files:**
- Modify: `src/composables/useGalaxyJourney.js` (import `journeyJump`; add a jump branch + captured `jumpFrom` state in `update()`; clear it in `resetCamera()`)

**Interfaces:**
- Consumes: `journeyJump` from Task 1 (`{ active, toId, progress }`), and the existing module-local `ZONES`, `smoothstep`, `lerp`, `holdIntensity`.
- Produces: no new exports; behavior change only.

- [ ] **Step 1: Import `journeyJump`**

At the top of `src/composables/useGalaxyJourney.js`, add to the imports (after the `useJourneyMode` import on line 2):

```js
import { journeyJump } from "@/composables/useJourneyScroll";
```

- [ ] **Step 2: Declare the captured-from state**

Inside `useGalaxyJourney()`, alongside the other `let` declarations (near `let raf = null;`), add:

```js
let jumpFrom = null; // camera state captured at jump start (see update())
```

- [ ] **Step 3: Clear it in `resetCamera()`**

In `resetCamera()`, add `jumpFrom = null;` right before the `if (raf !== null)` block:

```js
  function resetCamera() {
    zoom.value = 1;
    center.x = 0;
    center.y = 0;
    intensity.value = 1;
    travel.value = 0;
    activeIndex.value = 0;
    progress.value = 0;
    jumpFrom = null;
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
```

- [ ] **Step 4: Add the jump branch to `update()`**

Replace the head of `update()` (the part from `raf = null;` through the `if (!first) return;`) with:

```js
  function update() {
    raf = null;
    if (reduced || softOff()) return;

    // Programmatic nav/rail jump (see useJourneyScroll.journeyJump): fly the camera
    // straight to the destination zone, ignoring the per-gap warp sequence, so a
    // long jump reads as one calm move instead of blasting through every gap.
    if (journeyJump.active) {
      const j = ZONES.findIndex((z) => z.id === journeyJump.toId);
      if (j !== -1) {
        if (!jumpFrom) {
          jumpFrom = {
            zoom: zoom.value,
            cx: center.x,
            cy: center.y,
            intensity: intensity.value,
          };
        }
        const t = smoothstep(journeyJump.progress);
        const dz = ZONES[j];
        zoom.value = lerp(jumpFrom.zoom, dz.zoom, t);
        center.x = lerp(jumpFrom.cx, dz.center.x, t);
        center.y = lerp(jumpFrom.cy, dz.center.y, t);
        intensity.value = lerp(jumpFrom.intensity, holdIntensity(j), t);
        travel.value = 0;
        activeIndex.value = j;
        progress.value = j;
        return;
      }
    } else if (jumpFrom) {
      jumpFrom = null;
    }

    const y = window.scrollY;
    const first = ranges[0];
    if (!first) return;
```

Everything below `if (!first) return;` (the first-zone hold, the gap loop, the final-zone `apply`) is unchanged.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Manual check via `/run`**

From the top, click Contact. Expected: during the ~1s eased scroll the starfield does **not** show the rapid warp-streak-through-every-gap; instead zoom/center glide directly from the hero view to the Contact (full-disc) view. The rail lights the Contact dot. Then scroll manually up/down: normal per-gap warp behavior is intact (no regression, no snap at the point the jump ended).

- [ ] **Step 8: Commit**

```bash
git add src/composables/useGalaxyJourney.js
git commit -m "Feat(#10): calm camera during programmatic nav jump

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JixpwmuNa5pHt2287hVVJx"
```

---

### Task 3: Scramble never left frozen mid-decode (#8)

**Files:**
- Modify: `src/directives/scramble.js` (add `pointerdown`/`blur` restore listeners + matching cleanup)

**Interfaces:**
- Consumes: the directive's existing `restore()` closure.
- Produces: no new exports; behavior change only.

- [ ] **Step 1: Reproduce & confirm the trigger**

Via `/run`: hover a nav label (e.g. "stack") to start the scramble, and click it mid-animation. Confirm the reported symptom — the label can be left frozen like `sta#@` (the fixed NavBar stays under the cursor, so no `mouseleave` fires to restore it). Note whether it self-heals after ~0.3s or stays stuck; either way the fix below makes the click restore instantly. If the freeze instead traces to the `updated` hook's `cancel()` (children genuinely changing on the click re-render), also apply the optional hardening noted in Step 4.

- [ ] **Step 2: Add restore-on-interaction listeners**

In `src/directives/scramble.js`, in `mounted(el)`, replace the listener-registration block:

```js
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", restore);

    el._scrambleCancel = cancel;
    el._scrambleCleanup = () => {
      restore();
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", restore);
    };
```

with:

```js
    // A click on the label (its anchor navigates + smooth-scrolls) must not leave
    // the text frozen mid-scramble. The NavBar is position:fixed, so the cursor
    // can stay over the same link after the jump and never fire `mouseleave` —
    // restore explicitly on pointerdown/blur so the label always returns to full.
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", restore);
    el.addEventListener("pointerdown", restore);
    el.addEventListener("blur", restore, true);

    el._scrambleCancel = cancel;
    el._scrambleCleanup = () => {
      restore();
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", restore);
      el.removeEventListener("pointerdown", restore);
      el.removeEventListener("blur", restore, true);
    };
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint` — expected 0 errors.
Run: `npm run build` — expected success.

- [ ] **Step 4: Manual check via `/run`**

Hover a nav label to start the scramble, then click it mid-animation. Expected: the label is fully readable (restored) — never frozen like `sta#@`. Hover-scramble on other labels still works normally; the click still navigates (eased jump from Task 1). If Step 1 traced the freeze to the `updated` hook, additionally change its cancel path so a running scramble is `restore()`d (not left as a partial frame) when Vue did **not** rewrite the text; re-run this check.

- [ ] **Step 5: Commit**

```bash
git add src/directives/scramble.js
git commit -m "Fix(#8): restore nav-label scramble on click so it never freezes half-decoded

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JixpwmuNa5pHt2287hVVJx"
```

---

## Self-Review

**Spec coverage:**
- #10 eased scroll + clamped duration + reduced-motion instant → Task 1. ✅
- #10 shared `journeyJump` state → Task 1. ✅
- #10 calm camera (direct interpolation, `travel=0`, captured from-state, resume with no snap) → Task 2. ✅
- #10 soft-off keeps plain scroll & untouched camera (update() `softOff()` guard ahead of jump branch) → Task 2 Step 4 keeps the guard first. ✅
- #8 pointerdown/blur restore → Task 3. ✅
- #8 reproduce-first + optional `updated`-hook hardening → Task 3 Steps 1 & 4. ✅

**Placeholder scan:** No TBD/TODO; all code shown in full. The Task 3 "optional hardening" is conditional on a reproduction finding, with the concrete alternative described, not a blank. ✅

**Type consistency:** `journeyJump` shape `{ active, toId, progress }` is identical in Task 1 (producer) and Task 2 (consumer). `jumpFrom` fields `{ zoom, cx, cy, intensity }` are written and read only within Task 2. `restore` is the existing directive closure. ✅
