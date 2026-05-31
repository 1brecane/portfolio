import { ref, onMounted, onUnmounted } from "vue";

/**
 * useScrollPresentation(trackRef)
 *
 * Drives a pinned "presentation" slide. `trackRef` points at a tall
 * `.present-track` whose inner content is `position: sticky; top: 0`. As the
 * user scrolls through the track, `progress` goes 0 → 1 across the pinned span.
 * Child `.present-step` elements consume `--present` to fade/rise in stages
 * (pure CSS math — the only per-frame JS here is setting `progress`).
 *
 * Under prefers-reduced-motion, `progress` is pinned to 1 (everything revealed)
 * and no scroll listeners are attached.
 *
 * @returns {{ progress: import('vue').Ref<number> }}
 */
export function useScrollPresentation(trackRef) {
  const progress = ref(0);
  let reduced = false;
  let raf = null;
  let motionQuery = null;

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function compute() {
    raf = null;
    const el = trackRef.value;
    if (!el) return;
    if (reduced) {
      progress.value = 1;
      return;
    }
    const rect = el.getBoundingClientRect();
    const trackTop = rect.top + window.scrollY;
    const denom = rect.height - window.innerHeight;
    if (denom <= 0) {
      // Track shorter than the viewport (e.g. fallback layout) → fully revealed.
      progress.value = 1;
      return;
    }
    progress.value = clamp01((window.scrollY - trackTop) / denom);
  }

  function onScroll() {
    if (raf === null) raf = requestAnimationFrame(compute);
  }

  function onMotionChange(e) {
    reduced = e.matches;
    if (reduced) {
      progress.value = 1;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      onScroll();
    }
  }

  onMounted(() => {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced = motionQuery.matches;
    motionQuery.addEventListener("change", onMotionChange);

    if (reduced) {
      progress.value = 1;
      return;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    compute();
  });

  onUnmounted(() => {
    if (raf !== null) cancelAnimationFrame(raf);
    motionQuery?.removeEventListener("change", onMotionChange);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  });

  return { progress };
}
