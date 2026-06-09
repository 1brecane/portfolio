# Journey Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scale-recede slide exit with a camera-pan-driven directional drift, decode section titles from ASCII glyphs during reveal, and add a hover 3D tilt to the glass cards.

**Architecture:** All three features ride the existing scroll-driven journey machinery. (1) `useGalaxyJourney.js` exports per-zone flow vectors derived from the camera `ZONES` centers; `JourneyPresentation.vue` writes them as CSS vars; `globals.css` `.present-step` consumes them in pure CSS math (still scrubbed by `--present`). (2) `JourneyPresentation` `provide()`s its `progress` ref; `SectionHeader` derives a deterministic scramble from it (no timers). (3) A `v-tilt` directive (transform-only, rAF-throttled, hover+fine-pointer only) is applied to the glass cards.

**Tech Stack:** Vue 3.5 `<script setup>`, Tailwind CSS 4 (CSS-first, `globals.css`), no test suite — verify gate is `npm run lint` (0 errors; warnings baseline ~3) + `npm run build`, plus a manual scrub in the dev server.

**Spec:** `docs/superpowers/specs/2026-06-09-journey-animations-design.md`

**Invariants (do not regress):**
- Galaxy hard rules: no rotation, no new particles, zoom = glyph growth (untouched here).
- `.present-step` must be the exact identity transform in the hold band (`--t = --exit = 1`) and must NOT gain `will-change` (text/backdrop-filter crispness — see docs/features.md).
- Flat view / `max-width: 767px` / `prefers-reduced-motion` fallbacks force `opacity: 1; transform: none` and `progress = 1`; nothing in this plan may animate there.
- i18n: any user-visible string changes go to both `en.js` and `it.js` (this plan adds none).

---

### Task 1: Per-zone flow vectors in `useGalaxyJourney.js`

The drift direction comes from the real camera pan between zones. Pure data + math, exported for `JourneyPresentation`.

**Files:**
- Modify: `src/composables/useGalaxyJourney.js` (add below the `ZONES` block, around line 35)

- [ ] **Step 1: Add the helper**

Insert after the `ZONES` array definition (after the line `];` that closes it):

```js
// ── Directional drift transitions ─────────────────────────────────────────────
// (see docs/superpowers/specs/2026-06-09-journey-animations-design.md)
// Screen-space flow vectors per zone: the slide you leave drifts OPPOSITE to the
// camera pan toward the next zone, and the next slide enters offset ALONG the pan
// (so it travels the same screen direction as the departing one) — the whole gap
// reads as one continuous pan instead of a disappear/reappear.
// Galaxy y projects to screen y squashed by the camera tilt.
const FLOW_TILT = 0.643; // sin(40°) — matches the desktop galaxy projection

function screenDelta(a, b) {
  return {
    x: b.center.x - a.center.x,
    y: (b.center.y - a.center.y) * FLOW_TILT,
  };
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y);
  return len < 1e-6 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

/**
 * getZoneFlow(zoneId) → { enter: {x,y}, exit: {x,y} } (normalized, screen space).
 * `enter`: offset direction the slide starts from (along the camera pan from the
 * previous zone). `exit`: direction it drifts out toward (opposite of the pan to
 * the next zone). CSS y is positive-down.
 * Defaults preserve today's behavior: enter from below, exit gently upward —
 * used for the first zone's enter, the last zone's exit, and unknown ids.
 */
export function getZoneFlow(zoneId) {
  const i = ZONES.findIndex((z) => z.id === zoneId);
  const fallback = { enter: { x: 0, y: 1 }, exit: { x: 0, y: -1 } };
  if (i === -1) return fallback;

  const enter =
    i > 0 ? normalize(screenDelta(ZONES[i - 1], ZONES[i])) : fallback.enter;

  let exit = fallback.exit;
  if (i < ZONES.length - 1) {
    const pan = normalize(screenDelta(ZONES[i], ZONES[i + 1]));
    exit = { x: -pan.x, y: -pan.y };
  }
  return { enter, exit };
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: 0 errors (warnings baseline ~3, all pre-existing in ProjectsSection/CvCaptchaModal).

- [ ] **Step 3: Commit**

```bash
git add src/composables/useGalaxyJourney.js
git commit -m "Feat: per-zone flow vectors for directional drift transitions"
```

---

### Task 2: `JourneyPresentation` provides progress + flow CSS vars

**Files:**
- Modify: `src/components/JourneyPresentation.vue` (whole file shown below)

- [ ] **Step 1: Replace the component**

```vue
<script setup>
import { provide, useTemplateRef } from "vue";
import { useScrollPresentation } from "@/composables/useScrollPresentation";
import { getZoneFlow } from "@/composables/useGalaxyJourney";

