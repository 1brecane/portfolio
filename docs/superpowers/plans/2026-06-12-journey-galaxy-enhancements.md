# Journey & Galaxy Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-visit camera intro fly-in, rare ASCII comets, chapter numbers + arrival ping on the journey rail, and scroll-velocity-aware warp streaks, per `docs/superpowers/specs/2026-06-12-journey-galaxy-enhancements-design.md`.

**Architecture:** Tasks 1 and 4 extend `src/composables/useGalaxyJourney.js` (the scroll-driven camera): the intro is a one-shot rAF animation that runs before scroll control takes over, and the velocity factor scales the `travel` value emitted in gaps. Task 2 adds a comet layer to `src/components/GalaxyBackground.vue`'s existing per-frame draw. Task 3 is template+CSS in `src/components/JourneyRail.vue`. No new files; no galaxy hard-rule changes (no rotation, fixed hashed grid, zoom = glyph growth).

**Tech Stack:** Vue 3.5 `<script setup>`, Canvas 2D, plain CSS in scoped SFC styles. **No test suite** — the verify gate for every task is `npm run lint` (0 errors; 3 pre-existing warnings in ProjectsSection/CvCaptchaModal are baseline) + `npm run build`.

**Working directory:** `/home/sruaro/Documenti/GitHub/portfolio`, branch `development` (commit directly on it; never touch `main`).

---

### Task 1: First-visit intro fly-in (`useGalaxyJourney.js`)

**Files:**
- Modify: `src/composables/useGalaxyJourney.js`

Read the whole file first — you are weaving into an existing scroll→camera pipeline. Key existing pieces: `ZONES` (zone 0 = hero, zoom 1.0, center 0,0), `lerp()`, the `update()` function (scroll-driven write of `zoom/center/intensity/travel/activeIndex`), `resetCamera()`, `softOff()`, `reduced`, and the `onMounted` block that decides between `resetCamera()` and `update()`.

- [ ] **Step 1: Add the intro constants** (top of file, after the `MIN_ZOOM` constant block):

```js
// ── First-visit intro fly-in ──────────────────────────────────────────────────
// On a visitor's very first load (top of page, no deep-link hash, journey
// running) the camera starts far out and "lands" on the hero view, riding the
// existing warp-streak pipeline for the flight scia. Once per visitor.
const INTRO_START_ZOOM = 0.35; // where the flight starts. TUNABLE
const INTRO_MS = 1800; // flight duration. TUNABLE
const INTRO_SEEN_KEY = "journey-intro-seen";

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
```

- [ ] **Step 2: Add intro state + functions inside `useGalaxyJourney()`**

Add next to the other `let` declarations (`ranges`, `reduced`, …):

```js
let introRaf = null;
let introActive = false;
```

Add these functions after `resetCamera()` (note: `cancelIntro` is referenced by `resetCamera` in the next step, and uses `update()` via hoisting — function declarations, not consts):

```js
// localStorage wrapped like useJourneyMode does — private mode must not throw.
// Storage unavailable → treat as seen (skip the intro).
function introSeen() {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) !== null;
  } catch {
    return true;
  }
}

function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* nothing to persist */
  }
}

// Stop the intro (user input, completion, mode change, unmount) and hand the
// camera straight back to the scroll-driven state. Never blocks input.
function cancelIntro() {
  if (!introActive) return;
  introActive = false;
  if (introRaf !== null) {
    cancelAnimationFrame(introRaf);
    introRaf = null;
  }
  window.removeEventListener("wheel", cancelIntro);
  window.removeEventListener("touchstart", cancelIntro);
  window.removeEventListener("keydown", cancelIntro);
  update(); // recompute everything from the live scroll position
}

function startIntro() {
  introActive = true;
  // Written at START: a mid-intro reload counts as seen.
  markIntroSeen();
  window.addEventListener("wheel", cancelIntro, { passive: true });
  window.addEventListener("touchstart", cancelIntro, { passive: true });
  window.addEventListener("keydown", cancelIntro);
  const t0 = performance.now();
  const hero = ZONES[0];

  function frame(now) {
    if (!introActive) return;
    if (window.scrollY > 0) {
      cancelIntro();
      return;
    }
    const t = Math.min(1, (now - t0) / INTRO_MS);
    zoom.value = lerp(INTRO_START_ZOOM, hero.zoom, easeOutCubic(t));
    center.x = hero.center.x;
    center.y = hero.center.y;
    intensity.value = 1;
    // Flight scia through the existing warp pipeline; fully dead by arrival.
    travel.value = Math.sin(Math.PI * t) * (1 - t);
    activeIndex.value = 0;
    if (t < 1) introRaf = requestAnimationFrame(frame);
    else cancelIntro(); // done — clean up listeners, sync to scroll state
  }

  introRaf = requestAnimationFrame(frame);
}
```

