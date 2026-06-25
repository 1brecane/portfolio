# Features — Starfield/planets background & the cinematic journey

This doc covers the two Canvas background layers and the scroll "journey" that flies a
camera through them. It is the canonical reference for `StarfieldBackground.vue`,
`AsciiPlanets.vue`, `useGalaxyJourney`, `useScrollPresentation`, and
`JourneyPresentation.vue`.

> History: an earlier design used a Canvas 2D ASCII **spiral galaxy**
> (`GalaxyBackground.vue`) plus a CSS `AsciiStarfield`. The `refactor/pixel` redesign
> replaced both with the depth-starfield + ASCII planets described here. References to the
> galaxy, a first-visit intro fly-in, velocity-aware warp, and the `v-tilt`/`sheen` card
> effects were part of that old system and are gone — if you find any lingering, fix them.

---

## Background layers

Two **fixed**, full-viewport Canvas 2D layers sit at `z-0`, behind the page (page content
is `z-[2]`). Both are mounted at the app root in [`src/App.vue`](../src/App.vue) and both
are driven by the scroll journey (`useGalaxyJourney`):

1. **`StarfieldBackground.vue`** — a pseudo-3D ASCII depth-starfield you fly *through*.
   Replaces the old galaxy **and** the old DOM starfield with a single layer.
2. **`AsciiPlanets.vue`** — the ASCII "worlds" you meet at three journey zones, sitting
   just above the starfield (still `z-0`, behind content).

Both honor `prefers-reduced-motion`, render a **single static frame** (no rAF loop) on
small screens (`max-width: 767px`) and under `prefers-reduced-data: reduce`, and use a
DPR-aware backing store (capped at 2×) so glyphs stay crisp on high-DPR phones. The shared
`staticMode()` guard (reduced motion **or** small screen **or** reduced-data) is watched
live via `matchMedia`, so toggling any of them starts/stops the loop (`applyMode()`). Both
loops also pause on `visibilitychange` while the tab is hidden.

---

## The starfield — `StarfieldBackground.vue`

Stars live in a pseudo-3D space (`x, y ∈ [-0.5, 0.5]`, depth `z ∈ (0, 1]`) and project
from the screen center, so they spread outward as they approach — you fly **through** a
field rather than past a flat one. ASCII glyphs (`. : · * + = % @`) keep the identity;
~10% are tinted with the site's neon accent, the rest a soft blue-white. Star count scales
with viewport area (`DENSITY`), capped at `MAX_STARS`.

**Props** (from the journey camera): `zoom` (accepted for parity, **unused** — a flat
field has no "fly-into" zoom; `travel` carries the forward motion), `center {x,y}`,
`intensity`, `travel`.

- **`intensity` → opacity breathing.** Multiplied into every glyph's alpha (not a CSS
  `opacity` on the canvas, which would promote a compositing layer and blur the field).
  Dims while reading a section, blooms back in the gaps.
- **`travel` → forward push + motion-smear.** A slow `BASE_DRIFT` keeps the field alive at
  rest; `travel` adds forward speed mid-gap (`BASE_DRIFT + travel·TRAVEL_SPEED`). While
  `travel > 0`, each star also draws `TRAIL_COPIES` faded ghost copies bridging where it
  was ~70 ms ago to where it is now, so the streak length scales with speed and reads as a
  continuous whoosh. Crisp again on arrival (`travel → 0`).
- **`center` → parallax.** A small offset as you progress through the journey; scaled
  per-star by depth (near stars shift more).
- **Mouse parallax.** A depth-scaled, eased mouse offset (`MOUSE_SHIFT`) — the "drift +
  parallax" feel chosen in brainstorming. Disabled in static mode.

Stars are recycled when they pass the near plane (`NEAR_Z`) or drift off-screen.

