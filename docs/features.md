# Features — Galaxy background & the cinematic journey

This doc covers the two background systems and the scroll "journey" that flies a
camera through the galaxy. It is the canonical reference for `GalaxyBackground.vue`,
`useGalaxyJourney`, `useScrollPresentation`, and `JourneyPresentation.vue`.

> The other docs referenced by [`CLAUDE.md`](../CLAUDE.md)'s documentation index
> (architecture.md, components.md, …) do not exist yet — this is the first one.

---

## Background layers

Two **fixed**, full-viewport layers sit at `z-0`, behind the page (page content is
`z-[2]`). Both are mounted at the app root in [`src/App.vue`](../src/App.vue):

1. **`AsciiStarfield.vue`** — sparse, CSS-animated twinkling ASCII stars. *Do not change.*
2. **`GalaxyBackground.vue`** — a Canvas 2D ASCII spiral galaxy (the thing the journey
   camera flies through).

Both honor `prefers-reduced-motion` (static, no animation loop / no listeners). The
galaxy additionally renders a **single static frame** (no rAF loop) on small screens
(`max-width: 767px`) and under `prefers-reduced-data: reduce`, to save battery/CPU.

On small screens the galaxy is also **framed differently** (see A3 below): instead of the
desktop's cover fit it **contains the disc to the screen width** and views it nearly
**face-on**, so a narrow portrait shows the *whole* spiral (all arms) rather than zooming
into just the core. The canvas also renders at `devicePixelRatio` so glyphs stay crisp on
high-DPR phones. Desktop framing is untouched.

---

## The galaxy — `GalaxyBackground.vue`

A tilted logarithmic spiral rendered as ASCII glyphs (`" .·+*"`) with a white-hot core,
an event-horizon ring, a dark "black hole" center, color bands (white → amber → red →
crimson), and a mouse-hover highlight trail.

It obeys **three hard rules**:

### A1 — It does not rotate or move

Particle positions are static. There is no `rot` term, no flowing particles. (Rotation
was tried and rejected as "chaotic".)

### A2 — It feels alive via a per-particle twinkle

Every glyph fades smoothly between dim and bright on its **own** slow clock (~3–7 s),
with its own phase — the whole field shimmers gently (opacity only; the glyph never
changes). Per particle, hashed from its galaxy index `(ix, iz)`:

```
phase  = hashB * 2π
speed  = TWINKLE_SPEED_BASE + hashA * TWINKLE_SPEED_VAR     // 0.85 + h*1.4 rad/s
tw     = sin(elapsed*speed + phase) * 0.5 + 0.5             // 0..1

normal-char alpha = peak * (0.35 + tw*0.65),  peak = min(1, 0.55 + density*0.8)
bright-star alpha = 0.2 + tw*0.8
```

Avoid: a single global pulse (looks static), fast/large oscillation (looks like random
blinking), or twinkling only the bright stars (the dense field looks dead).

### A3 — Zoom enlarges existing glyphs; it never spawns new ones

This is the critical architectural rule. The galaxy is **not** sampled on a screen-pixel
grid (that re-samples denser as you zoom, making new characters appear). Instead:

