import { ref, reactive, watch, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useJourneyMode } from "@/composables/useJourneyMode";
import { journeyJump } from "@/composables/useJourneyScroll";

/**
 * useGalaxyJourney()
 *
 * The "camera" that flies through the galaxy as you scroll. Returns reactive
 * { zoom, center } fed straight into <GalaxyBackground>.
 *
 * Behavior:
 *   • While a section is on screen (its pinned span), the camera HOLDS that
 *     section's zone — a stable backdrop to read against.
 *   • While in the empty gap between two sections, the camera smoothly
 *     INTERPOLATES (smoothstep) from the current zone to the next.
 *
 * Anchors: pinned sections are sticky, so their inner `#id` box is NOT stable.
 * We measure the NON-STICKY `.present-track` (which carries `data-journey="<id>"`)
 * instead, falling back to `#id` for the non-pinned hero.
 *
 * No-op under prefers-reduced-motion (galaxy stays at zoom 1, center 0,0).
 */

// Each zone: target { zoom, center } in galaxy space ({0,0} = core). TUNABLE.
// `bright: true` marks a galaxy-forward moment that stays at full opacity while
// held; the others dim to DIM so their content reads calmly (see "breathing").
const ZONES = [
  { id: "hero", zoom: 1.0, center: { x: 0, y: 0 }, bright: true },
  { id: "about", zoom: 1.8, center: { x: 0.5, y: -0.3 } },
  { id: "stack", zoom: 2.2, center: { x: -0.5, y: 0.2 } },
  { id: "projects", zoom: 2.6, center: { x: 0.2, y: 0.5 } },
  { id: "homelab", zoom: 3.4, center: { x: -0.2, y: -0.2 } },
  // Climax: pull all the way back out to the full disc, like the hero view.
  { id: "contact", zoom: 1.0, center: { x: 0, y: 0 }, bright: true },
];

// ── Directional drift transitions ─────────────────────────────────────────────
// (see docs/superpowers/specs/2026-06-09-journey-animations-design.md)
// Screen-space flow vectors per zone: the slide you leave drifts OPPOSITE to the
// camera pan toward the next zone, and the next slide enters offset ALONG the pan
// (so it travels the same screen direction as the departing one) — the whole gap
// reads as one continuous pan instead of a disappear/reappear.
// Galaxy y projects to screen y squashed by the camera tilt.
const FLOW_TILT = 0.643; // sin(40°) — matches the desktop galaxy projection. TUNABLE.

function screenDelta(a, b) {
  return {
    x: b.center.x - a.center.x,
    y: (b.center.y - a.center.y) * FLOW_TILT,
  };
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y);
  return len < 1e-6 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

/**
 * getZoneFlow(zoneId) → { enter: {x,y}, exit: {x,y} } (normalized, screen space).
 * `enter`: direction the slide is initially OFFSET from its resting spot (the
 * camera-pan direction from the previous zone; it travels opposite — back to
 * center — as it reveals). `exit`: direction it drifts out toward (opposite of
 * the pan to the next zone). CSS y is positive-down.
 * Defaults preserve today's behavior: enter from below, exit gently upward —
 * used for the first zone's enter, the last zone's exit, and unknown ids.
 */
export function getZoneFlow(zoneId) {
  const i = ZONES.findIndex((z) => z.id === zoneId);
  const fallback = { enter: { x: 0, y: 1 }, exit: { x: 0, y: -1 } };
  if (i === -1) return fallback;

  const enter =
    i > 0 ? normalize(screenDelta(ZONES[i - 1], ZONES[i])) : fallback.enter;

  let exit = fallback.exit;
  if (i < ZONES.length - 1) {
    const pan = normalize(screenDelta(ZONES[i], ZONES[i + 1]));
    exit = { x: -pan.x, y: -pan.y };
  }
  return { enter, exit };
}

// Galaxy opacity while reading a dimmable (non-bright) section. TUNABLE:
// lower = calmer reading sections; the gaps always bloom back to full (1.0).
const DIM = 0.6;

// Mid-gap camera pull-back. During each transition the zoom dips by this many
// galaxy-zoom units at the midpoint (then returns), so the camera "pulls back to
// see more, then flies into" the next area — an arc, not a straight zoom ramp.
// 0 = straight ramp. TUNABLE.
const PULLBACK = 0.5;
// Floor so the pull-back never shrinks the galaxy much past the full-disc view.
const MIN_ZOOM = 0.85;

