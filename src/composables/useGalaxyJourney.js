import { ref, reactive, onMounted, onUnmounted } from "vue";

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

// Galaxy opacity while reading a dimmable (non-bright) section. TUNABLE:
// lower = calmer reading sections; the gaps always bloom back to full (1.0).
const DIM = 0.6;

function smoothstep(t) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function useGalaxyJourney() {
  const zoom = ref(1);
  const center = reactive({ x: 0, y: 0 });
  const intensity = ref(1);
  const travel = ref(0); // 0 = holding, → 1 mid-gap: drives the warp streaks
  const activeIndex = ref(0); // current/nearest zone index, for the chapter rail

  let ranges = []; // per-zone { holdStart, holdEnd } in document coords
  let reduced = false;
  let raf = null;
  let motionQuery = null;
  const retries = [];

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
    zoom.value = lerp(ZONES[i].zoom, ZONES[j].zoom, t);
    center.x = lerp(ZONES[i].center.x, ZONES[j].center.x, t);
    center.y = lerp(ZONES[i].center.y, ZONES[j].center.y, t);
    // Base eases between the two holds; the bloom lifts opacity to full at the
    // gap midpoint, so the galaxy "exhales" as the camera flies through.
    const base = lerp(holdIntensity(i), holdIntensity(j), t);
    intensity.value = base + (1 - base) * Math.sin(Math.PI * t);
    // Warp peaks mid-flight and is zero at both ends (crisp on arrival/departure).
    travel.value = Math.sin(Math.PI * t);
    activeIndex.value = t < 0.5 ? i : j;
  }

  function update() {
    raf = null;
    if (reduced) return;
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
      zoom.value = 1;
      center.x = 0;
      center.y = 0;
      intensity.value = 1;
      travel.value = 0;
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    } else {
      measure();
      onScroll();
    }
  }

  onMounted(() => {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced = motionQuery.matches;
    motionQuery.addEventListener("change", onMotionChange);

    if (reduced) {
      zoom.value = 1;
      center.x = 0;
      center.y = 0;
      intensity.value = 1;
      travel.value = 0;
      return;
    }

    measure();
    update();
    scheduleRetries();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
  });

  onUnmounted(() => {
    if (raf !== null) cancelAnimationFrame(raf);
    motionQuery?.removeEventListener("change", onMotionChange);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    retries.forEach(clearTimeout);
  });

  return { zoom, center, intensity, travel, activeIndex };
}
