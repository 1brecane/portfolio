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