- [ ] **Step 3: Wire the intro into the existing lifecycle**

Three small edits:

1. `resetCamera()` — first line becomes a `cancelIntro()` call, so every path that resets (reduced-motion flip, soft-off flip) also kills a running intro. `cancelIntro` is a no-op when no intro runs, and its `update()` call early-returns under reduced/soft-off, so no recursion or stale write:

```js
function resetCamera() {
  cancelIntro();
  zoom.value = 1;
  // … rest unchanged
```

2. `update()` — add the intro gate right after the existing early-return:

```js
function update() {
  raf = null;
  if (reduced || softOff()) return;
  if (introActive) return; // the intro owns the camera until done/cancelled
  // … rest unchanged
```

3. `onMounted` — after the existing `measure(); if (softOff()) resetCamera(); else update();` lines (and before `scheduleRetries()`), add:

```js
// First-visit cinematic landing — only from the very top, never on a
// deep-link, never when the journey is held (reduced/small/data/flat).
if (!softOff() && window.scrollY <= 1 && !location.hash && !introSeen()) {
  startIntro();
}
```

(`reduced` already returned earlier in `onMounted`, so it needs no re-check.)

4. `onUnmounted` — add `cancelIntro();` as the first line (before the `raf` cancellation).

- [ ] **Step 4: Verify**

Run: `npm run lint` → 0 errors. Run: `npm run build` → success.

Logic self-check (report on these): scroll during intro cancels within one frame (both the wheel/touch/key listeners and the `scrollY > 0` guard); cancel leaves no stale values (`update()` recomputes); flat-toggle mid-intro cancels via `resetCamera()`; second visit skips (`introSeen()`); deep link `/#projects` skips (hash guard) — note App.vue's deep-link scroll also fires `scrollY > 0` as a second safety; private mode skips (try/catch → seen).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useGalaxyJourney.js
git commit -m "Feat: first-visit galaxy intro fly-in"
```

---

### Task 2: Occasional ASCII comets (`GalaxyBackground.vue`)

**Files:**
- Modify: `src/components/GalaxyBackground.vue`

Read the file's draw pipeline first. Key existing pieces: `draw(canvas, elapsed)` (elapsed in **seconds**), the `dt` computed at its top (clamped: trail decay only runs when `0 < dt < 0.5` — a big `dt` means the tab was hidden), `staticMode()` (mobile/reduced-motion/reduced-data render one static frame — comets must never appear there), `STAR_HOVER_MAP` + `colorScheme` (the `color N` palette), and `intensity` (multiplied into every glyph alpha).

- [ ] **Step 1: Add the comet knobs** (in the TUNABLE KNOBS block, after `STREAK_MIN_ALPHA`):

```js
// ── occasional comets ─────────────────────────────────────────────────────────
// A rare screen-space comet crossing the sky during animated rendering — a
// reward for whoever watches. Never in static mode (that path never runs the
// per-frame loop). One at a time.
const COMET_MIN_DELAY = 15; // s — min wait before the next comet. TUNABLE
const COMET_MAX_DELAY = 30; // s — max wait. TUNABLE
const COMET_TRAIL = 10; // trail ghost glyphs. TUNABLE
const COMET_SPEED = 260; // px/s head speed. TUNABLE
```

- [ ] **Step 2: Add comet state + helpers** (after the mouse-trail state block):

```js
// ── comet state ───────────────────────────────────────────────────────────────
let comet = null; // { x, y, vx, vy, trail: [{x,y}, …] } — trail objects reused
let cometDueAt = 0; // elapsed-seconds timestamp; 0 = needs (re)scheduling