// Pins a journey section to the viewport and reveals its content progressively
// as the user scrolls (a slide, not a scroll-past). `zone` tags the stable,
// non-sticky track so useGalaxyJourney() can anchor the camera to it. `steps`
// is the number of staged `.present-step` children inside the slot.
const props = defineProps({
  zone: { type: String, required: true },
  steps: { type: Number, default: 1 },
});

const trackRef = useTemplateRef("trackRef");
const { progress } = useScrollPresentation(trackRef);

// Slide progress for children — SectionHeader uses it for the title decode.
provide("presentProgress", progress);

// Static per-zone drift vectors (camera-pan direction, see getZoneFlow). The
// micro-rotation leans the exiting slide into its horizontal motion.
const flow = getZoneFlow(props.zone);
const flowStyle = {
  "--enter-x": flow.enter.x.toFixed(3),
  "--enter-y": flow.enter.y.toFixed(3),
  "--exit-x": flow.exit.x.toFixed(3),
  "--exit-y": flow.exit.y.toFixed(3),
  "--exit-rot": `${(flow.exit.x * 1.2).toFixed(2)}deg`,
};
</script>

<template>
  <div
    ref="trackRef"
    class="present-track"
    :data-journey="zone"
    :style="{ '--present': progress, '--steps': steps, ...flowStyle }"
  >
    <div class="present-sticky">
      <slot />
    </div>
    <!-- gentle proximity scroll-snap point at the fully-revealed reading position -->
    <span class="present-snap" aria-hidden="true" />
  </div>
</template>
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/JourneyPresentation.vue
git commit -m "Feat: JourneyPresentation provides progress and drift flow vars"
```

---

### Task 3: Directional drift CSS in `globals.css`

Replace the `scale(0.85)` recede with the vector drift. The reveal→hold→exit split and all fallbacks stay as they are.

**Files:**
- Modify: `src/assets/globals.css` — only the `.present-step` rule (currently around line 381)

- [ ] **Step 1: Replace the `.present-step` rule**

Find this rule:

```css
.present-step {
  --t: clamp(0, calc(var(--reveal, 1) * var(--steps, 1) - var(--step, 0)), 1);
  /* enter: --t fades + rises each step in (translateY). leave: --exit shrinks the
     whole slide + fades it — receding toward the vanishing point, like it's left
     behind down the tunnel as you scroll on. Both are exactly identity in the hold
     band (--t = --exit = 1 → translateY 0, scale 1), which keeps text crisp. */
  opacity: calc(var(--t) * var(--exit, 1));
  transform: translateY(calc((1 - var(--t)) * 2.5rem)) scale(calc(0.85 + var(--exit, 1) * 0.15));
  /* NO `will-change` here on purpose: a permanent GPU layer rasterizes text (and
     the glass cards' backdrop-filter) blurry whenever the translate sits at a
     sub-pixel offset — i.e. anywhere outside the fully-revealed hold band. The
     browser still composites these during active scroll; at rest it de-promotes
     and they render crisp. (At present 0.62–0.82 the translate is exactly 0.) */
}
```

Replace with:

```css
.present-step {
  --t: clamp(0, calc(var(--reveal, 1) * var(--steps, 1) - var(--step, 0)), 1);
  /* Directional drift (camera pan): enter slides in from --enter-x/y (set per zone
     by JourneyPresentation from the real camera pan; defaults = the old rise-in),
     exit drifts out along --exit-x/y with a micro lean (--exit-rot) and a whisper
     of scale for depth. Drift distances are the 2.5rem/3.5rem factors. Everything
     is exactly identity in the hold band (--t = --exit = 1 → translate 0, rotate 0,
     scale 1), which keeps text crisp. */
  opacity: calc(var(--t) * var(--exit, 1));
  transform: translate(
      calc((1 - var(--t)) * var(--enter-x, 0) * 2.5rem + (1 - var(--exit, 1)) * var(--exit-x, 0) * 3.5rem),
      calc((1 - var(--t)) * var(--enter-y, 1) * 2.5rem + (1 - var(--exit, 1)) * var(--exit-y, 0) * 3.5rem)
    )
    rotate(calc((1 - var(--exit, 1)) * var(--exit-rot, 0deg)))
    scale(calc(0.97 + var(--exit, 1) * 0.03));
  /* NO `will-change` here on purpose: a permanent GPU layer rasterizes text (and
     the glass cards' backdrop-filter) blurry whenever the translate sits at a
     sub-pixel offset — i.e. anywhere outside the fully-revealed hold band. The
     browser still composites these during active scroll; at rest it de-promotes
     and they render crisp. (At present 0.62–0.82 the transform is exactly identity.) */
}
```

Note: `--exit-y` defaults to `0` in the CSS (fade-only for any present-step outside a
journey track); the upward default for journey slides comes from `getZoneFlow`'s
fallback `(0, -1)` via JourneyPresentation.

- [ ] **Step 2: Verify build passes**

Run: `npm run lint && npm run build`
Expected: 0 lint errors; build exits 0.

- [ ] **Step 3: Manual scrub check**

Run: `npm run dev`, open the printed localhost URL on a desktop-width window.
Check, scrolling slowly down AND back up:
- hero → about: about's content enters drifting in from the right/up side (camera pans right-down), settles crisp.
- about exit: slides drift right (camera pans left toward stack), with a barely-visible lean; no shrink-to-nothing.
- Hold band of each section: zero blur, zero offset (zoom a paragraph to 200% if unsure).
- contact exit to footer: gentle upward drift.
- Toggle the nav "simple view": everything plain and revealed, no drift.
- Narrow the window below 768px: sections flow normally, no drift.

- [ ] **Step 4: Commit**

```bash
git add src/assets/globals.css
git commit -m "Feat: directional drift slide transitions (replaces scale-recede exit)"
```

---

### Task 4: Decoding section titles in `SectionHeader.vue`

**Files:**
- Modify: `src/components/ui/SectionHeader.vue` (whole file shown below)

- [ ] **Step 1: Replace the component**

```vue
<script setup>
import { computed, inject, ref } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
});