- Particles live on a **fixed grid in galaxy space**, one per integer index `(ix, iz)`.
  Their identity/look is hashed from `(ix, iz)`, so the **same** characters persist at
  every zoom. Grid spacing makes the grid project exactly one character-cell apart at
  zoom 1 (preserving the on-load look):

  ```
  scale  = max(W/2, H/(2*OUTER_R*TILT_SIN))   // desktop: COVER — fills the viewport
  CHAR_W = measured monospace "M" width at the active FONT_SIZE
  CHAR_H = FONT_SIZE
  TILT_SIN = sin(40°)
  stepX = CHAR_W / scale
  stepZ = CHAR_H / (scale * TILT_SIN)
  ```

  **Mobile framing (`max-width: 767px`).** A round, face-on disc can't be *covered* by a
  tall portrait without zooming so far that the side arms crop off-screen and only the core
  band shows — an unreadable "blob". So mobile drops the cover fit and **contains the disc
  to the screen width** instead: the whole spiral fits across the width and reads (all
  arms), with a starfield letterbox above/below (the disc is roughly as tall as it is wide,
  shorter than the portrait). A smaller glyph keeps the grid dense. The rest of A3 is
  identical — same fixed grid, same hashing — only these framing constants change:

  ```
  scale     = (W / (2*OUTER_R)) * MOBILE_FILL    // CONTAIN-by-width — whole disc fits the width
  MOBILE_FILL = 1.12                             // ≥1 crops only the faint outer tips → fills the width
  FONT_SIZE = FONT_SIZE_MOBILE (10, vs 15)       // finer detail on the small screen
  TILT_SIN  = sin(74°) ≈ 0.961 (vs 0.643)        // near face-on → round disc, spiral reads
  ```

  Containing to the width means the disc spans the full screen width (`MOBILE_FILL` crops
  only the faint `r≈1.0–1.1` arm tips), so every arm is on-screen instead of the desktop's
  height-driven cover cropping them. The `charWidth` cache is invalidated in `onSizeChange`
  when the breakpoint flips, since the active `FONT_SIZE` changes. Desktop (`> 767px`) takes
  the cover-fit `sin(40°)`/`FONT_SIZE 15` path unchanged.

  **High-DPR rendering.** The canvas backing store is sized to `clientSize × devicePixelRatio`
  (capped at 2) while `draw()` works in CSS pixels via `ctx.setTransform(dpr,…)`, so glyphs
  rasterize crisply on phones instead of being upscaled and blurred. At DPR 1 it's the
  identity transform — desktop output is byte-for-byte unchanged. Glyph *count* is unaffected
  (the grid is CSS-pixel based), so there's no O(N) cost increase, only sharper rasterization.

- Fixed galaxy position: `x_gal = ix*stepX`, `z_gal = iz*stepZ`; cull if
  `sqrt(x_gal² + z_gal²) > OUTER_R`.
- Project through the camera (`zoom` + `center` props):

  ```
  px = cx + (x_gal - center.x) * (scale * zoom)
  py = cy + (z_gal - center.y) * (scale * TILT_SIN * zoom)
  cx = W/2,  cy = H*0.52
  ```

- **The font size scales with zoom** (`FONT_SIZE * zoom`) — this is what grows the
  existing glyphs instead of adding new ones.
- For performance, only the on-screen slice of `(ix, iz)` is iterated (visible galaxy
  bounds inverted from the screen edges, clamped to `±ceil(OUTER_R/step)`). Work shrinks
  as you zoom in.

Net effect: zooming in is exactly like zooming a bitmap — same characters, bigger.

**Props:** `zoom: Number = 1`, `center: {x,y} = {0,0}`, `intensity: Number = 1` (galaxy
opacity — see "breathing" below). `intensity` is **multiplied into every glyph's
`globalAlpha` inside `draw()`**, *not* applied as a CSS `opacity` on the `<canvas>`.
Animating element opacity promoted this fixed full-viewport canvas to a compositing layer
that some GPUs rasterized at DPR-1 while the opacity transitioned — blurring the galaxy
during the scroll-driven breathing. Baking it into the per-frame draw keeps the canvas
fully opaque (no layer) and crisp at native resolution; the per-frame redraw already makes
the breathing a smooth glide (no CSS transition needed). At `zoom 1, center {0,0},
intensity 1` it looks identical to a plain full-disc render.

