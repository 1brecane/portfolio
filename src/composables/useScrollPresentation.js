import { ref, onMounted, onUnmounted, watch } from "vue";
import { useJourneyMode } from "@/composables/useJourneyMode";

/**
 * useScrollPresentation(trackRef)
 *
 * Drives a pinned "presentation" slide. `trackRef` points at a tall
 * `.present-track` whose inner content is `position: sticky; top: 0`. As the
 * user scrolls through the track, `progress` goes 0 → 1 across the pinned span.
 * Child `.present-step` elements consume `--present` to fade/rise in stages.
 *
 * PERF: the track's top/height are MEASURED ONCE per layout change (mount, body
 * resize, window resize) and cached — never per scroll frame. `getBoundingClientRect`
 * forces a reflow, and doing it every frame across all five pinned sections caused
 * layout thrashing (reflow interleaved with the `--present` style writes) and
 * dropped frames on fast scroll. The per-frame path now reads only `scrollY`.
 *
 * Wherever the CSS flattens the layout (prefers-reduced-motion, < 768px, flat
 * "simple view") `progress` is pinned to 1: the track is un-pinned (`height:
 * auto`), so scroll-through progress is meaningless there — and a flattened
 * section TALLER than the viewport would otherwise sit near 0 while its title
 * is on screen, leaving the SectionHeader decode stuck on glyphs.
 *
 * @returns {{ progress: import('vue').Ref<number> }}
 */
export function useScrollPresentation(trackRef) {
  const progress = ref(0);
  const { mode } = useJourneyMode();
  let reduced = false;
  let small = false;
  let raf = null;
  let motionQuery = null;
  let smallQuery = null;
  let bodyObserver = null;
  let listening = false;

  // Mirrors the three flattening conditions in globals.css — keep in sync.
  function flattened() {
    return reduced || small || mode.value === "flat";
  }

  // Cached layout — updated on layout changes only, not per scroll frame.
  let trackTop = 0;
  let denom = 0; // trackHeight - viewportHeight

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function measure() {
    const el = trackRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    trackTop = rect.top + window.scrollY;
    denom = rect.height - window.innerHeight;
  }

  // Per-frame: reads scrollY only (no layout) → no reflow, no thrash.
  function apply() {
    raf = null;
    if (flattened()) {
      progress.value = 1;
      return;
    }
    if (denom <= 0) {
      // Track shorter than the viewport (e.g. fallback layout) → fully revealed.
      progress.value = 1;
      return;
    }
    progress.value = clamp01((window.scrollY - trackTop) / denom);
  }

  function onScroll() {
    if (raf === null) raf = requestAnimationFrame(apply);
  }

  function onResize() {
    measure();
    onScroll();
  }

  function startListeners() {
    if (listening) return;
    listening = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    // Re-measure on any layout shift: lazy sections mounting above, locale text
    // length changes, fonts/images settling. (transform/opacity reveals don't
    // change layout, so this never feeds back on itself.)
    bodyObserver = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    bodyObserver.observe(document.body);
  }

  function stopListeners() {
    if (!listening) return;
    listening = false;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    bodyObserver?.disconnect();
    bodyObserver = null;
  }

  // Any flattening input flipped (motion pref, breakpoint, journey mode) —
  // pin to 1 or hand back to scroll, re-measuring since the layout just changed.
  function reevaluate() {
    if (flattened()) {
      stopListeners();
      progress.value = 1;
    } else {
      startListeners();
      measure();
      onScroll();
    }
  }

  function onMotionChange(e) {
    reduced = e.matches;
    reevaluate();
  }

  function onSmallChange(e) {
    small = e.matches;
    reevaluate();
  }

  watch(mode, reevaluate);

  onMounted(() => {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced = motionQuery.matches;
    motionQuery.addEventListener("change", onMotionChange);
    smallQuery = window.matchMedia("(max-width: 767px)");
    small = smallQuery.matches;
    smallQuery.addEventListener("change", onSmallChange);

    if (flattened()) {
      progress.value = 1;
      return;
    }
    measure();
    apply();
    startListeners();
  });

  onUnmounted(() => {
    if (raf !== null) cancelAnimationFrame(raf);
    motionQuery?.removeEventListener("change", onMotionChange);
    smallQuery?.removeEventListener("change", onSmallChange);
    stopListeners();
  });

  return { progress };
}