// Slide progress from the enclosing JourneyPresentation. Defaults to 1 when
// absent (flat view fallback still provides it, but a header outside any journey
// track — or reduced motion forcing progress=1 — shows the plain title).
const progress = inject("presentProgress", ref(1));

// Same glyph language as the galaxy field (" .·+*" plus denser HUD noise).
const GLYPHS = ".·+*#@%&";

// Deterministic per-(char, frame) glyph — no rAF, no timers: the flicker comes
// from scroll itself (progress changes between frames) and costs zero at rest.
function glyphFor(i, frame) {
  const h = Math.imul(i + 1, 374761393) ^ Math.imul(frame + 1, 668265263);
  return GLYPHS[Math.abs(h) % GLYPHS.length];
}

const decoded = computed(() => {
  const text = props.title;
  // --reveal finishes at present 0.62 (globals.css); the title fully resolves by
  // half the reveal, before the content cards finish staging in.
  const reveal = Math.min(1, Math.max(0, progress.value / 0.62));
  const titleReveal = Math.min(1, reveal / 0.5);
  if (titleReveal >= 1) return text;
  const solved = Math.floor(titleReveal * text.length);
  const frame = Math.round(progress.value * 120); // quantized → stable per frame
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += i < solved || ch === " " ? ch : glyphFor(i, frame);
  }
  return out;
});
</script>

<template>
  <!-- The header is a `present-step` (step 0) like the section's content, so the
       title reveals and RECEDES with the journey. While the slide reveals, the
       title "decodes" from galaxy glyphs (decoded ≡ title once revealed; the real
       title stays in the sr-only span for SEO/screen readers). -->
  <div
    class="section-header-legible present-step text-center mb-16"
    :style="{ '--step': 0 }"
  >
    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
      <span class="sr-only">{{ title }}</span>
      <span aria-hidden="true">{{ decoded }}</span>
    </h2>
    <p class="text-foreground/75 max-w-xl mx-auto leading-relaxed">
      {{ subtitle }}
    </p>
  </div>
</template>
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Manual check**

In the dev server (`npm run dev`):
- Scroll into About slowly: the title resolves left-to-right from glyphs, fully
  readable well before the timeline cards finish revealing. Scrub back up: it
  re-scrambles. At rest in the hold band: plain text, no flicker.
- Centered-title width jitter during the scramble is expected (proportional font)
  and symmetric; it must NOT shift the subtitle or content below (it can't — the
  h2 height is constant).
