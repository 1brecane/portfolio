# Global Micro-interactions — Design

**Date:** 2026-06-11
**Branch:** `development`
**Status:** Approved by Samuele (visual companion session: options A, B, C, D selected; E magnetic buttons and F icon micro-motion rejected)

## Goal

The interactive primitives are visually polished but tactilely flat: buttons only
transition colors, nav links only grow an underline, glass cards tilt but read as
matte. Add four small, independent micro-interactions that make every interaction
feel physical and on-brand (ASCII/terminal/galaxy language), without touching the
journey/galaxy systems.

All four honor the existing guards: `prefers-reduced-motion` disables transforms
and scramble; hover-only effects are gated on `(hover: hover) and (pointer: fine)`
so touch devices never see half-broken hover states.

## A — Press & lift on buttons (CSS only)

A `.tactile` class in `src/assets/globals.css`:

- **Hover:** `translateY(-2px)` + a soft shadow (`box-shadow` tinted with the
  primary color at low alpha).
- **Active:** `translateY(0) scale(0.96)` with a *shorter* transition duration
  (~60ms) so the press feels immediate; release springs back at the normal
  duration (~160ms).
- The class only adds `transform`/`box-shadow` behavior — color transitions stay
  wherever they are today.

**Applied to:** `AppButton.vue` (baked into its static class list, all variants
and sizes) and the custom interactive controls that don't use AppButton:
`LocaleToggle.vue`, `JourneyModeToggle.vue` (the pill button, not the hint
popover), `ScrollToTop.vue`.

**Reduced motion:** under `prefers-reduced-motion: reduce`, `.tactile` keeps
color/shadow changes but applies no transforms.

**Note:** disabled buttons already get `pointer-events: none` from AppButton, so
no hover/active state fires there.

## B — Glyph scramble on nav links (`v-scramble` directive)

New directive `src/directives/scramble.js`, structured like `src/directives/tilt.js`:

- On `mouseenter`, scramble the element's text with the glyph set `.·+*#@%&`
  (same as the SectionHeader decode), resolving left-to-right over ~12 frames /
  ~0.3s (`setInterval` ≈ 26ms).
- **Reads `textContent` at hover time** (not cached at mount) so the EN/IT locale
  switch stays correct.
- On `mouseleave` (or unmount), clear the timer and restore the original text —
  the element must never be left mid-scramble.
- Whitespace characters are never scrambled (keeps multi-word labels stable).
- **Gates:** does nothing unless `(hover: hover) and (pointer: fine)` matches,
  and does nothing under `prefers-reduced-motion: reduce`. Evaluated per-enter
  (media can change at runtime).
- The directive must only be applied to elements whose content is plain text.

**Applied to:** the 5 desktop nav links in `NavBar.vue`. Not the mobile menu
(touch — no hover), not the brand (nested spans), not footer links (keep the
effect scarce).

**A11y note:** the scramble mutates visible text briefly on hover only; the nav
is not a live region and screen-reader users don't hover, so no sr-only
duplication is needed (unlike the persistent SectionHeader decode).

## C — Neon glow on primary CTAs (CSS only)

A `.neon-cta` class in `globals.css`, companion to the existing `neon-text`:

- **Hover/focus-visible:** green phosphor halo — `box-shadow` outer glow +
  subtle inset glow + `text-shadow`, plus a faint primary-tinted background.
- Transition ~250ms ease.

**Applied to exactly 3 spots** (deliberately scarce): the **Contact** button in
`NavBar.vue` (desktop + mobile menu instances share `contactBtnClass`), the
hero's primary CTA in `HeroSection.vue`, and the contact form submit button in
`ContactSection.vue`.

**Reduced motion:** glow is a fade, not movement — allowed under reduced motion.

## D — Sheen sweep on glass cards (CSS only)

A `.sheen` class in `globals.css`:

- The element gets `position: relative; overflow: hidden` and an `::after`
  pseudo-element: a diagonal gradient strip (transparent → primary at ~13% →
  white at ~10% → transparent), `pointer-events: none`.
- On hover the strip sweeps across via `transform: translateX(...)` over ~0.7s.
- **The transition lives only on the `:hover::after` state**, so on mouseleave
  the strip snaps back off-screen invisibly instead of visibly rewinding.
- Transform-only animation (compositor-friendly); the strip is hidden (off-screen)
  at rest.

**Applied to:** the same glass cards that already carry `v-tilt` — the About
inner card (`AboutSection.vue`), TechStack category cards (`TechStack.vue`),
project cards (`ProjectsSection.vue`), and the HomeLab inner card
(`HomeLabSection.vue`). Tilt transforms the card, sheen transforms a child
pseudo-element — no conflict.

**Caveats:** `overflow: hidden` on the card must not clip existing decorations —
verify per card (box-shadows are not clipped by the element's own overflow;
check for any intentionally overflowing children). Hover-gated via
`(hover: hover) and (pointer: fine)` and disabled under reduced motion.

## Out of scope

- Magnetic buttons (E) and icon micro-motions (F) — rejected in brainstorming.
- Footer links, mobile menu links, JourneyRail (no scramble/glow there).
- Any change to the galaxy, journey camera, or present-step pipeline.

## Verification

No test suite — the gate is `npm run lint` (0 errors; 3 pre-existing warnings
are baseline) + `npm run build`, plus a visual pass on the dev server (hover
each effect; check a touch emulation and `prefers-reduced-motion` show none of
the hover transforms).

`docs/features.md` gains a short "Micro-interactions" section documenting
`.tactile`, `v-scramble`, `.neon-cta`, `.sheen` and their guards, in the same
change.