**Comets.** A rare **screen-space** comet crosses the sky — a reward for whoever watches.
A head `*` leads a `COMET_TRAIL` (10)-point trail of fading `·` ghosts; trail point objects
are **reused** once the trail is warm, so there's no per-frame allocation. One at a time:
the next spawn is scheduled a random `COMET_MIN_DELAY`–`COMET_MAX_DELAY` (15–30 s) ahead,
entering from a random side at `COMET_SPEED` (260 px/s) on a shallow **12–30° downward
diagonal**. Drawn **after** the star pass, at a fixed screen-space font (`COMET_FONT_PX`,
since the star loop leaves `ctx.font` at a per-star size), colored with the neon accent
(`NEON_RGB`) and dimmed by `intensity`. Both glyphs are **ink-centered** on the trail
line: the asterisk head sits high in its cell while the middot is centered, so each glyph's
actual ink bounds are measured once and drawn on the alphabetic baseline with a per-glyph
offset (otherwise the head floats above the tail). The comet uses `rgba` fill (no
`globalAlpha` to reset). Animated mode only: the static paths pass `dt = 0`, and a `dt ≤ 0`
guard (static frame or hidden-tab resume) only **(re)schedules** rather than spawning — no
comet burst when the tab comes back.

**Tunable knobs** (top of the file): `GLYPHS`, `DENSITY`, `MAX_STARS`, `F` (focal),
`NEON_RATE`, `BASE_DRIFT`, `TRAVEL_SPEED`, `MOUSE_SHIFT`, `CENTER_SHIFT`,
`SIZE_BASE`/`SIZE_K`/`SIZE_MAX`, `TRAIL_COPIES`, `NEAR_Z`, and the comet set
(`COMET_MIN_DELAY`/`COMET_MAX_DELAY`/`COMET_TRAIL`/`COMET_SPEED`/`COMET_FONT_PX`).

---

## The planets — `AsciiPlanets.vue`

Three ASCII "worlds" anchored to journey zones, each rendered with a luminance glyph ramp
(` .:-=+*#%@`), slowly rotating, lit from a fixed direction, shaded through a multi-stop
palette so each has depth:

| Zone (index) | style | role |
|---|---|---|
| hero (0) | ringed planet | the START you depart from |
| projects (3) | crescent | a world glimpsed mid-flight |
| contact (5) | full sphere | the destination you ARRIVE at |

Driven by the journey's **monotonic `progress`** (`i` = holding zone `i`, `i+t` = `t`
through the gap toward `i+1`). For a world at zone `Z`, with `d = progress − Z`:

- **`d < 0` (approaching):** flies in from the distance — small → full size, fading up. You
  meet it in the open gap *before* its section.
- **`d = 0` (at the section):** full size at its screen anchor (`pos`).
- **`d > 0` (passed it):** since you keep flying forward, it comes **toward** you — grows
  past full and slides outward off the screen edge (away from center, `OUT_PUSH`) while
  fading. It dissolves toward the viewer, never receding.

Exactly one world is on screen at a time (`d` outside `(−APPROACH, DEPART)` is skipped) —
cheap and narrative. The dramatic moments land in the **open gaps**, not behind pinned
panels, so the worlds read.

Notes / current limitations worth knowing:

- **No `intensity` input.** Unlike the starfield, the planets are *not* dimmed while a
  section is held — App.vue passes only `:progress`. A world at full size during a hold
  (e.g. the contact sphere near screen center) sits at full brightness behind that
  section's content.
- **Mobile shows only the hero world.** In static mode the camera holds the hero
  (`progress = 0`), so the crescent and sphere never appear on phones / reduced-data /
  reduced-motion.
- **Palettes.** `PALETTES` defines `warm`/`blue`/`green`, but all three worlds currently
  use `warm`. `blue`/`green` echo the `color N` terminal palettes and are available if you
  want to differentiate the worlds.

**Tunable knobs:** `WORLDS` (per-world `index`/`style`/`palette`/`pos`/`scale`), `FONT`,
`ROT_SPEED`, `BASE_R`, `SMALL`/`LARGE` (far/near size factors), `APPROACH`/`DEPART` (the
fade-in/out window in progress units), `OUT_PUSH`, `RAMP`, `PALETTES`.

---

## The journey — pinned presentations + camera flight

The page is a cinematic flight through the starfield. Sections behave like **pinned
slides** that reveal their content as you scroll; between them are **empty gaps** where
only the background shows while the camera travels to the next zone. The camera flies *in*,
then pulls back *out* for Contact (the climax).

### Camera — `useGalaxyJourney()`

Returns reactive `{ zoom, center, intensity, travel, activeIndex, progress }`. (The name is
historical — it once fed a galaxy; it now drives the starfield and planets.) It defines one
**zone** per section, ordered by scroll, each with a target `zoom` and `center {x,y}`:

| Zone | zoom | center |
|---|---|---|
| hero | 1.0 | (0, 0) |
| about | 1.8 | (0.5, -0.3) |
| stack | 2.2 | (-0.5, 0.2) |
| projects | 2.6 | (0.2, 0.5) |
| homelab | 3.4 | (-0.2, -0.2) |
| contact | 1.0 | (0, 0) — pulls back out as the climax |

- While a section is **on screen**, the camera **holds** that zone (stable backdrop).
- While in the **empty gap** between two sections, it **interpolates** (smoothstep) toward
  the next zone.
- **Pull-back arc:** the zoom doesn't ramp straight. A mid-gap `sin(π·t)` arc (0 at both
  ends, 1 at the midpoint) is *subtracted* from the eased zoom — the camera dezooms to
  reveal more, then pushes back in. The same `arc` drives the bloom and `travel`, so all
  three peak together mid-flight. Floored at `MIN_ZOOM`. Knobs: `PULLBACK`, `MIN_ZOOM`.
- **Breathing (`intensity`):** non-`bright` zones dim to `DIM` (0.6) while held so content
  reads calmly; the gaps bloom opacity back to full at their midpoint
  (`base + (1-base)·sin(π·t)`). `hero` and `contact` are flagged `bright` and stay full.
  Consumed by the starfield (the planets ignore it — see above).
- **Warp (`travel`):** 0 while holding, `sin(π·t)` mid-gap. The starfield turns it into a
  forward push + motion-smear (see StarfieldBackground), so the gaps feel like *flight*.
  Stopping mid-gap freezes the current value (no scroll → no update), as before.
- **Worlds (`progress`):** a **monotonic** position (only ever increases as you scroll
  down: `i` holding, `i+t` through a gap). Unlike `travel`'s symmetric arc, this lets
  `AsciiPlanets` tell "approaching" from "already passed" a zone and fly the worlds toward
  you.
- **Chapter rail:** the composable emits `activeIndex` (held zone, or the nearer one
  mid-gap). [`JourneyRail.vue`](../src/components/JourneyRail.vue) renders a fixed
  right-edge dot-per-zone indicator with the active label lit and a progress fill. Each dot
  is a real **button** that flies the camera to that section via `scrollToZone()` (labels
  reveal on hover/focus) — an orientation cue *and* a quick-jump menu. Each row also shows
  an always-visible **zero-padded chapter number** (`01`–`06`, mono 0.6rem, muted,
  `aria-hidden` — the label is the accessible name; the active one lights up in primary),
  and arriving at a chapter fires a one-shot **radar ping**: a ring `:key`ed on
  `activeIndex` (so each arrival re-renders it) animating `rail-ping` — 900 ms, scale
  0.5→2.1, fading out. The ping is anchored inside an **unscaled `__dotwrap` wrapper**: the
  dot itself scales on hover/active, and nesting the ping in the dot would compound that
  transform with the ping keyframes. It fires once on mount for the hero dot and is
  `display:none` under reduced motion. The rail is a `<nav aria-label>`, hidden < 768px and
  in flat view.
- Pinned sections are sticky, so their inner `#id` box is **not** a stable anchor. The
  camera measures the non-sticky wrapper carrying `data-journey="<id>"` (the
  `.present-track`), falling back to `#id` for the non-pinned hero.
- Passive scroll + rAF throttle; re-measures (with retries) until the lazy sections exist;
  holds the hero view (no flight) under reduced motion / small screen / reduced-data /
  flat ("soft off"), detaching everything under reduced motion.

### Empty gaps

Between every section is `<div class="journey-gap" aria-hidden>` (`pointer-events:none`).
Length is the `--journey-gap` CSS var (default `110vh`). Collapses to `0` under
reduced-motion, on small screens, and in flat view. A **sticky "keep scrolling" chevron**
(`.journey-gap::before`, `gap-bob` keyframes) rides along each gap so a fast scroller knows
the flight continues to the next slide; it's hidden wherever the gap collapses.

### Pinned presentation — `JourneyPresentation.vue` + `useScrollPresentation()`

Each journey section (About, TechStack, Projects, HomeLab, Contact) is wrapped so it
**pins** to the viewport and reveals its content progressively as you scroll.

