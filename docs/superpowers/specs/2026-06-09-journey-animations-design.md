# Journey animations — directional drift, decoding titles, card tilt

**Date:** 2026-06-09
**Status:** approved (brainstormed with visual companion; user picked options D, A, C)

## Goal

Make the section-to-section transitions of the cinematic journey feel like camera
*panning* instead of slides "disappearing", and add two tasteful animations that
reinforce the ASCII-galaxy identity. Three features:

1. **Directional drift exit/enter** for pinned slides (replaces the scale-recede exit).
2. **Decoding section titles** — titles materialize from ASCII glyphs as the slide reveals.
3. **3D tilt on glass cards** on hover.

All three must respect the existing invariants:

- Galaxy hard rules untouched (no rotation, no new particles, zoom-by-glyph-growth).
- Everything scroll-driven (scrubs forward & backward); no time-based one-shots.
- Exact identity transform in the hold band (`--t = --exit = 1`) — the text-crispness
  rule from docs/features.md ("no will-change", de-promotes at rest) keeps holding.
- Flat view / small screens / `prefers-reduced-motion` keep their current fallbacks
  (everything revealed, no pinning, no animation).
- Verify gate: `npm run lint` (0 errors) + `npm run build`.

## 1. Directional drift transitions

**Concept.** Each transition derives its motion from the *actual* camera pan between
the two zones (`ZONES[i].center → ZONES[i+1].center` in `useGalaxyJourney.js`). If the
camera flies right, the outgoing slide drifts left and the next slide enters from the
right moving along the same flow — one continuous pan per gap.

**Mechanics.**

- `useGalaxyJourney.js` exports a helper (e.g. `getZoneFlow(zoneId)`) returning
  normalized screen-space vectors per zone:
  - `enter {x,y}`: direction the slide enters from, derived from `prev.center → this.center`
    (screen-apparent motion: the slide starts offset *against* the flow and settles to 0).
  - `exit {x,y}`: direction the slide leaves toward, derived from `this.center → next.center`.
  - Galaxy-space deltas map to screen with the same axes the camera uses
    (`x → screen x`, `z/y → screen y · TILT`); normalize and flip sign so the slide moves
    opposite to the camera pan (left-behind feel).
  - Edge cases: `about` enters using `hero → about`; `contact` has no next zone — its
    exit defaults to a gentle upward drift `(0, -1)`.
- `JourneyPresentation.vue` looks up the vectors for its `zone` prop and sets static
  inline CSS vars on the track: `--enter-x`, `--enter-y`, `--exit-x`, `--exit-y`,
  `--exit-rot` (≈1°, sign/magnitude proportional to the horizontal exit component).
- `globals.css` `.present-step` becomes:
  - **Enter:** `translate((1 - --t) · --enter-x · D_in, (1 - --t) · --enter-y · D_in)`
    where `D_in ≈ 2.5rem` (current rise distance). Vars default to the current
    behavior (`--enter-x: 0`, `--enter-y: 1`) so anything outside a journey track
    (e.g. future uses) keeps the rise-in.
  - **Exit:** `translate((1 - --exit) · --exit-x · D_out, (1 - --exit) · --exit-y · D_out)`
    with `D_out ≈ 3.5rem`, plus `rotate((1 - --exit) · --exit-rot)` and a whisper of
    scale (`0.97 + --exit · 0.03`) to keep depth. The `scale(0.85)` recede is removed.
  - Enter and exit translates sum inside one `transform`; in the hold band both terms
    are exactly 0 → identity (crispness preserved).
- Opacity math unchanged (`--t · --exit`).
- Fallback blocks (max-767px / reduced-motion / flat) already force
  `opacity: 1; transform: none` — no changes needed.

## 2. Decoding section titles

**Concept.** Each section's `<h2>` resolves left-to-right from ASCII glyphs as the
slide reveals — same glyph language as the galaxy. Scrubbing back re-scrambles.

**Mechanics.**

- `JourneyPresentation.vue` `provide()`s its `progress` ref (key e.g. `presentProgress`).
- `SectionHeader.vue` `inject()`s it (default `ref(1)` when absent — e.g. flat view or
  any header rendered outside a journey track → plain title).
- Derived values: `reveal = clamp(progress / 0.62, 0, 1)` (same constant as the CSS),
  then `titleReveal = clamp(reveal / 0.5, 0, 1)` so the title fully resolves by
  `reveal ≈ 0.5` (before the content cards finish).
- Per character `i` of the title: resolved if `i < floor(titleReveal · len)`, else a
  glyph from the galaxy set (`.·+*#@%&`) picked **deterministically** by hashing
  `(i, quantized progress)` — no rAF, no timers; the flicker comes from scroll itself
  and costs zero at rest. Spaces always render as spaces.
- A11y/SEO: real title in a visually-hidden element (and as the accessible name);
  the scrambling display span is `aria-hidden="true"`. The `<h2>` text content for
  crawlers is the real title.
- Reduced-motion / flat / small screens: `progress` is already forced to 1 → static
  full title, no scramble ever.

## 3. 3D tilt on glass cards

**Concept.** Glass panels tilt subtly toward the cursor with the red glow following —
HUD-glass physicality, hover only.

**Mechanics.**

- New directive `src/directives/tilt.js` registered locally where used (`v-tilt`).
- Listens `mouseenter/mousemove/mouseleave`; rAF-throttled; writes
  `transform: perspective(800px) rotateX(a) rotateY(b) translateY(-4px)` with max ≈ 5°,
  smooth transition on enter/leave (≈250ms), cleared to `''` on leave so the existing
  `.card-glow` CSS hover (shadow) keeps working. The directive owns the `-4px` lift on
  tilted cards; `card-glow`'s own `transform: translateY(-4px)` hover rule must not
  fight it (inline style wins — acceptable, same visual).
- Enabled only when `matchMedia("(hover: hover) and (pointer: fine)")` matches and
  `prefers-reduced-motion` is not set (checked at bind; media changes can simply
  require a reload — not worth live-watching).
- Applied to: project cards, tech-stack category cards, About timeline cards, the
  HomeLab card. **Not** the Contact form panel.
- Touch devices: directive no-ops entirely.

## Out of scope

Comet background, hyperspace nav boost, arrival zoom, logo glitch (proposed, not
selected). Points 1–4 of the earlier UX review (HomeLab chapter cost, project
screenshots, CV modal a11y, contact fallback email) remain future work.

## Documentation

`docs/features.md` must be updated in the same change: the `.present-step` math
(staged reveal → hold → exit), the per-zone flow vectors, the SectionHeader behavior,
and the tunables table (`D_in`/`D_out`/`--exit-rot`, glyph set, tilt max angle).

## Verification

- `npm run lint` — 0 errors (warnings baseline ~3).
- `npm run build` — success.
- Manual: scrub each transition both directions (drift direction matches camera pan,
  no blur in hold band), check deep links still land revealed, flat view & a narrow
  viewport unaffected, tilt inactive on touch/reduced-motion.