function scheduleComet(elapsed) {
  cometDueAt = elapsed + COMET_MIN_DELAY + Math.random() * (COMET_MAX_DELAY - COMET_MIN_DELAY);
}

function spawnComet(W, H) {
  const fromLeft = Math.random() < 0.5;
  const angle = ((12 + Math.random() * 18) * Math.PI) / 180; // shallow downward diagonal
  comet = {
    x: fromLeft ? -20 : W + 20,
    y: H * (0.08 + Math.random() * 0.4),
    vx: Math.cos(angle) * COMET_SPEED * (fromLeft ? 1 : -1),
    vy: Math.sin(angle) * COMET_SPEED,
    trail: [],
  };
}
```

- [ ] **Step 3: Advance + draw the comet at the end of `draw()`**

Insert just before the final `ctx.globalAlpha = 1;` of `draw()` (after the particle loop). `dt`, `elapsed`, `W`, `H`, `intensity`, and `starHover` are all in scope there:

```js
// ── comet pass ──────────────────────────────────────────────────────────────
// dt outside (0, 0.5) means first frame or a return from a hidden tab — the
// schedule is re-anchored instead of "catching up" (no comet burst on return).
if (!comet) {
  if (cometDueAt === 0 || dt <= 0 || dt >= 0.5) scheduleComet(elapsed);
  else if (elapsed >= cometDueAt) spawnComet(W, H);
} else if (dt > 0 && dt < 0.5) {
  comet.x += comet.vx * dt;
  comet.y += comet.vy * dt;
  // reuse the oldest trail point object — no per-frame allocation once warm
  const p = comet.trail.length >= COMET_TRAIL ? comet.trail.pop() : { x: 0, y: 0 };
  p.x = comet.x;
  p.y = comet.y;
  comet.trail.unshift(p);
  ctx.fillStyle = `rgb(${starHover[0]},${starHover[1]},${starHover[2]})`;
  for (let i = 0; i < comet.trail.length; i++) {
    ctx.globalAlpha = (1 - i / COMET_TRAIL) * (i === 0 ? 0.95 : 0.5) * intensity;
    ctx.fillText(i === 0 ? "*" : "·", comet.trail[i].x, comet.trail[i].y);
  }
  if (comet.x < -40 || comet.x > W + 40 || comet.y > H + 40) {
    comet = null;
    cometDueAt = 0; // reschedule from the next frame's elapsed
  }
}
```

Why this is safe in every mode: `drawStatic()` renders one frame with `elapsed = 0` → at most a schedule write, never a spawn (a comet needs a later frame with `elapsed >= cometDueAt`, which never comes in static mode). Tab hidden → the rAF loop stops entirely (existing `onVisibility`); on resume the big `dt` re-anchors the schedule. The comet uses the existing font (`fontSize * zoom`) — it scales with the camera like everything else — and multiplies `intensity` so it dims with the breathing. The color rides `starHover` so the terminal `color N` command recolors comets along with the stars.

- [ ] **Step 4: Verify**

Run: `npm run lint` → 0 errors. Run: `npm run build` → success.

Manual sanity (do this yourself with the dev server if one is running on 5174, otherwise note it for the controller): temporarily setting `COMET_MIN_DELAY = 1; COMET_MAX_DELAY = 2;` shows comets crossing; **revert the values before committing** (`git diff` must show 15/30).

- [ ] **Step 5: Commit**

```bash
git add src/components/GalaxyBackground.vue
git commit -m "Feat: occasional ASCII comets in the galaxy background"
```

---

### Task 3: Chapter numbers + arrival ping on the rail (`JourneyRail.vue`)

**Files:**
- Modify: `src/components/JourneyRail.vue`

The rail is a right-edge fixed `<nav>`: per zone a button containing `__label` (hover-revealed, left) then `__dot` (right). `activeIndex` drives `.is-active`.

- [ ] **Step 1: Template — numbers and ping**

In the button, between the label span and the dot span, add the chapter number; and give the dot a ping child rendered only on the active item:

```html
<button
  type="button"
  class="journey-rail__btn"
  :aria-current="i === activeIndex ? 'true' : undefined"
  :title="zone.label"
  @click="scrollToZone(zone.id)"