- `useScrollPresentation(trackRef)` → `progress` 0→1 across a tall track whose inner
  content is `position:sticky; top:0`:
  `progress = clamp((scrollY - trackTop) / (trackHeight - viewportHeight), 0, 1)`.
  **Pinned to 1 wherever the layout is flattened** — reduced motion, `< 768px`, **and** flat
  ("simple view"): the track is un-pinned (`height:auto`) there, so scroll-through progress
  is meaningless, and a flattened section taller than the viewport would otherwise sit near
  0 while its title is on screen, leaving the `SectionHeader` decode stuck on glyphs. The
  three flattening inputs are watched live (`matchMedia` + the `useJourneyMode` ref), and
  `reevaluate()` re-measures and re-attaches listeners when any flips back. **Perf:**
  `trackTop`/height are measured once and cached (re-measured on mount, window resize, and a
  `ResizeObserver` on `<body>` for lazy mounts / locale / font shifts); the per-frame path
  reads only `scrollY`. Measuring every frame (× the five sections) forced reflow-on-write
  **layout thrashing** — don't reintroduce a per-frame `getBoundingClientRect`.
- `JourneyPresentation.vue` (props `zone`, `steps`) renders:

  ```html
  <div class="present-track" :data-journey="zone"
       :style="{ '--present': progress, '--steps': steps }">
    <div class="present-sticky"><slot/></div>
  </div>
  ```

- **Staged reveal → hold → exit**, pure CSS math (the only per-frame JS is setting
  `--present`). The track derives three helpers from `--present`: `--reveal`
  (`present / 0.62`, clamped) drives the staged entrance, `--exit`
  (`(1 - present) / 0.10`, clamped) drifts the slide back out over the last 10% —
  a LONG hold so the slide feels anchored to its spot, leaving only as the camera does —
  and `--hold-t` (0→1 across the 0.62→0.90 hold band) drives the short-viewport hold-pan.
  Each revealable child gets `class="present-step"` + inline `style="--step: <i>"`:

  ```css
  .present-track {
    --reveal: clamp(0, calc(var(--present, 1) / 0.62), 1);
    --exit: clamp(0, calc((1 - var(--present, 1)) / 0.10), 1);
    --hold-t: clamp(0, calc((var(--present, 1) - 0.62) / 0.28), 1);
  }
  .present-step {
    --t: clamp(0, calc(var(--reveal, 1) * var(--steps, 1) - var(--step, 0)), 1);
    opacity: calc(var(--t) * var(--exit, 1));
    transform: translate(
        calc((1 - var(--t)) * var(--enter-x, 0) * 2.5rem + (1 - var(--exit, 1)) * var(--exit-x, 0) * 3.5rem),
        calc((1 - var(--t)) * var(--enter-y, 1) * 2.5rem + (1 - var(--exit, 1)) * var(--exit-y, 0) * 3.5rem)
      )
      rotate(calc((1 - var(--exit, 1)) * var(--exit-rot, 0deg)))
      scale(calc(0.97 + var(--exit, 1) * 0.03));
  }
  ```

  So step *i* fades in over `reveal` `i/steps → (i+1)/steps`, entering from the per-zone
  `--enter-x/y` direction (the camera pan from the previous zone; default rise-from-below).
  The slide holds fully visible, then **drifts out along `--exit-x/y`** — opposite to the
  camera pan toward the next zone, with a micro lean (`--exit-rot`) and a whisper of scale
  (1 → 0.97) — so leaving a section reads as the camera *panning away*. The vectors are
  computed by `getZoneFlow(zoneId)` in `useGalaxyJourney.js` from the `ZONES` centers and
  set as CSS vars by `JourneyPresentation.vue`. Tune the drift distances via the `2.5rem`
  (enter) / `3.5rem` (exit) factors in `globals.css`. The About timeline's connector rail
  drifts out with the same `--exit-x/y` vector so it leaves *with* its cards.