- Switch locale to EN mid-page: titles still correct.
- Toggle simple view: titles plain everywhere, no scramble ever.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/SectionHeader.vue
git commit -m "Feat: section titles decode from ASCII glyphs during reveal"
```

---

### Task 5: `v-tilt` directive on the glass cards

**Files:**
- Create: `src/directives/tilt.js`
- Modify: `src/components/ProjectsSection.vue` (project card `<article>`)
- Modify: `src/components/TechStack.vue` (category card `<div>`)
- Modify: `src/components/AboutSection.vue` (inner `.glass-panel` card)
- Modify: `src/components/HomeLabSection.vue` (inner `.glass-panel` card)

- [ ] **Step 1: Create the directive**

Create `src/directives/tilt.js`:

```js
/**
 * v-tilt — subtle 3D tilt of a glass card toward the cursor.
 *
 * Hover-only physicality for the HUD-glass panels: rotateX/rotateY up to ~5°,
 * composed with the same -4px lift `.card-glow:hover` uses (the inline transform
 * replaces that CSS hover transform while tilting; same visual). transform-only
 * (no layout), rAF-throttled. No-ops entirely on touch / coarse pointers and
 * under prefers-reduced-motion (checked at bind time).
 *
 * Note: on cards that are themselves `.present-step`, the inline transform
 * overrides the scroll-driven reveal transform while hovered — the exact same
 * (harmless, transient) override `.card-glow:hover`'s translateY does today.
 * Cleared on leave, so the hold-band identity/crispness rule is preserved.
 */
const MAX_DEG = 5;
const LIFT_PX = 4;

