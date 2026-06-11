# Global Micro-interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four small, independent micro-interactions — tactile press/lift on buttons, glyph-scramble on nav links, neon glow on primary CTAs, and a sheen sweep on glass cards — per `docs/superpowers/specs/2026-06-11-micro-interactions-design.md`.

**Architecture:** Three of the four are pure CSS classes added to `src/assets/globals.css` (`.tactile`/`.tactile-press`, `.neon-cta`, `.sheen`) and applied in component templates. The scramble is a new Vue directive `src/directives/scramble.js` modeled on the existing `src/directives/tilt.js`. All hover effects are gated on `(hover: hover) and (pointer: fine)`; all transforms are suppressed under `prefers-reduced-motion: reduce`.

**Tech Stack:** Vue 3.5 `<script setup>`, Tailwind CSS 4 (CSS-first — custom classes live in `globals.css`, NOT a tailwind config), Vite 6. **No test suite** — the verify gate for every task is `npm run lint` (must be 0 errors; 3 pre-existing warnings in ProjectsSection/CvCaptchaModal are baseline, don't chase them) + `npm run build`.

**Working directory:** `/home/sruaro/Documenti/GitHub/portfolio`, branch `development`.

---

### Task 1: `.tactile` press & lift on buttons

**Files:**
- Modify: `src/assets/globals.css` (insert after the `.card-glow:hover` rule, ~line 242)
- Modify: `src/components/ui/AppButton.vue`
- Modify: `src/components/ScrollToTop.vue`
- Modify: `src/components/ui/LocaleToggle.vue`
- Modify: `src/components/ui/JourneyModeToggle.vue`

- [ ] **Step 1: Add the CSS classes**

In `src/assets/globals.css`, directly after the `.card-glow:hover { … }` block, insert:

```css
/* ── Micro-interactions: tactile buttons ─────────────────────────────────────
   .tactile — hover lifts 2px with a soft glow shadow, press squashes (scale
   0.96) with a much shorter transition so the click feels immediate.
   .tactile-press — press-only variant for small segmented/icon controls where
   a hover lift would look broken inside their bordered group.
   These classes own the `transition` property (they're un-layered, so they win
   over Tailwind's layered `transition-colors`) — that's why color/background/
   border are included in the list. Hover is gated to fine pointers (a tap on
   touch would leave a stuck lift); :active stays global so mobile gets press
   feedback too. Reduced motion: no transforms at all (see media block below). */
.tactile {
  transition:
    transform 0.16s ease,
    box-shadow 0.22s ease,
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}
.tactile:active {
  transform: translateY(0) scale(0.96);
  transition-duration: 0.06s;
}
.tactile-press {
  transition:
    transform 0.16s ease,
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}
.tactile-press:active {
  transform: scale(0.94);
  transition-duration: 0.06s;
}
@media (hover: hover) and (pointer: fine) {
  .tactile:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px var(--neon-glow);
  }
  .tactile:active {
    transform: translateY(0) scale(0.96);
  }
}
@media (prefers-reduced-motion: reduce) {
  .tactile:hover,
  .tactile:active,
  .tactile-press:active {
    transform: none;
  }
}
```

Note the duplicated `.tactile:active` inside the hover media block — it must re-assert itself *after* `.tactile:hover` in source order, otherwise while pressing the still-hovering button keeps the -2px lift.

- [ ] **Step 2: Apply to AppButton**

In `src/components/ui/AppButton.vue`, in the static class list, replace `transition-colors` with `tactile` (the `.tactile` transition list covers colors):

```
'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tactile',
```

- [ ] **Step 3: Apply to ScrollToTop**

In `src/components/ScrollToTop.vue`, in the button's class string, replace `transition-transform hover:scale-110` with `tactile`. The result:

```
class="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-primary text-primary-foreground
       shadow-lg neon-glow cursor-pointer tactile
       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

After this change, hover the button in the browser and let the enter/leave fade run (scroll past 600px and back): the scoped `.fade-enter-active` transition is declared later in the cascade than `.tactile`, so the fade must still animate. If the fade stops animating, the fix is to scope `.tactile`'s transition out during the Vue transition (add `.fade-enter-active.tactile, .fade-leave-active.tactile { transition: opacity 0.3s ease, transform 0.3s ease; }` to the component's scoped style) — only do this if actually broken.

- [ ] **Step 4: Apply press-only to the two toggles**

In `src/components/ui/LocaleToggle.vue`, add `tactile-press` to the per-button class string (first entry of the `:class` array):

```
'min-w-[2.25rem] px-2.5 py-1.5 rounded-sm uppercase tracking-wide transition-all duration-200 tactile-press',
```

In `src/components/ui/JourneyModeToggle.vue`, add `tactile-press` to the main toggle button's class (the `h-8 w-8` one — NOT the `journey-hint__dismiss` button):

```
class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground tactile-press transition-colors hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

- [ ] **Step 5: Verify**

Run: `npm run lint` → expected: 0 errors (3 pre-existing warnings OK).
Run: `npm run build` → expected: builds successfully.

- [ ] **Step 6: Commit**

```bash
git add src/assets/globals.css src/components/ui/AppButton.vue src/components/ScrollToTop.vue src/components/ui/LocaleToggle.vue src/components/ui/JourneyModeToggle.vue
git commit -m "Feat: tactile press & lift micro-interaction on buttons"
```

---

### Task 2: `v-scramble` directive on nav links

**Files:**
- Create: `src/directives/scramble.js`
- Modify: `src/components/NavBar.vue` (desktop nav links only)

- [ ] **Step 1: Create the directive**

Create `src/directives/scramble.js`:

```js
/**
 * v-scramble — glyph-scramble hover on a plain-text element.
 *
 * On mouseenter the text is rescrambled with the same ASCII glyph set the
 * SectionHeader decode uses, resolving left-to-right over ~0.3s. The original
 * text is read AT HOVER TIME (not cached at mount) so the EN/IT locale switch
 * stays correct, and it is always restored on leave/unmount — the element is
 * never left mid-scramble. Mutates `firstChild.nodeValue` (not textContent) so
 * the text node Vue tracks keeps its identity.
 *
 * Apply ONLY to elements whose content is a single text node. No-ops on touch /
 * coarse pointers and under prefers-reduced-motion (checked per-enter, since
 * media can change at runtime). Hover-only and transient, so no sr-only
 * duplication is needed (unlike the persistent SectionHeader decode).
 */
const GLYPHS = ".·+*#@%&";
const FRAMES = 12;
const FRAME_MS = 26;

function canScramble() {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const vScramble = {
  mounted(el) {
    let timer = null;
    let original = null;

    function restore() {
      clearInterval(timer);
      timer = null;
      if (original !== null && el.firstChild) {
        el.firstChild.nodeValue = original;
      }
      original = null;
    }

    function onEnter() {
      if (!canScramble() || !el.firstChild) return;
      restore();
      original = el.firstChild.nodeValue;
      const text = original;
      let frame = 0;
      timer = setInterval(() => {
        frame++;
        const settled = Math.floor((frame / FRAMES) * text.length);
        el.firstChild.nodeValue = text
          .split("")
          .map((ch, i) =>
            i < settled || /\s/.test(ch)
              ? ch
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          )
          .join("");
        if (frame >= FRAMES) restore();
      }, FRAME_MS);
    }

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", restore);

    el._scrambleCleanup = () => {
      restore();
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", restore);
    };
  },
  unmounted(el) {
    el._scrambleCleanup?.();
    delete el._scrambleCleanup;
  },
};
```

- [ ] **Step 2: Apply to the desktop nav links**

In `src/components/NavBar.vue`:

1. Add the import next to the other imports in `<script setup>`:

```js
import { vScramble } from "@/directives/scramble";
```

(`<script setup>` exposes `vScramble` as `v-scramble` automatically by naming convention — same pattern the section components use for `vTilt`.)

2. The desktop nav anchor contains the label text node **plus** the underline `<span>` — the directive must NOT go on the anchor (it requires a single-text-node element). Wrap the label in its own span. Replace:

```html
            {{ link.label }}
```

with:

```html
            <span v-scramble>{{ link.label }}</span>
```

(inside the desktop `v-for` anchor only — leave the mobile menu links at line ~157 untouched; they're touch-only).

- [ ] **Step 3: Verify**

Run: `npm run lint` → expected: 0 errors.
Run: `npm run build` → expected: builds successfully.

Manual check on the dev server: hover each of the 5 desktop nav links → text scrambles and resolves in ~0.3s; leaving mid-scramble restores the label instantly; switch locale (IT/EN) then hover again → scramble uses the new language.

- [ ] **Step 4: Commit**

```bash
git add src/directives/scramble.js src/components/NavBar.vue
git commit -m "Feat: v-scramble glyph hover on desktop nav links"
```

---

### Task 3: `.neon-cta` glow on primary CTAs

**Files:**
- Modify: `src/assets/globals.css` (insert after the `.tactile`/`.tactile-press` block from Task 1)
- Modify: `src/components/NavBar.vue` (`contactBtnClass`)
- Modify: `src/components/HeroSection.vue` (primary CTA)
- Modify: `src/components/ContactSection.vue` (submit button)

- [ ] **Step 1: Add the CSS class**

In `src/assets/globals.css`, directly after the micro-interactions media blocks added in Task 1, insert:

```css
/* ── Micro-interactions: neon CTA glow ───────────────────────────────────────
   Phosphor halo on the three primary CTAs (nav Contact, hero CTA, contact form
   submit) — deliberately scarce. Declared AFTER .tactile so its hover shadow
   wins over .tactile's soft lift shadow (same specificity, later source order);
   on the hero CTA it also out-specifies the static .neon-glow rest state, so
   hover reads as "intensify". A glow fade is not movement, so it stays active
   under reduced motion (the global 0.01ms override just makes it instant). */
.neon-cta {
  transition:
    box-shadow 0.25s ease,
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}
.neon-cta:hover,
.neon-cta:focus-visible {
  box-shadow:
    0 0 18px var(--neon-glow),
    0 0 40px var(--neon-glow);
}
```

Caveat: `.neon-cta`'s `transition` must not drop `transform` on elements that also carry `.tactile` (all three CTAs are AppButtons, which do). Since `.neon-cta` comes later in source order, its transition list would override `.tactile`'s and kill the lift easing. **Therefore add `transform 0.16s ease` to `.neon-cta`'s transition list** — final rule:

```css
.neon-cta {
  transition:
    transform 0.16s ease,
    box-shadow 0.25s ease,
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}
```

(Use this final version directly; the first snippet is shown only to explain the why.)

- [ ] **Step 2: Apply to the three CTAs**

1. `src/components/NavBar.vue` — append to `contactBtnClass`:

```js
const contactBtnClass =
  "font-mono text-sm border-primary text-primary hover:bg-primary hover:text-primary-foreground neon-cta";
```

2. `src/components/HeroSection.vue` — the primary CTA (the `href="#projects"` AppButton, ~line 179): add `neon-cta` to its class (keep the static `neon-glow` rest state):

```
class="font-mono bg-primary text-primary-foreground hover:bg-primary/90 neon-glow neon-cta"
```

3. `src/components/ContactSection.vue` — the submit AppButton (~line 193): add `neon-cta`:

```
class="w-full sm:w-auto font-mono bg-primary text-primary-foreground hover:bg-primary/90 neon-cta"
```

Do NOT touch the hero's "Download CV" outline button, the contact "back to idle" button, or anything else.

- [ ] **Step 3: Verify**

Run: `npm run lint` → expected: 0 errors.
Run: `npm run build` → expected: builds successfully.

- [ ] **Step 4: Commit**

```bash
git add src/assets/globals.css src/components/NavBar.vue src/components/HeroSection.vue src/components/ContactSection.vue
git commit -m "Feat: neon phosphor glow on the three primary CTAs"
```

---

### Task 4: `.sheen` sweep on glass cards

**Files:**
- Modify: `src/assets/globals.css` (insert after the `.neon-cta` block from Task 3)
- Modify: `src/components/AboutSection.vue`
- Modify: `src/components/TechStack.vue`
- Modify: `src/components/ProjectsSection.vue`
- Modify: `src/components/HomeLabSection.vue`

- [ ] **Step 1: Add the CSS class**

In `src/assets/globals.css`, directly after the `.neon-cta` rules, insert:

```css
/* ── Micro-interactions: glass-card sheen ────────────────────────────────────
   A diagonal light strip sweeps across the card once per hover-enter (~0.7s,
   transform-only, pointer-events: none). The transition lives ONLY on the
   :hover state, so on mouseleave the strip snaps back off-screen invisibly
   instead of visibly rewinding. Pairs with v-tilt: the tilt transforms the
   card, the sheen transforms a pseudo-element child — no conflict. The whole
   effect is hover-gated (touch never sees it) and removed under reduced
   motion. Travel math: strip is 28% of card width starting at -35%; 560% of
   its own width ≈ 1.57 card widths, so it fully clears the right edge. */
@media (hover: hover) and (pointer: fine) {
  .sheen {
    position: relative;
    overflow: hidden;
  }
  .sheen::after {
    content: "";
    position: absolute;
    top: -20%;
    bottom: -20%;
    left: -35%;
    width: 28%;
    background: linear-gradient(
      100deg,
      transparent,
      color-mix(in oklab, var(--primary) 12%, transparent) 45%,
      color-mix(in oklab, white 9%, transparent) 55%,
      transparent
    );
    transform: skewX(-14deg);
    pointer-events: none;
  }
  .sheen:hover::after {
    transform: skewX(-14deg) translateX(560%);
    transition: transform 0.7s ease;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sheen::after {
    display: none;
  }
}
```

- [ ] **Step 2: Apply to the four v-tilt card spots**

Add `sheen` to the class list of exactly the elements that already carry `v-tilt`:

1. `src/components/AboutSection.vue` (~line 74):

```html
<div v-tilt :class="['glass-panel rounded-lg p-6 card-glow sheen', { 'is-current': entry.current }]">
```

2. `src/components/TechStack.vue` (~line 105):

```
class="present-step group glass-panel rounded-lg p-6 card-glow sheen"
```

3. `src/components/ProjectsSection.vue` (~line 92) — the article already has `relative overflow-hidden`, which `.sheen` would set anyway; just append the class:

```
class="present-step group relative glass-panel rounded-lg overflow-hidden card-glow sheen"
```

4. `src/components/HomeLabSection.vue` (~line 21):

```html
<div v-tilt class="glass-panel rounded-lg p-10 card-glow sheen">
```

- [ ] **Step 3: Verify**

Run: `npm run lint` → expected: 0 errors.
Run: `npm run build` → expected: builds successfully.

Manual check on the dev server: hover an About card, a TechStack card, a project card, the HomeLab card → light strip sweeps once; nothing inside the cards is clipped that wasn't before (compare the About card's `is-current` marker and the project cards' accent bar); mouseleave shows no reverse sweep.

- [ ] **Step 4: Commit**

```bash
git add src/assets/globals.css src/components/AboutSection.vue src/components/TechStack.vue src/components/ProjectsSection.vue src/components/HomeLabSection.vue
git commit -m "Feat: sheen sweep on glass cards (pairs with v-tilt)"
```

---

### Task 5: Document in features.md + final verify

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Add a Micro-interactions section**

In `docs/features.md`, add a new top-level section (after the existing card-tilt material, wherever the doc's flow fits best — read the doc's structure first):

```markdown
## Micro-interactions

Four small, independent effects (spec: `docs/superpowers/specs/2026-06-11-micro-interactions-design.md`).
All hover effects are gated on `(hover: hover) and (pointer: fine)`; transforms are
suppressed under `prefers-reduced-motion: reduce`.

| Effect | Where | How |
|---|---|---|
| `.tactile` press & lift | `AppButton` (all CTAs), `ScrollToTop`; `.tactile-press` (press-only) on `LocaleToggle` / `JourneyModeToggle` | Hover lifts 2px + soft `--neon-glow` shadow; `:active` squashes (scale 0.96) with a 60ms transition. Owns the `transition` property — colors are in its list. |
| `v-scramble` (`src/directives/scramble.js`) | The 5 desktop nav links (label wrapped in a `<span v-scramble>`) | Rescrambles the label with the SectionHeader glyph set `.·+*#@%&`, resolving left-to-right over 12 frames × 26ms. Reads text at hover time (locale-safe), restores on leave/unmount, mutates `firstChild.nodeValue` so Vue's text node keeps its identity. Single-text-node elements only. |
| `.neon-cta` glow | Nav **Contact** button, hero primary CTA, contact form submit — exactly three, deliberately scarce | Hover/focus-visible phosphor halo (`box-shadow` ×2 `--neon-glow`). Declared after `.tactile` so its hover shadow wins; on the hero CTA it intensifies the static `.neon-glow`. |
| `.sheen` sweep | The same glass cards that carry `v-tilt` (About, TechStack, Projects, HomeLab) | A skewed gradient strip (`::after`, transform-only, `pointer-events: none`) sweeps once per hover-enter (~0.7s). Transition lives only on `:hover`, so leave snaps back invisibly — no reverse sweep. |

Tunables: lift 2px / press scale 0.96 (`.tactile`), 12×26ms (`scramble.js`),
sweep 0.7s + strip geometry (`.sheen::after`).
```

Adjust wording/placement to match the doc's existing voice and structure — but keep the table contents accurate to what was built.

- [ ] **Step 2: Final verify**

Run: `npm run lint` → expected: 0 errors.
Run: `npm run build` → expected: builds successfully.

- [ ] **Step 3: Commit**

```bash
git add docs/features.md
git commit -m "Docs: micro-interactions (tactile, scramble, neon CTA, sheen) in features.md"
```