- **Short-viewport hold-pan.** On laptop heights a slide can be taller than the viewport:
  no flex slack to center it, the bottom is cut and the title pins under the navbar. Two
  fixes: (a) the section's `padding-top` has a `max(…, 5rem)` floor so the pinned title
  always clears the navbar (binds only when there's no slack), and (b) `JourneyPresentation`
  measures the slide's overflow (`sticky.scrollHeight − innerHeight`, ≥ 0) into a `--pan`
  px var, and the section translates up by `round(pan · hold-t, 1px)` — the long hold scrub
  slowly pans the slide to expose its bottom before the exit. `--pan` is 0 wherever the
  slide fits. The three flattening fallbacks reset the pan with `translate: none`.
- **Reading settle (scroll-snap):** each track carries a single `<span class="present-snap">`
  at `0.7 · (trackHeight − vh)` — the fully-revealed hold position — with
  `scroll-snap-align: start` + `scroll-snap-stop: normal`, and `html { scroll-snap-type: y
  proximity }`. *Proximity* leaves scrolling free through the gaps and mid-reveal; when the
  user comes to **rest** near a section's reading point the browser eases them onto it.
  `scroll-snap-stop: normal` (not `always`) keeps the rest-settle but lets a scroll in
  motion flow past. Disabled wherever sections aren't pinned.
- **Crispness:** `.present-step` deliberately has **no `will-change`**. A permanent GPU
  layer rasterizes its text (and the glass cards' `backdrop-filter`) blurry whenever the
  reveal translate sits at a sub-pixel offset. Without it, the browser composites during
  active scroll and de-promotes at rest (translate exactly 0 → crisp). The scroll-snap
  settles the user into that crisp band.

**Per-section step counts** (set via `:steps` in `App.vue`, with matching `--step` on each
block):

| Section | steps | what each step is |
|---|---|---|
| About | 3 | timeline entries |
| TechStack | 4 | category cards |
| Projects | 5 | 4 project cards + the "view all" button |
| HomeLab | 1 | the card |
| Contact | 1 | the form block |

These replace the old per-section reveals (`stagger-children` / `scroll-reveal` /
`isVisible` opacity) so they don't fight `present-step`. The shared `SectionHeader` is
itself a `present-step` (`--step: 0`), so the **title reveals and recedes with the slide**;
`SectionLayout` no longer uses `useScrollReveal`. (The `FooterSection`, outside the journey,
still uses `useScrollReveal` for a plain fade-in.)

The title also **decodes** while the slide reveals: `JourneyPresentation` `provide()`s its
`progress` ref (`presentProgress`), and `SectionHeader` renders the title resolving
left-to-right from glyphs (`.·+*#@%&`), fully resolved by half the reveal. Deterministic
hash per (char, quantized progress) — no timers; static at rest; the real title stays in an
`sr-only` span (the scramble is `aria-hidden`). Plain title wherever `progress` is forced to
1 (flat / small / reduced motion).

### Navigation & view modes

- **Anchor scrolling — `scrollToZone(id)`**
  ([`useJourneyScroll.js`](../src/composables/useJourneyScroll.js)). A nav/rail click can't
  just jump to `#about`: the section is `sticky` inside a tall `.present-track`, so landing
  at the track top shows the slide *un-revealed* (`--present ≈ 0`). `scrollToZone` instead
  scrolls to `trackTop + 0.65 * (trackHeight - vh)` — fully shown, not yet exiting. In flat
  view / small screens / reduced motion it falls back to a plain top-of-element scroll
  (minus an 80px nav offset). Wired into NavBar (links, logo, contact), the hero CTA +
  scroll cue, and every rail dot. All keep their `href` for right-click/share but
  `@click.prevent` to call `scrollToZone`.
- **Deep links.** [`App.vue`](../src/App.vue) reads `location.hash` on mount and calls
  `scrollToZone` once the target track exists (retries `[300, 700, 1300, 2000]ms`, since the
  sections are lazy), so `/#projects` opens straight to a revealed Projects slide.
- **Cinematic ⇄ flat ("simple view") — `useJourneyMode()`**
  ([`useJourneyMode.js`](../src/composables/useJourneyMode.js)). A module-level singleton
  (`"cinematic" | "flat"`) persisted to `localStorage` and mirrored onto
  `<html data-journey-mode>`. **Flat** flattens the layout (same CSS as the responsive
  fallback — collapses gaps, un-pins tracks, reveals all steps) so repeat visitors can skip
  the long scroll. The camera holds the hero view in flat; the rail hides. Toggled by
  [`JourneyModeToggle.vue`](../src/components/ui/JourneyModeToggle.vue) in the NavBar
  (desktop only — < 768px is already flattened). The toggle also shows a **one-time
  first-visit hint** (~2.5s after load, auto-dismissing after 12s); it never returns once
  dismissed or once a `journey-mode` choice exists (`journey-hint-seen` key). The button
  keeps a fixed accessible name ("Simple view") with `aria-pressed` reflecting flat mode.

### Responsive / a11y fallback

Under `@media (max-width:767px)` **and** `prefers-reduced-motion: reduce`: pinning is
disabled (`.present-track{height:auto}`, `.present-sticky{position:relative;min-height:0}`),
everything is revealed (`.present-step{opacity:1;transform:none}`), and `.journey-gap`
collapses to `0`. Sections then flow normally. The chapter rail is hidden < 768px. The
manual **flat** view (`[data-journey-mode="flat"]`) applies the exact same flattening on
demand. `useScrollPresentation` pins `progress` to 1 under all three so decoded titles
resolve.

**Short-viewport compaction.** Tailwind breakpoints are *width*-based, so a small laptop
(short viewport) gets full desktop type/spacing even though it's short — and a pinned slide
is `min-height:100vh` and can't scroll internally, so oversized content overflows. Two
layers: scale the **root `font-size`** down on short viewports (`@media (min-width:768px)
and (max-height:900px) → 15px`, `… and (max-height:720px) → 14px` + trimmed `--present-pad`),
and the **hold-pan** pans whatever still doesn't fit. Gated to the pinned range (≥768px
wide). See `globals.css`.

---

## The hero terminal

The hero's right column is a draggable fake terminal window that types an intro, then
becomes a real interactive shell. Logic is split: `useTypewriter` (the intro animation),
`useTerminalShell` (the shell brain — no DOM), and `HeroSection.vue` (window chrome +
wiring). The keyboard model is unchanged from before: a visually-hidden focusable
`<input>` receives keys (so touch keyboards open too) and `handleKey` forwards them.

### Typewriter intro — `useTypewriter()`

Types `t.hero.terminal` line-by-line with a **human rhythm**: per-char delay jittered
`CHAR_MIN_MS`–`CHAR_MIN_MS+CHAR_JITTER_MS` (18–46 ms), `+PUNCT_PAUSE_MS` after `,.;:!?`,
an occasional `SPACE_PAUSE_MS` hesitation on spaces, `LINE_PAUSE_MS` between lines.
`finish()` reveals everything instantly — the hero calls it on the **first keypress or a
click on the body** while the intro is still typing, so the intro never blocks input.
Under `prefers-reduced-motion` (at mount or on a live media-query flip) it skips straight
to the finished state. A locale switch restarts it (`watch(lines)`). Exposes
`{ displayedLines, isFinished, finish }`.

### Interactive shell — `useTerminalShell({ t, setColorScheme, onClear })`

Once the intro finishes, Enter runs a command. The shell keeps a growing **scrollback**
(`entries`, an array of `{ id, cmd, output: [{ text, kind }] }`, capped at
`MAX_ENTRIES = 50`, oldest dropped) rendered above the live prompt; the terminal body has
`max-h-[22rem] overflow-y-auto` and auto-scrolls to the bottom after each command, so the
hero never grows. `kind` (`plain`/`accent`/`error`/`dim`) maps to a theme class via
`LINE_CLASS` in `HeroSection`. Session-only **history**: ↑/↓ recall previous commands (a
plain array, no persistence). `clear` empties the scrollback **and** the intro (via a
`hideIntro` flag), like a real `clear`.

Commands:

| Command | Output |
|---|---|
| `help` | localized command list (`t.hero.shell.help`) |
| `whoami` | `samuele_ruaro` |
| `ls` | `about.txt  projects.txt  starwars.txt` |
| `cat ./about.txt` | the intro's about lines (read back from `t.hero.terminal` — single source) |
| `cat ./projects.txt` | project titles from `t.projects.items` + a dim "scroll down" invite |
| `cat ./starwars.txt` | ASCII art from `terminalEasterEggs.json` |
| `neofetch` | ASCII badge + a localized profile card (role, stack, uptime) |
| `sudo <anything>` | a localized permission-denied joke |
| `color <1\|2\|3>` | sets the `useColorScheme` palette singleton (see note) |
| `clear` | wipes scrollback + intro |
| anything else | `bash: <cmd>: command not found` + a localized `help` hint |

`command not found`, the `cat: … No such file or directory` error, and the `whoami`/`ls`/
`color` outputs stay **literal English** (authentic shell speak); only descriptions and
jokes are localized — and **both `en.js` and `it.js` carry the same-shaped `hero.shell`
object**. Note: `color N` still writes the `useColorScheme` singleton, but the new
starfield doesn't read it, so the command is currently cosmetically inert (kept for a
future palette-driven background).