function canTilt() {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const vTilt = {
  mounted(el) {
    if (!canTilt()) return;

    let raf = null;
    let rect = null;
    let lastX = 0;
    let lastY = 0;

    function apply() {
      raf = null;
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const px = (lastX - rect.left) / rect.width - 0.5; // -0.5 … 0.5
      const py = (lastY - rect.top) / rect.height - 0.5;
      const rx = (-py * MAX_DEG * 2).toFixed(2);
      const ry = (px * MAX_DEG * 2).toFixed(2);
      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-${LIFT_PX}px)`;
    }

    function onEnter() {
      rect = el.getBoundingClientRect();
      // Smooths the move updates and the leave snap-back; keeps card-glow's
      // box-shadow timing.
      el.style.transition = "transform 200ms ease, box-shadow 0.3s ease";
    }

    function onMove(e) {
      lastX = e.clientX;
      lastY = e.clientY;
      if (raf === null) raf = requestAnimationFrame(apply);
    }

    function onLeave() {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      rect = null;
      el.style.transform = "";
    }

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    el._tiltCleanup = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      el.style.transform = "";
      el.style.transition = "";
    };
  },
  unmounted(el) {
    el._tiltCleanup?.();
    delete el._tiltCleanup;
  },
};
```

- [ ] **Step 2: Apply in ProjectsSection**

In `src/components/ProjectsSection.vue`, add the import in `<script setup>` (with the other imports):

```js
import { vTilt } from "@/directives/tilt";
```

(`vTilt` in `<script setup>` scope automatically enables `v-tilt` in the template.)

Then add `v-tilt` to the project card `<article>`:

```html
        <article
          v-for="(project, i) in projects"
          :key="project.id"
          v-tilt
          class="present-step group relative glass-panel rounded-lg overflow-hidden card-glow"
          :style="{ '--step': i }"
        >
```

- [ ] **Step 3: Apply in TechStack**

Same import in `src/components/TechStack.vue`, then on the category card:

```html
        <div
          v-for="(category, i) in resolvedCategories"
          :key="category.title"
          v-tilt
          class="present-step group glass-panel rounded-lg p-6 card-glow"
          :style="{ '--step': i }"
        >
```

- [ ] **Step 4: Apply in AboutSection**

Same import in `src/components/AboutSection.vue`, then on the inner card (NOT the
`present-step` wrapper — the timeline dot must not tilt):

```html
          <div v-tilt :class="['glass-panel rounded-lg p-6 card-glow', { 'is-current': entry.current }]">
```

- [ ] **Step 5: Apply in HomeLabSection**

Same import in `src/components/HomeLabSection.vue`, then on the inner card:

```html
        <div v-tilt class="glass-panel rounded-lg p-10 card-glow">
```

- [ ] **Step 6: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: 0 lint errors; build exits 0.

- [ ] **Step 7: Manual check**

In the dev server, desktop with a mouse:
- Hover a project card: it tilts toward the cursor (max ~5°), lifts 4px, red glow
  still appears; leaves smoothly back to flat.
- Contact form panel does NOT tilt.
- DevTools → toggle device emulation (touch): no tilt.
- OS reduced-motion on (or DevTools rendering emulation): reload → no tilt.

- [ ] **Step 8: Commit**

```bash
git add src/directives/tilt.js src/components/ProjectsSection.vue src/components/TechStack.vue src/components/AboutSection.vue src/components/HomeLabSection.vue
git commit -m "Feat: v-tilt hover tilt on glass cards"
```

---

### Task 6: Update `docs/features.md`

The doc is the canonical journey reference; it shows the old `.present-step` math.

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Update the staged-reveal section**

In the "Staged reveal → hold → exit" bullet, replace the CSS snippet showing
`transform: translateY(...) scale(calc(0.85 + ...))` with the new transform from
Task 3, and replace the sentence describing the exit ("shrinks + fades — receding
toward the vanishing point (scale 1 → 0.85)") with:

```markdown
  So step *i* fades in over `reveal` `i/steps → (i+1)/steps`, entering from the
  per-zone `--enter-x/y` direction (the camera pan from the previous zone; default
  rise-from-below). The slide holds fully visible, then **drifts out along
  `--exit-x/y`** — opposite to the camera pan toward the next zone, with a micro
  lean (`--exit-rot`) and a whisper of scale (1 → 0.97) — so leaving a section
  reads as the camera *panning away*, not the slide vanishing. The vectors are
  computed by `getZoneFlow(zoneId)` in `useGalaxyJourney.js` from the `ZONES`
  centers and set as CSS vars by `JourneyPresentation.vue`. Tune the drift
  distances via the `2.5rem` (enter) / `3.5rem` (exit) factors in `globals.css`.
```

- [ ] **Step 2: Update the SectionHeader paragraph**

Where the doc says "The shared `SectionHeader` is itself a `present-step` (`--step: 0`), so the **title reveals and recedes with the slide**…", append:

```markdown
The title also **decodes** while the slide reveals: `JourneyPresentation`
`provide()`s its `progress` ref (`presentProgress`), and `SectionHeader` renders
the title resolving left-to-right from galaxy glyphs (`.·+*#@%&`), fully resolved
by half the reveal. Deterministic hash per (char, quantized progress) — no
timers; static at rest; the real title stays in an `sr-only` span (the scramble
is `aria-hidden`). Plain title wherever `progress` is forced to 1 (flat / small /
reduced motion).
```

- [ ] **Step 3: Add tunables rows**

In the "Tunables at a glance" table, add:

```markdown
| `--enter-x/y`, `--exit-x/y`, `--exit-rot` | set by `JourneyPresentation.vue` from `getZoneFlow()` | per-zone drift directions (derived from `ZONES` centers; `FLOW_TILT` maps galaxy y → screen y) |
| drift distances (`2.5rem` enter / `3.5rem` exit) + exit scale floor (`0.97`) | `globals.css` `.present-step` | how far slides travel in/out and the depth whisper |
| `GLYPHS` / resolve point (`reveal / 0.5`) | `SectionHeader.vue` | title-decode glyph set / how early the title is fully readable |
| `MAX_DEG` (5°) / `LIFT_PX` (4) | `src/directives/tilt.js` | glass-card hover tilt angle / lift |
```

- [ ] **Step 4: Commit**

```bash
git add docs/features.md
git commit -m "Docs: directional drift, decoding titles, card tilt in features.md"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full gate**

Run: `npm run lint && npm run build`
Expected: 0 lint errors (warnings ≤ 3, pre-existing); build exits 0.

- [ ] **Step 2: Full manual pass (dev server, desktop width)**

- Scrub the whole journey down and up: every transition drifts in a direction
  consistent with the galaxy's apparent motion behind it (slide and galaxy stream
  the same way).
- Deep link `http://localhost:5173/#projects`: lands on a fully revealed slide.
- Rail/nav jumps still land revealed (scrollToZone unaffected).
- Hold band: crisp text on every section (especially Contact's glass card).
- Simple view toggle, < 768px width, and reduced-motion emulation: flat layout,
  plain titles, no drift, no tilt.
- Hero terminal, locale toggle, contact form: unaffected.

- [ ] **Step 3: Report**

No commit here unless fixes were needed; report results (including any deviations)
back to the user.