>
  <span class="journey-rail__label">{{ zone.label }}</span>
  <span class="journey-rail__num" aria-hidden="true">{{ String(i + 1).padStart(2, "0") }}</span>
  <span class="journey-rail__dot">
    <span v-if="i === activeIndex" :key="activeIndex" class="journey-rail__ping" aria-hidden="true" />
  </span>
</button>
```

(`:key="activeIndex"` forces re-creation so the one-shot animation re-fires on every arrival, including a return to a previously visited chapter. The numbers are `aria-hidden` — the buttons already have accessible names via the labels/title.)

- [ ] **Step 2: Scoped CSS**

Add after the `.journey-rail__label` rule block:

```css
/* always-visible chapter number — a quiet column next to the dots */
.journey-rail__num {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  color: color-mix(in oklch, var(--foreground) 38%, transparent);
  transition: color 280ms ease;
  text-shadow: 0 1px 8px oklch(0.08 0 0 / 0.7);
}

.journey-rail__item.is-active .journey-rail__num {
  color: var(--primary);
}
```

Make the dot a positioning context by adding ONE line to the existing `.journey-rail__dot` rule:

```css
.journey-rail__dot {
  position: relative; /* anchors the arrival ping */
  /* … existing declarations unchanged … */
}
```

Add after the `.journey-rail__item.is-active .journey-rail__dot` rule:

```css
/* one-shot radar ping when the camera arrives at a chapter */
.journey-rail__ping {
  position: absolute;
  inset: -5px;
  border-radius: 9999px;
  border: 1px solid var(--primary);
  opacity: 0;
  animation: rail-ping 900ms ease-out 1;
  pointer-events: none;
}