### Prompt & window title

`TerminalPrompt.vue` renders a `samuele@portfolio:~$ ` prompt in theme tokens
(`samuele@portfolio` in chart-2, `~` in primary, the rest foreground; `select-none` +
`aria-hidden` since it's decorative repetition). It's used on the intro command lines (the
i18n `"$ "` prefix is stripped at render), the scrollback command lines, and the live
input line. The title bar (once a static `bash`) now mirrors the **last command** via a
`windowTitle` computed: `samuele@portfolio: <lastCmd>` truncated past `TITLE_MAX` (24)
chars, falling back to `~` at rest and after `clear`.

---

## Micro-interactions

Three small, independent effects
(spec: `docs/superpowers/specs/2026-06-11-micro-interactions-design.md`).
All hover effects are gated on `(hover: hover) and (pointer: fine)`; transforms are
suppressed under `prefers-reduced-motion: reduce`.

> A fourth effect, a glass-card **sheen** sweep (paired with a `v-tilt` directive), was part
> of the pre-`refactor/pixel` design and has been removed along with `directives/tilt.js`.

| Effect | Where | How |
|---|---|---|
| `.tactile` press & lift | `AppButton` (all CTAs), `ScrollToTop`; `.tactile-press` (press-only, scale 0.94) on `LocaleToggle` / `JourneyModeToggle` | Hover lifts 2px (`translateY(-2px)`) + soft `--neon-glow` shadow (`box-shadow 0 4px 16px`); `:active` squashes (`.tactile`: scale 0.96, `.tactile-press`: scale 0.94) with a 60ms `transition-duration`. Both classes own the `transition` property — `transform`, `box-shadow`, `color`, `background-color`, `border-color` — so they win over Tailwind's layered `transition-colors`. |
| `v-scramble` (`src/directives/scramble.js`) | The 5 desktop nav links (label wrapped in `<span v-scramble>`) | Rescrambles the label with the glyph set `".·+*#@%&"`, resolving left-to-right over 12 frames × 26ms. Text is read at hover time (not cached at mount) so it stays locale-safe. Restores on leave/unmount; a reactive text change mid-scramble (e.g. locale flip) cancels via the `updated` hook and keeps Vue's new text. Mutates `firstChild.nodeValue` so the tracked text node keeps its identity. Single-text-node elements only. No-ops on touch/coarse pointers and under `prefers-reduced-motion`. |
| `.neon-cta` glow | Nav **Contact** button, hero primary CTA, contact form submit — exactly three, deliberately scarce | Hover/focus-visible phosphor halo (`box-shadow: 0 0 24px` + `0 0 56px var(--neon-glow)`). Declared after `.tactile` so its hover shadow wins; on the hero CTA it intensifies the static `.neon-glow` rest state (20px/40px). `focus-visible` composes Tailwind's `--tw-ring-offset-shadow`/`--tw-ring-shadow` custom props in front of the glow, so the keyboard focus ring survives. Hover is media-gated; `focus-visible` is ungated. Runs under reduced motion (the global 0.01ms override just makes it instant). |

---

## Tunables at a glance

| Knob | Where | Effect |
|---|---|---|
| `--journey-gap` | `globals.css` `:root` | length of the empty camera-travel gaps |
| `REVEAL_POINT` (`0.65`) | `useJourneyScroll.js` | where in a track an anchor jump lands (fully-revealed slide) |
| `gap-bob` / `.journey-gap::before` | `globals.css` | the sticky "keep scrolling" chevron in each gap |
| `--present-track` | `globals.css` `:root` | scroll distance / pace of a pinned reveal |
| `--reveal` / `--exit` split (`0.62` / `0.10`) | `globals.css` `.present-track` | reveal vs hold vs exit-drift pacing of a slide (long hold: exit only starts at 0.90) |
| `--pan` + `--hold-t` | `JourneyPresentation.vue` + `globals.css` | short-viewport hold-pan: slide overflow exposed across the hold |
| `padding-top` floor (`5rem`) | `globals.css` `.present-sticky > section` | keeps a slack-less pinned title clear of the fixed navbar |
| snap point (`0.7`) | `globals.css` `.present-snap` | where the proximity scroll-snap settles a section for reading |
| `:steps` | per section in `App.vue` | number of staged reveal steps |
| `ZONES` zoom/center/`bright` | `useGalaxyJourney.js` | per-section camera target + which stay full-opacity |
| `DIM` | `useGalaxyJourney.js` | starfield opacity while reading a dimmable section (breathing) |
| `PULLBACK` / `MIN_ZOOM` | `useGalaxyJourney.js` | mid-gap camera dezoom amount (the flight arc) / its floor |
| `--enter-x/y`, `--exit-x/y`, `--exit-rot` | set by `JourneyPresentation.vue` from `getZoneFlow()` | per-zone drift directions (derived from `ZONES` centers; `FLOW_TILT` maps galaxy y → screen y) |
| drift distances (`2.5rem` enter / `3.5rem` exit) + exit scale floor (`0.97`) | `globals.css` `.present-step` | how far slides travel in/out and the depth whisper |
| `GLYPHS` / resolve point (`reveal / 0.5`) | `SectionHeader.vue` | title-decode glyph set / how early the title is fully readable |
| `rail-ping` (900ms, scale 0.5→2.1) | `JourneyRail.vue` scoped CSS | the chapter-arrival radar ping's duration and spread |
| `DENSITY` / `MAX_STARS` | `StarfieldBackground.vue` | star spacing (lower = denser) / hard cap on big viewports |
| `F` / `SIZE_BASE` / `SIZE_K` / `SIZE_MAX` | `StarfieldBackground.vue` | projection field-of-view / near-far glyph sizing |
| `BASE_DRIFT` / `TRAVEL_SPEED` | `StarfieldBackground.vue` | idle forward creep / extra forward speed at full `travel` |
| `TRAIL_COPIES` | `StarfieldBackground.vue` | motion-smear ghost copies per star while flying |
| `MOUSE_SHIFT` / `CENTER_SHIFT` / `NEON_RATE` / `NEAR_Z` | `StarfieldBackground.vue` | mouse parallax / journey-center parallax / neon-tinted fraction / recycle plane |
| `COMET_MIN_DELAY` / `COMET_MAX_DELAY` | `StarfieldBackground.vue` | comet spawn window (random delay between comets, in seconds) |
| `COMET_TRAIL` / `COMET_SPEED` / `COMET_FONT_PX` | `StarfieldBackground.vue` | comet trail length / head speed (px/s) / fixed screen-space glyph size |
| `WORLDS` (pos/scale/style/palette) | `AsciiPlanets.vue` | which world sits at which zone, where on screen, and how big |
| `FONT` / `ROT_SPEED` / `BASE_R` | `AsciiPlanets.vue` | planet glyph size / spin rate / radius as a fraction of min(viewport) |
| `SMALL` / `LARGE` / `APPROACH` / `DEPART` / `OUT_PUSH` | `AsciiPlanets.vue` | far/near size factors / fade-in & fade-out windows (progress units) / off-screen push while passing |
| `PALETTES` (`warm`/`blue`/`green`) | `AsciiPlanets.vue` | per-world shadow→highlight color ramps |
| scrim alphas | `globals.css` `.present-sticky::before` | section readability vs background visibility |
| lift 2px / press scale 0.96 / 0.94 | `globals.css` `.tactile` / `.tactile-press` | hover lift height and `:active` squash depth for buttons vs small icon controls |
| 12 × 26ms (`FRAMES` / `FRAME_MS`) | `src/directives/scramble.js` | scramble duration and frame count for nav-link glyph resolve |
| 24px / 56px (`neon-cta` shadows) | `globals.css` `.neon-cta` | phosphor halo spread on the three primary CTAs |
| `CHAR_MIN_MS` / `CHAR_JITTER_MS` / `PUNCT_PAUSE_MS` / `SPACE_PAUSE_MS` / `SPACE_PAUSE_CHANCE` / `LINE_PAUSE_MS` | `useTypewriter.js` | terminal intro typing rhythm (per-char jitter, punctuation/space pauses, between-line pause) |
| `MAX_ENTRIES` (50) | `useTerminalShell.js` | hero terminal scrollback cap (oldest entries dropped) |
| `TITLE_MAX` (24) | `HeroSection.vue` | hero terminal window-title truncation length |
