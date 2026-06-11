import { ref, reactive, watch, onMounted, onUnmounted } from "vue";
import { useJourneyMode } from "@/composables/useJourneyMode";

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

// ── First-visit intro fly-in ──────────────────────────────────────────────────
// On a visitor's very first load (top of page, no deep-link hash, journey
// running) the camera starts far out and "lands" on the hero view, riding the
// existing warp-streak pipeline for the flight scia. Once per visitor.
const INTRO_START_ZOOM = 0.35; // where the flight starts. TUNABLE
const INTRO_MS = 1800; // flight duration. TUNABLE
const INTRO_SEEN_KEY = "journey-intro-seen";

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function smoothstep(t) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function useGalaxyJourney() {
  const { mode } = useJourneyMode();

  const zoom = ref(1);
  const center = reactive({ x: 0, y: 0 });
  const intensity = ref(1);
  const travel = ref(0); // 0 = holding, → 1 mid-gap: drives the warp streaks
  const activeIndex = ref(0); // current/nearest zone index, for the chapter rail

  let ranges = []; // per-zone { holdStart, holdEnd } in document coords
  let reduced = false;
  let small = false; // mobile: galaxy is static, camera off
  let reducedData = false; // metered connection: galaxy frozen, camera off
  let raf = null;
  let motionQuery = null;
  let sizeQuery = null;
  let dataQuery = null;
  const retries = [];
  let introRaf = null;
  let introActive = false;

  // "Soft off": the camera holds the hero view (galaxy still twinkles) — used for
  // the manual flat/simple view, small screens, and reduced-data. Distinct from
  // `reduced`, which detaches all listeners (handled separately below).
  function softOff() {
    return small || reducedData || mode.value === "flat";
  }

  function resetCamera() {
    cancelIntro();
    zoom.value = 1;
    center.x = 0;
    center.y = 0;
    intensity.value = 1;
    travel.value = 0;
    activeIndex.value = 0;
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }

  // localStorage wrapped like useJourneyMode does — private mode must not throw.
  // Storage unavailable → treat as seen (skip the intro).
  function introSeen() {
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) !== null;
    } catch {
      return true;
    }
  }

  function markIntroSeen() {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      /* nothing to persist */
    }
  }

  // Stop the intro (user input, completion, mode change, unmount) and hand the
  // camera straight back to the scroll-driven state. Never blocks input.
  function cancelIntro() {
    if (!introActive) return;
    introActive = false;
    if (introRaf !== null) {
      cancelAnimationFrame(introRaf);
      introRaf = null;
    }
    window.removeEventListener("wheel", cancelIntro);
    window.removeEventListener("touchstart", cancelIntro);
    window.removeEventListener("keydown", cancelIntro);
    window.removeEventListener("scroll", cancelIntro);
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    update(); // recompute everything from the live scroll position
  }

  function startIntro() {
    introActive = true;
    // Written at START: a mid-intro reload counts as seen.
    markIntroSeen();
    window.addEventListener("wheel", cancelIntro, { passive: true });
    window.addEventListener("touchstart", cancelIntro, { passive: true });
    window.addEventListener("keydown", cancelIntro);
    window.addEventListener("scroll", cancelIntro, { passive: true });
    const t0 = performance.now();
    const hero = ZONES[0];

    function frame(now) {
      if (!introActive) return;
      if (window.scrollY > 0) {
        cancelIntro();
        return;
      }
      const t = Math.min(1, (now - t0) / INTRO_MS);
      zoom.value = lerp(INTRO_START_ZOOM, hero.zoom, easeOutCubic(t));
      center.x = hero.center.x;
      center.y = hero.center.y;
      intensity.value = 1;
      // Flight scia through the existing warp pipeline; fully dead by arrival.
      travel.value = Math.sin(Math.PI * t) * (1 - t);
      activeIndex.value = 0;
      if (t < 1) introRaf = requestAnimationFrame(frame);
      else cancelIntro(); // done — clean up listeners, sync to scroll state
    }

    introRaf = requestAnimationFrame(frame);
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
  }

  function update() {
    raf = null;
    if (reduced || softOff()) return;
    if (introActive) return; // the intro owns the camera until done/cancelled
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

    // First-visit cinematic landing — only from the very top, never on a
    // deep-link, never when the journey is held (reduced/small/data/flat).
    if (!softOff() && window.scrollY <= 1 && !window.location.hash && !introSeen()) {
      startIntro();
    }
  });

  // The manual cinematic ⇄ flat toggle (useJourneyMode) flips soft-off at runtime.
  watch(mode, reevaluate);

  onUnmounted(() => {
    cancelIntro();
    if (raf !== null) cancelAnimationFrame(raf);
    motionQuery?.removeEventListener("change", onMotionChange);
    sizeQuery?.removeEventListener("change", onSizeChange);
    dataQuery?.removeEventListener("change", onDataChange);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    retries.forEach(clearTimeout);
  });

  return { zoom, center, intensity, travel, activeIndex };
}