**Loop:** `requestAnimationFrame`; the next frame is scheduled **before** `draw()`, so a
one-off draw error can never freeze the loop. The shared `staticMode()` guard (reduced
motion **or** small screen **or** reduced-data) draws one static frame and does not loop;
the three are watched live via `matchMedia` so toggling any of them starts/stops the loop
(`applyMode()`). **Perf guard:** the loop is also paused on `visibilitychange` while the
tab is hidden and resumed on return (the galaxy renders the full viewport every frame, so
this matters — it's the heaviest always-on runtime cost).

**Recolor egg:** the Hero terminal `color N` command sets the hover palette through the
module-level [`useColorScheme()`](../src/composables/useColorScheme.js) singleton, which
the galaxy reads each frame (no prop drilling now that the galaxy is app-level).

**Tunable knobs** (top of the file): `FONT_SIZE`, `TWINKLE_SPEED_BASE` /
`TWINKLE_SPEED_VAR`, `OUTER_R`.

---

## The journey — pinned presentations + camera flight

The page is a cinematic flight through the galaxy. Sections behave like **pinned slides**
that reveal their content as you scroll; between them are **empty gaps** where only the
galaxy shows while the camera travels to the next zone. The camera flies *in* through
the galaxy, then pulls all the way back *out* to the full disc for Contact (the climax).

### Camera — `useGalaxyJourney()`

Returns reactive `{ zoom, center }` fed into `GalaxyBackground`. It defines one **zone**
per section, ordered by scroll, each with a target `zoom` and `center {x,y}` in galaxy
space (`{0,0}` = core):

| Zone | zoom | center |
|---|---|---|
| hero | 1.0 | (0, 0) |
| about | 1.8 | (0.5, -0.3) |
| stack | 2.2 | (-0.5, 0.2) |
| projects | 2.6 | (0.2, 0.5) |
| homelab | 3.4 | (-0.2, -0.2) |
| contact | 1.0 | (0, 0) — pulls back out to the full disc (hero view) as the climax |

- While a section is **on screen**, the camera **holds** that zone (stable backdrop).
- While in the **empty gap** between two sections, it **interpolates** (smoothstep) from
  the current zone to the next.
- **Pull-back arc:** the zoom doesn't ramp straight from A to B. A mid-gap `sin(π·t)` arc
  (0 at both ends, 1 at the midpoint) is *subtracted* from the eased zoom, so the camera
  **dezooms to reveal more, then pushes back in** to the next zone — a cinematic flight arc.
  The same `arc` also drives the bloom and warp below, so all three peak together mid-flight.
  Floored at `MIN_ZOOM` so it never shrinks past the full disc. Knobs: `PULLBACK`, `MIN_ZOOM`.
- **Breathing:** the composable also emits `intensity` (galaxy opacity). Non-`bright`
  zones dim to `DIM` (0.6) while held so their content reads calmly; the gaps bloom the
  opacity back to full at their midpoint (`base + (1-base)*sin(π·t)`), so the galaxy
  "exhales" as the camera flies. `hero` and `contact` are flagged `bright` and stay at
  full opacity. This lets the readability scrim stay light.
- **Warp streaks:** the composable also emits `travel` (0 while holding, `sin(π·t)`
  mid-gap). `GalaxyBackground` uses it to draw faded ghost copies of each glyph trailing
  toward the vanishing point (`cx, cy`) — particles farther out streak more — so the
  empty gaps feel like *flight*, not just zoom. Crisp on arrival (`travel → 0`). The
  copies are spaced **less than a glyph apart** (`f = s/(STREAK_COPIES+1)`) so they
  overlap into a **smooth smear** rather than reading as a few discrete mirrored
  duplicates behind each glyph (the old `STREAK_MAX 26` / `3 copies` look). Knobs:
  `STREAK_MAX` (length), `STREAK_COPIES` (count — more = smoother), `STREAK_FADE`
  (per-copy opacity) in `GalaxyBackground.vue`. **Perf:** only particles brighter than
  `STREAK_MIN_ALPHA` streak — the gaps are the heaviest frames *and* where you scroll
  fastest, and faint particles' streaks are ~invisible, so this caps the spike.
- **Chapter rail:** the composable emits `activeIndex` (held zone, or the nearer one
  mid-gap). [`JourneyRail.vue`](../src/components/JourneyRail.vue) renders a fixed
  right-edge dot-per-zone indicator with the active label lit and a progress fill. Each
  dot is a real **button** that flies the camera to that section via `scrollToZone()`
  (labels reveal on hover/focus) — an orientation cue *and* a quick-jump menu. It's a
  `<nav aria-label>`, hidden < 768px and in flat view. The camera is `prefers-reduced-motion`-
  and small-screen-aware, so the journey holds the hero view rather than running there.
- Pinned sections are sticky, so their inner `#id` box is **not** a stable anchor. The
  camera measures the non-sticky wrapper carrying `data-journey="<id>"` (the
  `.present-track`), falling back to `#id` for the non-pinned hero.
- Passive scroll + rAF throttle; re-measures (with retries) until the lazy sections
  exist; no-op under reduced motion (galaxy static, journey off).

### Empty gaps

Between every section is `<div class="journey-gap" aria-hidden>` (`pointer-events:none`).
Length is the `--journey-gap` CSS var (default `110vh`). Collapses to `0` under
reduced-motion, on small screens, and in flat view. A **sticky "keep scrolling" chevron**
(`.journey-gap::before`, `gap-bob` keyframes) rides along each gap so a fast scroller
knows the flight continues to the next slide; it's hidden wherever the gap collapses.

### Pinned presentation — `JourneyPresentation.vue` + `useScrollPresentation()`

Each journey section (About, TechStack, Projects, HomeLab, Contact) is wrapped so it
**pins** to the viewport and reveals its content progressively as you scroll.

- `useScrollPresentation(trackRef)` → `progress` 0→1 across a tall track whose inner
  content is `position:sticky; top:0`:
  `progress = clamp((scrollY - trackTop) / (trackHeight - viewportHeight), 0, 1)`.
  Under reduced motion `progress = 1`. **Perf:** `trackTop`/height are measured once and
  cached (re-measured on mount, window resize, and a `ResizeObserver` on `<body>` for lazy
  mounts / locale / font shifts); the per-frame path reads only `scrollY`. Measuring every
  frame (× the five sections) forced reflow-on-write **layout thrashing** that froze the
  galaxy and made reveals pop on fast scroll — don't reintroduce a per-frame
  `getBoundingClientRect`.
- `JourneyPresentation.vue` (props `zone`, `steps`) renders:

  ```html
  <div class="present-track" :data-journey="zone"
       :style="{ '--present': progress, '--steps': steps }">
    <div class="present-sticky"><slot/></div>
  </div>
  ```

- **Staged reveal → hold → exit**, pure CSS math (the only per-frame JS is setting
  `--present`). The track derives two helpers from `--present`: `--reveal`
  (`present / 0.62`, clamped) drives the staged entrance, and `--exit`
  (`(1 - present) / 0.18`, clamped) fades the whole slide back out over the last 18%.
  Each revealable child gets `class="present-step"` + inline `style="--step: <i>"`:

  ```css
  .present-track {
    --reveal: clamp(0, calc(var(--present, 1) / 0.62), 1);
    --exit: clamp(0, calc((1 - var(--present, 1)) / 0.18), 1);
  }
  .present-step {
    --t: clamp(0, calc(var(--reveal,1) * var(--steps,1) - var(--step,0)), 1);
    opacity: calc(var(--t) * var(--exit, 1));
    transform:
      translateY(calc((1 - var(--t)) * 2.5rem))   /* enter: rise in */
      scale(calc(0.85 + var(--exit,1) * 0.15));    /* leave: recede + shrink */
  }
  ```

  So step *i* fades+rises in over `reveal` `i/steps → (i+1)/steps`, the slide holds
  fully visible, then **shrinks + fades — receding toward the vanishing point** (scale
  1 → 0.85) as you scroll on, like it's left behind down the tunnel. Each section reads
  as a self-contained slide. Tune the pacing via the `0.62` / `0.18` split, and the
  recede depth via the `0.85` floor (lower = recedes further).
- **Reading settle (scroll-snap):** each track also carries a single
  `<span class="present-snap">` at `0.7 · (trackHeight − vh)` — the fully-revealed hold
  position — with `scroll-snap-align: start` + `scroll-snap-stop: normal`, and
  `html { scroll-snap-type: y proximity }`. *Proximity* leaves scrolling free through the
  gaps and mid-reveal; when the user comes to **rest** near a section's reading point the
  browser eases them onto it (the slide ends up framed without nudging up/down).
  `scroll-snap-stop` is **`normal`, not `always`** — `always` force-halted every discrete
  mouse-wheel tick at each section, which made scroll-down feel sticky/janky; `normal` keeps
  the rest-settle but lets a scroll in motion flow past. Disabled wherever sections aren't
  pinned (small screens / reduced-motion / flat view).
- **Crispness:** `.present-step` deliberately has **no `will-change`**. A permanent GPU
  layer rasterizes its text (and the glass cards' `backdrop-filter`) blurry whenever the
  reveal translate sits at a sub-pixel offset — i.e. anywhere outside the hold band, worst
  on Contact's big glass card over the bright galaxy. Without it, the browser composites
  during active scroll and de-promotes at rest (where the translate is exactly 0 → crisp).
  The scroll-snap above settles the user into that crisp band.

**Per-section step counts** (set via `:steps` in `App.vue`, with matching `--step` on
each block):

| Section | steps | what each step is |
|---|---|---|
| About | 3 | timeline entries |
| TechStack | 4 | category cards |
| Projects | 5 | 4 project cards + the "view all" button |
| HomeLab | 1 | the card |
| Contact | 1 | the form block |

These replace the old per-section reveals (`stagger-children` / `scroll-reveal` /
`isVisible` opacity) on those blocks so they don't fight `present-step`. The shared
`SectionHeader` is itself a `present-step` (`--step: 0`), so the **title reveals and
recedes with the slide** rather than doing its own vertical scroll-reveal drift —
`SectionLayout` no longer uses `useScrollReveal`. (The `FooterSection`, which lives
outside the journey, still uses `useScrollReveal` for a plain fade-in.)

### Navigation & view modes

- **Anchor scrolling — `scrollToZone(id)`**
  ([`useJourneyScroll.js`](../src/composables/useJourneyScroll.js)). A nav/rail click can't
  just jump to `#about`: the section is `sticky` inside a tall `.present-track`, so landing
  at the track top shows the slide *un-revealed* (`--present ≈ 0`). `scrollToZone` instead
  scrolls to `trackTop + 0.65 * (trackHeight - vh)` — the point where the slide is fully
  shown and not yet exiting. In flat view / on small screens / under reduced motion it falls
  back to a plain top-of-element scroll (minus an 80px nav offset). Wired into NavBar (links,
  logo, contact), the hero CTA + scroll cue, and every rail dot. All keep their `href` for
  right-click/share but `@click.prevent` to call `scrollToZone`.
- **Deep links.** [`App.vue`](../src/App.vue) reads `location.hash` on mount and calls
  `scrollToZone` once the target track exists (retries `[300, 700, 1300, 2000]ms`, since the
  sections are lazy), so `/#projects` opens straight to a revealed Projects slide.
- **Cinematic ⇄ flat ("simple view") — `useJourneyMode()`**
  ([`useJourneyMode.js`](../src/composables/useJourneyMode.js)). A module-level singleton
  (`"cinematic" | "flat"`) persisted to `localStorage` and mirrored onto
  `<html data-journey-mode>`. **Flat** flattens the layout (same CSS as the responsive
  fallback — collapses gaps, un-pins tracks, reveals all steps) so repeat visitors can skip
  the long scroll. The galaxy camera holds the hero view in flat (still twinkles); the rail
  hides. Toggled by [`JourneyModeToggle.vue`](../src/components/ui/JourneyModeToggle.vue) in
  the NavBar (next to `LocaleToggle`).

### Responsive / a11y fallback

Under `@media (max-width:767px)` **and** `prefers-reduced-motion: reduce`: pinning is
disabled (`.present-track{height:auto}`, `.present-sticky{position:relative;min-height:0}`
— relative, not static, so the scrim still anchors), everything is revealed
(`.present-step{opacity:1;transform:none}`), and `.journey-gap` collapses to `0`.
Sections then flow normally. The chapter rail is hidden < 768px. The manual
**flat** view (`[data-journey-mode="flat"]`) applies the exact same flattening on demand.

**Short-viewport compaction.** Tailwind breakpoints are *width*-based, so a small laptop
(12–13", ~1280×720–800, or any OS-scaled display) gets full desktop type/spacing even
though the viewport is **short** — and since a pinned slide is `min-height:100vh` and can't
scroll internally, the oversized content overflows and can't be fully read. Fix: scale the
**root `font-size`** down on short viewports (`@media (min-width:768px) and (max-height:820px)
→ 15px`, `… and (max-height:720px) → 14px` + a trimmed `--present-pad`), which shrinks every
rem-based size (type, padding, gaps, max-widths) proportionally so each slide fits one
screen. Gated to the pinned range (≥768px wide; the narrower path already flattens) and to
short heights only — normal/tall desktops are untouched, and px-based things (the galaxy
canvas) are unaffected regardless. See `globals.css`.

---

## Tunables at a glance

| Knob | Where | Effect |
|---|---|---|
| `--journey-gap` | `globals.css` `:root` | length of the empty camera-travel gaps |
| `REVEAL_POINT` (`0.65`) | `useJourneyScroll.js` | where in a track an anchor jump lands (fully-revealed slide) |
| `gap-bob` / `.journey-gap::before` | `globals.css` | the sticky "keep scrolling" chevron in each gap |
| `--present-track` | `globals.css` `:root` | scroll distance / pace of a pinned reveal |
| `--reveal` / `--exit` split (`0.62` / `0.18`) | `globals.css` `.present-track` | reveal vs hold vs exit-fade pacing of a slide |
| snap point (`0.7`) | `globals.css` `.present-snap` | where the proximity scroll-snap settles a section for reading |
| `:steps` | per section in `App.vue` | number of staged reveal steps |
| `ZONES` zoom/center/`bright` | `useGalaxyJourney.js` | per-section camera target + which stay full-opacity |
| `DIM` | `useGalaxyJourney.js` | galaxy opacity while reading a dimmable section (breathing) |
| `PULLBACK` / `MIN_ZOOM` | `useGalaxyJourney.js` | mid-gap camera dezoom amount (the flight arc) / its floor |
| `FONT_SIZE` / `FONT_SIZE_MOBILE` | `GalaxyBackground.vue` | base glyph size (desktop / phone) |
| `MOBILE_FILL` | `GalaxyBackground.vue` | how hard the contain-by-width mobile fit fills the width (≥1 crops faint outer arm tips for presence; up = bigger, down = more letterbox margin) |
| `TILT_DEG` / `TILT_DEG_MOBILE` | `GalaxyBackground.vue` | perspective tilt (desktop 40° / phone 74°, near face-on so the disc reads as a round spiral, not just the core) |
| `TWINKLE_SPEED_BASE/VAR` | `GalaxyBackground.vue` | twinkle rate / spread |
| `STREAK_MAX` / `STREAK_COPIES` / `STREAK_FADE` / `STREAK_MIN_ALPHA` | `GalaxyBackground.vue` | warp-streak length / ghost-copy count (more = smoother smear, less = discrete duplicates) / per-copy opacity / min particle alpha that streaks (perf: faint particles skip streaks) |
| `OUTER_R` | `GalaxyBackground.vue` | galaxy disc radius |
| scrim alphas | `globals.css` `.present-sticky::before` | section readability vs galaxy visibility |