function smoothstep(t) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function useGalaxyJourney() {
  const { mode } = useJourneyMode();
  const route = useRoute();

  const zoom = ref(1);
  const center = reactive({ x: 0, y: 0 });
  const intensity = ref(1);
  const travel = ref(0); // 0 = holding, → 1 mid-gap: drives the warp streaks
  const activeIndex = ref(0); // current/nearest zone index, for the chapter rail
  // Monotonic journey position: integer i = holding zone i, i+t = t through the
  // gap toward zone i+1. Unlike `travel` (a symmetric 0→1→0 arc) this only ever
  // increases as you scroll down, so consumers can tell "approaching" from
  // "already passed" a zone — what AsciiPlanets needs to fly worlds toward you.
  const progress = ref(0);

  let ranges = []; // per-zone { holdStart, holdEnd } in document coords
  let reduced = false;
  let small = false; // mobile: galaxy is static, camera off
  let reducedData = false; // metered connection: galaxy frozen, camera off
  let raf = null;
  let jumpFrom = null; // camera state captured at jump start (see update())
  let motionQuery = null;
  let sizeQuery = null;
  let dataQuery = null;
  const retries = [];

  // "Soft off": the camera holds the hero view (galaxy still twinkles) — used for
  // the manual flat/simple view, small screens, reduced-data, and off-home routes
  // (case-study pages hold the calm hero view instead of flying). Distinct from
  // `reduced`, which detaches all listeners (handled separately below).
  function softOff() {
    return small || reducedData || mode.value === "flat" || route.name !== "home";
  }

  function resetCamera() {
    zoom.value = 1;
    center.x = 0;
    center.y = 0;
    intensity.value = 1;
    travel.value = 0;
    activeIndex.value = 0;
    progress.value = 0;
    jumpFrom = null;
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }

  function anchorEl(id) {
    return document.querySelector(`[data-journey="${id}"]`) || document.getElementById(id);
  }

  // Measure each zone's stable pinned span. Returns true once every zone exists
  // (the lazy sections mount asynchronously, so we retry until then).
  function measure() {
    const vh = window.innerHeight;
    const next = [];
    let allFound = true;
    for (const z of ZONES) {
      const el = anchorEl(z.id);
      if (!el) {
        allFound = false;
        next.push(null);
        continue;
      }
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const holdStart = top;
      const holdEnd = Math.max(top, top + rect.height - vh); // sticky unpins here
      next.push({ holdStart, holdEnd });
    }
    ranges = next;
    return allFound;
  }

  function holdIntensity(i) {
    return ZONES[i].bright ? 1 : DIM;
  }

  function apply(i) {
    const z = ZONES[i];
    zoom.value = z.zoom;
    center.x = z.center.x;
    center.y = z.center.y;
    intensity.value = holdIntensity(i);
    travel.value = 0;
    activeIndex.value = i;
    progress.value = i;
  }

  function applyGap(i, j, t) {
    // Everything that should peak mid-flight rides this arc: it's 0 at both ends
    // (crisp arrival/departure) and 1 at the midpoint.
    const arc = Math.sin(Math.PI * t);
    // Zoom eases between the two holds, but is pulled BACK by the arc mid-gap —
    // the camera dezooms to reveal more, then pushes back in to the next zone.
    const baseZoom = lerp(ZONES[i].zoom, ZONES[j].zoom, t);
    zoom.value = Math.max(MIN_ZOOM, baseZoom - PULLBACK * arc);
    center.x = lerp(ZONES[i].center.x, ZONES[j].center.x, t);
    center.y = lerp(ZONES[i].center.y, ZONES[j].center.y, t);
    // Base eases between the two holds; the bloom lifts opacity to full at the
    // gap midpoint, so the galaxy "exhales" as the camera flies through.
    const base = lerp(holdIntensity(i), holdIntensity(j), t);
    intensity.value = base + (1 - base) * arc;
    // Warp peaks mid-flight and is zero at both ends (crisp on arrival/departure).
    travel.value = arc;
    activeIndex.value = t < 0.5 ? i : j;
    progress.value = i + t;
  }

  function update() {
    raf = null;
    if (reduced || softOff()) return;

    // Programmatic nav/rail jump (see useJourneyScroll.journeyJump): fly the camera
    // straight to the destination zone, ignoring the per-gap warp sequence, so a
    // long jump reads as one calm move instead of blasting through every gap.
    if (journeyJump.active) {
      const j = ZONES.findIndex((z) => z.id === journeyJump.toId);
      if (j !== -1) {
        if (!jumpFrom || jumpFrom.id !== journeyJump.toId) {
          jumpFrom = {
            id: journeyJump.toId,
            zoom: zoom.value,
            cx: center.x,
            cy: center.y,
            intensity: intensity.value,
            prog: progress.value,
          };
        }
        const t = smoothstep(journeyJump.progress);
        const dz = ZONES[j];
        zoom.value = lerp(jumpFrom.zoom, dz.zoom, t);
        center.x = lerp(jumpFrom.cx, dz.center.x, t);
        center.y = lerp(jumpFrom.cy, dz.center.y, t);
        intensity.value = lerp(jumpFrom.intensity, holdIntensity(j), t);
        travel.value = 0;
        activeIndex.value = j;
        // Sweep `progress` continuously (not a snap to j): AsciiPlanets fades/scales
        // its worlds off `progress`, so a hard jump would pop them in/out. Easing it
        // from the captured origin to the destination lets the planets glide/loom
        // smoothly as the camera flies through.
        progress.value = lerp(jumpFrom.prog, j, t);
        return;
      }
    } else if (jumpFrom) {
      jumpFrom = null;
    }

    const y = window.scrollY;
    const first = ranges[0];
    if (!first) return;

    // Before / during the first zone's hold.
    if (y <= first.holdEnd) {
      apply(0);
      return;
    }

    for (let i = 0; i < ZONES.length - 1; i++) {
      const cur = ranges[i];
      const nxt = ranges[i + 1];
      if (!cur || !nxt) continue;

      // Holding the current zone while its section is pinned on screen.
      if (y >= cur.holdStart && y <= cur.holdEnd) {
        apply(i);
        return;
      }
      // Flying through the empty gap toward the next zone.
      if (y > cur.holdEnd && y < nxt.holdStart) {
        const t = smoothstep((y - cur.holdEnd) / Math.max(1, nxt.holdStart - cur.holdEnd));
        applyGap(i, i + 1, t);
        return;
      }
    }

    // At / past the final zone (Contact, pulled back out to the full disc).
    apply(ZONES.length - 1);
  }

  function onScroll() {
    if (raf === null) raf = requestAnimationFrame(update);
  }

  function onResize() {
    measure();
    onScroll();
  }

  function scheduleRetries() {
    [120, 320, 640, 1000, 1600, 2400].forEach((ms) => {
      retries.push(
        setTimeout(() => {
          measure();
          update();
        }, ms),
      );
    });
  }

  function onMotionChange(e) {
    reduced = e.matches;
    if (reduced) {
      resetCamera();
    } else {
      measure();
      onScroll();
    }
  }

  // Re-evaluate after a soft-off input (flat toggle, breakpoint, reduced-data)
  // changes: either hold the hero view or resume flying.
  function reevaluate() {
    if (reduced) return;
    if (softOff()) resetCamera();
    else {
      measure();
      update();
    }
  }

  function onSizeChange(e) {
    small = e.matches;
    reevaluate();
  }

  function onDataChange(e) {
    reducedData = e.matches;
    reevaluate();
  }

  onMounted(() => {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    sizeQuery = window.matchMedia("(max-width: 767px)");
    dataQuery = window.matchMedia("(prefers-reduced-data: reduce)");
    reduced = motionQuery.matches;
    small = sizeQuery.matches;
    reducedData = dataQuery.matches;
    motionQuery.addEventListener("change", onMotionChange);
    sizeQuery.addEventListener("change", onSizeChange);
    dataQuery.addEventListener("change", onDataChange);

    if (reduced) {
      resetCamera();
      return;
    }

    // Hold the hero view while soft-off, but still attach listeners + the mode
    // watcher so toggling back to the cinematic view resumes the flight.
    measure();
    if (softOff()) resetCamera();
    else update();
    scheduleRetries();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
  });

  // The manual cinematic ⇄ flat toggle (useJourneyMode) flips soft-off at runtime.
  watch(mode, reevaluate);

  // Route changes flip soft-off too: off-home pages hold the calm hero view.
  // Returning home runs before RouterView swaps the DOM, so the immediate
  // measure() inside reevaluate() sees no anchors — re-arm the retry ladder to
  // re-measure once HomeView's sections have mounted.
  watch(
    () => route.name,
    () => {
      reevaluate();
      if (!reduced && !softOff()) scheduleRetries();
    },
  );

  onUnmounted(() => {
    if (raf !== null) cancelAnimationFrame(raf);
    motionQuery?.removeEventListener("change", onMotionChange);
    sizeQuery?.removeEventListener("change", onSizeChange);
    dataQuery?.removeEventListener("change", onDataChange);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    retries.forEach(clearTimeout);
  });

  return { zoom, center, intensity, travel, activeIndex, progress };
}
