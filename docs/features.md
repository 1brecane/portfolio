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

Both honor `prefers-reduced-motion` (static, no animation loop / no listeners).

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
  scale = canvasWidth / 2
  CHAR_W = measured monospace "M" width at base FONT_SIZE
  CHAR_H = FONT_SIZE
  TILT_SIN = sin(40°)
  stepX = CHAR_W / scale
  stepZ = CHAR_H / (scale * TILT_SIN)
  ```

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
opacity, applied as a CSS-transitioned canvas opacity — see "breathing" below). At
`zoom 1, center {0,0}, intensity 1` it looks identical to a plain full-disc render.

**Loop:** `requestAnimationFrame`; the next frame is scheduled **before** `draw()`, so a
one-off draw error can never freeze the loop. Under reduced motion it draws one static
frame and does not loop. **Perf guard:** the loop is paused on `visibilitychange` while
the tab is hidden and resumed on return (the galaxy renders the full viewport every
frame, so this matters — it's the heaviest always-on runtime cost).

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
- **Breathing:** the composable also emits `intensity` (galaxy opacity). Non-`bright`
  zones dim to `DIM` (0.6) while held so their content reads calmly; the gaps bloom the
  opacity back to full at their midpoint (`base + (1-base)*sin(π·t)`), so the galaxy
  "exhales" as the camera flies. `hero` and `contact` are flagged `bright` and stay at
  full opacity. This lets the readability scrim stay light.
- **Warp streaks:** the composable also emits `travel` (0 while holding, `sin(π·t)`
  mid-gap). `GalaxyBackground` uses it to draw faded ghost copies of each glyph trailing
  toward the vanishing point (`cx, cy`) — particles farther out streak more — so the
  empty gaps feel like *flight*, not just zoom. Crisp on arrival (`travel → 0`). Knobs:
  `STREAK_MAX`, `STREAK_COPIES` in `GalaxyBackground.vue`.
- **Chapter rail:** the composable emits `activeIndex` (held zone, or the nearer one
  mid-gap). [`JourneyRail.vue`](../src/components/JourneyRail.vue) renders a fixed
  right-edge dot-per-zone indicator with the active label lit and a progress fill — a
  pure orientation cue (non-interactive, `aria-hidden`, hidden < 768px).
- Pinned sections are sticky, so their inner `#id` box is **not** a stable anchor. The
  camera measures the non-sticky wrapper carrying `data-journey="<id>"` (the
  `.present-track`), falling back to `#id` for the non-pinned hero.
- Passive scroll + rAF throttle; re-measures (with retries) until the lazy sections
  exist; no-op under reduced motion (galaxy static, journey off).

### Empty gaps

Between every section is `<div class="journey-gap" aria-hidden>` (`pointer-events:none`).
Length is the `--journey-gap` CSS var (default `110vh`). Collapses to `0` under
reduced-motion and on small screens.

### Pinned presentation — `JourneyPresentation.vue` + `useScrollPresentation()`

Each journey section (About, TechStack, Projects, HomeLab, Contact) is wrapped so it
**pins** to the viewport and reveals its content progressively as you scroll.

- `useScrollPresentation(trackRef)` → `progress` 0→1 across a tall track whose inner
  content is `position:sticky; top:0`:
  `progress = clamp((scrollY - trackTop) / (trackHeight - viewportHeight), 0, 1)`.
  Under reduced motion `progress = 1`.
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
    transform: translateY(calc((1 - var(--t)) * 2.5rem + (1 - var(--exit,1)) * -1.5rem));
  }
  ```

  So step *i* fades+rises in over `reveal` `i/steps → (i+1)/steps`, the slide holds
  fully visible, then fades+drifts up as you scroll away — each section reads as a
  self-contained slide. Tune the pacing via the `0.62` / `0.18` split.

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
`SectionHeader` keeps its own `useScrollReveal`.

### Responsive / a11y fallback

Under `@media (max-width:767px)` **and** `prefers-reduced-motion: reduce`: pinning is
disabled (`.present-track{height:auto}`, `.present-sticky{position:relative;min-height:0}`
— relative, not static, so the scrim still anchors), everything is revealed
(`.present-step{opacity:1;transform:none}`), and `.journey-gap` collapses to `0`.
Sections then flow normally. The chapter rail is hidden < 768px.

---

## Tunables at a glance

| Knob | Where | Effect |
|---|---|---|
| `--journey-gap` | `globals.css` `:root` | length of the empty camera-travel gaps |
| `--present-track` | `globals.css` `:root` | scroll distance / pace of a pinned reveal |
| `--reveal` / `--exit` split (`0.62` / `0.18`) | `globals.css` `.present-track` | reveal vs hold vs exit-fade pacing of a slide |
| `:steps` | per section in `App.vue` | number of staged reveal steps |
| `ZONES` zoom/center/`bright` | `useGalaxyJourney.js` | per-section camera target + which stay full-opacity |
| `DIM` | `useGalaxyJourney.js` | galaxy opacity while reading a dimmable section (breathing) |
| `FONT_SIZE` | `GalaxyBackground.vue` | base glyph size |
| `TWINKLE_SPEED_BASE/VAR` | `GalaxyBackground.vue` | twinkle rate / spread |
| `STREAK_MAX` / `STREAK_COPIES` | `GalaxyBackground.vue` | warp-streak length / ghost-copy count |
| `OUTER_R` | `GalaxyBackground.vue` | galaxy disc radius |
| scrim alphas | `globals.css` `.present-sticky::before` | section readability vs galaxy visibility |