@keyframes rail-ping {
  0% {
    transform: scale(0.5);
    opacity: 0.9;
  }
  100% {
    transform: scale(2.1);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .journey-rail__ping {
    display: none;
  }
}
```

(The rail is already hidden < 768px and in flat view — nothing to add there. The ping also fires once on initial mount for the hero dot; that's an acceptable, even nice, load cue.)

- [ ] **Step 3: Verify**

Run: `npm run lint` → 0 errors. Run: `npm run build` → success.

- [ ] **Step 4: Commit**

```bash
git add src/components/JourneyRail.vue
git commit -m "Feat: chapter numbers + arrival ping on the journey rail"
```

---

### Task 4: Velocity-aware warp (`useGalaxyJourney.js`)

**Files:**
- Modify: `src/composables/useGalaxyJourney.js` (Task 1's changes are already in)

- [ ] **Step 1: Add the constants** (after the intro constants from Task 1):

```js
// ── velocity-aware warp ───────────────────────────────────────────────────────
// Streak strength in the gaps scales with real scroll speed: cruising keeps a
// shorter scia, flinging the wheel reads as full hyperspace. Holds stay at 0.
const VEL_FULL = 3000; // px/s that counts as full speed. TUNABLE
const VEL_FLOOR = 0.5; // fraction of the arc kept at crawl speed. TUNABLE
const VEL_SMOOTH = 0.15; // EMA blend per update — higher = snappier. TUNABLE
```

- [ ] **Step 2: Track smoothed velocity in the composable**

Add state next to the other `let` declarations:

```js
let lastY = 0;
let lastT = 0;
let vel = 0; // smoothed 0..1 scroll-speed factor
```

In `update()`, right after `const y = window.scrollY;`, add:

```js
// Smoothed scroll velocity (px/s → 0..1). A long pause (or the first sample)
// resets to 0 so a gap entered slowly starts at cruise, not at a stale speed.
const now = performance.now();
if (lastT > 0) {
  const dtMs = now - lastT;
  if (dtMs > 0 && dtMs < 200) {
    const instant = (Math.abs(y - lastY) / dtMs) * 1000;
    vel += (Math.min(1, instant / VEL_FULL) - vel) * VEL_SMOOTH;
  } else {
    vel = 0;
  }
}
lastY = y;
lastT = now;
```

- [ ] **Step 3: Scale the gap travel**

In `applyGap()`, change the travel line:

```js
// Warp peaks mid-flight, scaled by how fast you're actually scrolling.
travel.value = arc * (VEL_FLOOR + (1 - VEL_FLOOR) * vel);
```

Notes to preserve: holds still write `travel.value = 0` via `apply()` — untouched. The intro (Task 1) writes `travel` directly in its own frame loop and `update()` is gated out while it runs, so the intro bypasses this scaling by construction. Known/accepted behavior (parity with today): stopping mid-gap freezes the current streak length — `update()` only runs on scroll, so there is no decay loop; today's code freezes at full `arc` the same way.

- [ ] **Step 4: Verify**

Run: `npm run lint` → 0 errors. Run: `npm run build` → success.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useGalaxyJourney.js
git commit -m "Feat: warp streak strength follows real scroll velocity"
```

---

### Task 5: Document in features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Update the four touched areas + tunables**

Read the doc's structure first, then — documenting what was BUILT (read the actual source if any detail below disagrees):

1. **Camera section** (`### Camera — useGalaxyJourney()` bullet list): add a bullet for the **first-visit intro** — one-shot ~1.8s fly-in from `INTRO_START_ZOOM` to the hero view with a warp scia dying on arrival; only from the top, no deep-link hash, journey running; `journey-intro-seen` in localStorage (written at start, try/catch-safe); cancelled instantly by wheel/touch/keydown/scroll, by flat/reduced flips (`resetCamera`), and on unmount; `update()` is gated while it runs.
2. **Warp streaks bullet** (same section): note `travel` in gaps is now `arc · (VEL_FLOOR + (1−VEL_FLOOR)·vel)` where `vel` is an EMA-smoothed scroll speed normalized by `VEL_FULL`; holds stay 0; stopping mid-gap freezes the scia (same as before).
3. **Chapter rail bullet**: add the always-visible `01`–`06` numbers (`aria-hidden`, active in primary) and the one-shot arrival ping (re-keyed per `activeIndex`; `display:none` under reduced motion).
4. **Galaxy section** (`## The galaxy — GalaxyBackground.vue`): add a short "Comets" paragraph — rare screen-space comet (head `*`, `COMET_TRAIL` `·` ghosts), spawn window `[COMET_MIN_DELAY, COMET_MAX_DELAY]` seconds, one at a time, only in animated mode (never static: mobile/reduced-motion/reduced-data), schedule re-anchored after hidden-tab returns, colored by the `color N` star palette, dims with `intensity`.
5. **Tunables table**: add rows for `INTRO_START_ZOOM` / `INTRO_MS` (useGalaxyJourney.js), `VEL_FULL` / `VEL_FLOOR` / `VEL_SMOOTH` (useGalaxyJourney.js), `COMET_MIN_DELAY` / `COMET_MAX_DELAY` / `COMET_TRAIL` / `COMET_SPEED` (GalaxyBackground.vue), and the rail ping duration/scale (JourneyRail.vue scoped CSS) — matching the table's existing format.

- [ ] **Step 2: Final verify**

Run: `npm run lint` → 0 errors. Run: `npm run build` → success.

- [ ] **Step 3: Commit**

```bash
git add docs/features.md
git commit -m "Docs: intro fly-in, comets, rail numbers/ping, velocity warp in features.md"
```
