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
      el.style.transition = "";
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
