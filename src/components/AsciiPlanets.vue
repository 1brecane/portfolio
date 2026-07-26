<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { createGlyphScene, createGlyphCamera } from "glyphcss";
import { useI18n } from "@/i18n";
import sphereWarm from "@/assets/planets/sphere-warm.json";
import sphereGreen from "@/assets/planets/sphere-green.json";
import bandsPython from "@/assets/planets/bands-python.json";
import crescentWarm from "@/assets/planets/crescent-warm.json";
import ringWarm from "@/assets/planets/ring-warm.json";

// ════════════════════════════════════════════════════════════════════════════
// AsciiPlanets — the "worlds" you meet along the scroll journey, in ASCII.
//
// Rendered as real 3D meshes via glyphcss (a CPU/DOM ASCII rasterizer — see
// .meridian/architect/specs/planets3d-feature.md, the spec this component
// implements). Geometry + per-face color come from src/assets/planets/*.json,
// baked by scripts/bake-planets.mjs (run `npm run bake:planets` to regenerate
// after touching the palette/texture math there).
//
// Three planets anchored to journey zones (see ZONES in useGalaxyJourney.js):
//   • hero      (index 0) → ringed planet — the START you depart from
//   • projects  (index 3) → crescent      — a world glimpsed mid-flight
//   • contact   (index 5) → full sphere    — the destination you ARRIVE at
// Exactly one world mesh is mounted in the scene at a time — cheap and
// narrative, and it sidesteps needing three different simultaneous camera
// framings (see positioning notes below).
//
// Driven by the journey's MONOTONIC `progress` (i = holding zone i, i+t = t
// through the gap toward i+1). For a world at zone Z, d = progress−Z:
//   • d < 0 (approaching): scale grows 0 → 1 (fly-in).
//   • d = 0 (at the section): full scale (1).
//   • d > 0 (passed it): scale SHRINKS 1 → 0 while sliding toward the screen
//     edge, instead of growing+fading like the old canvas version did.
//     glyphcss has no working alpha/opacity on mesh colors (verified against
//     the real rasterizer, not just docs — #ff000080 and rgba() both fall
//     back to flat grey in the per-cell output). Scale IS the fade: 0 = gone.
//     This is an accepted visual shift from the old transparency-fade — see
//     spec §1/§8.
//
// Positioning: each world mesh always sits at its own local origin
// [0,0,0] — screen position comes from moving the SHARED camera's
// `center` (normalized grid coords, verified empirically to equal the exact
// same viewport-fraction semantics the old canvas `pos.x/pos.y` used — no
// calibration math needed). This only works because exactly one world mesh
// is mounted at a time; don't add a second simultaneous world without
// switching to per-mesh `position` offsets instead.
//
// Sits at z-1 (above the starfield canvas z-0, below page content z-2),
// pointer-events-none except the hover hotspot's own hit target. Static
// one-frame render on phones / reduced-motion / metered, like the starfield.
// ════════════════════════════════════════════════════════════════════════════

const props = defineProps({
  progress: { type: Number, default: 0 }, // monotonic journey position (see useGalaxyJourney)
  // Case-study pages: draw ONE fixed world ({style, palette, pos, scale}) instead
  // of the journey worlds. null = journey mode (default, unchanged).
  ambient: { type: Object, default: null },
});

const { t } = useI18n();

// Worlds keyed by ZONES index. pos = screen anchor (viewport fractions); the exit
// direction (while passing you) is derived from pos → away from screen center.
// scale = relative size. TUNABLE.
const WORLDS = [
  {
    id: "hero",
    index: 0,
    style: "rings",
    // §C stacked-column retune: was {x:0.72, y:0.42} (pre-reservation guess).
    // HeroSection.vue's right column is the grid's `2fr` of `3fr_2fr` (right
    // ~40% of the max-w-6xl container, itself page-centered) — x:0.78 targets
    // that column's horizontal center. The new planet-zone reservation
    // (`h-48 xl:h-56`, §C) sits at the TOP of the stacked right column, above
    // the shrunk terminal, and the whole column is vertically centered on the
    // page — y:0.38 estimates that reserved zone's own center sitting above
    // page-center. Both are structurally-reasoned, NOT verified in a browser
    // (no eyes on screen). VERIFY AND RE-TUNE empirically at the hero hold
    // across common breakpoints (esp. lg/xl) before merge — see spec §C/§F.
    pos: { x: 0.78, y: 0.38 },
    scale: 1.05,
    // #11 fix: the hero world's depart window is tightened (default DEPART=1.15
    // would still be scale>0 at progress=1, when the About zone's hold begins —
    // a faint bleed into the next section). 0.9 reaches scale 0 comfortably
    // before that hold starts.
    depart: 0.9,
  },
  {
    id: "projects",
    index: 3,
    style: "crescent",
    // §B pinwheel retune: was {x:0.3, y:0.5} (arbitrary, pre-pinwheel). The
    // ProjectsSection.vue grid is horizontally centered on the page
    // (SectionLayout's `mx-auto max-w-6xl`), so the gutter between the 2x2
    // cards' widened md:gap-x-16/md:gap-y-10 (§B) converges near the
    // horizontal center — x:0.5 is a structurally-reasoned estimate, NOT
    // verified in a browser (no eyes on screen). y:0.5 is an unchanged
    // starting guess for the vertical center of the pinned hold. VERIFY AND
    // RE-TUNE both empirically at the projects zone hold across common
    // breakpoints before merge — see spec §B/§F.
    pos: { x: 0.5, y: 0.5 },
    scale: 1.0,
  },
  {
    id: "contact",
    index: 5,
    style: "sphere",
    // §D beside-the-form retune: was {x:0.52, y:0.46} — the reported
    // centering bug (never precisely tuned; barely off-center by mistake).
    // Replaced with an intentional "beside the form" anchor, not a mere
    // {0.5,0.5} correction (decision #7 — the bug fix is a side effect of the
    // redesign, not a standalone task). ContactSection.vue's form stays
    // `max-w-2xl mx-auto` inside SectionLayout's `max-w-6xl` (unchanged, per
    // spec §D — no new column) — that already leaves free space on both
    // sides at wide viewports; x:0.8 targets the right-side gutter, y:0.5
    // sits alongside the form's own vertical center. Structurally-reasoned,
    // NOT verified in a browser (no eyes on screen). VERIFY AND RE-TUNE
    // empirically at the contact hold across common wide breakpoints before
    // merge, and confirm the old mis-centering is visibly gone — see spec
    // §D/§F.
    pos: { x: 0.8, y: 0.5 },
    scale: 1.15,
  },
];

const ASSETS = {
  "sphere-warm": sphereWarm,
  "sphere-green": sphereGreen,
  "bands-python": bandsPython,
  "crescent-warm": crescentWarm,
};

const hostRef = ref(null);
const tooltipRef = ref(null);
// { x, y, name, tech, below } in viewport px, or null = hidden. x/y start as
// the raw anchor point; clampTooltip() below corrects them post-render once
// the tooltip's real size is known, so it never overflows the viewport.
const tooltip = ref(null);
const TOOLTIP_MARGIN = 8; // px kept clear of the viewport edge

let scene = null;
let camera = null;
let animationId = null;
let resizeObserver = null;
let motionQuery = null;
let sizeQuery = null;
let dataQuery = null;
let hoverQuery = null; // (hover: none) — touch/no-pointer devices
let reducedMotion = false;
let smallScreen = false;
let reducedData = false;
let noHover = false;
let minDim = 0;

// Active journey-world mesh(es) + hit region, swapped only when the active
// world identity changes (not every frame) to avoid churn.
let activeWorldId = null; // WORLDS[].id, or "ambient", or null (nothing in window)
let bodyHandle = null;
let ringHandle = null;
let hotspotHandle = null;
let hitRegionCleanup = null;

// ── drag-to-rotate state (§A) — all per mounted-world-instance, reset on
// every world/ambient switch (A.7). Module-level, not per-mesh, because
// exactly one world is ever mounted at a time (same constraint as the
// positioning system above). ────────────────────────────────────────────────
let userYaw = 0; // deg, accumulated from horizontal drag — same axis as baseYaw
let userPitch = 0; // deg, accumulated from vertical drag, clamped to ±PITCH_CLAMP
let yawVel = 0; // deg/s — inertia velocity after release
let dragging = false; // pointerdown fired AND movement exceeded DRAG_THRESHOLD_PX
let dragPointerId = null;
let dragStartX = 0;
let dragStartY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let velocitySamples = []; // { t, dyaw } within the last VEL_WINDOW_MS, for the release-velocity average
let inertiaActive = false;
// True while dragging OR inertia is decaying — temporarily lifts the static
// gate (A.6) so the interaction stays smooth even on mobile/reduced-motion/
// reduced-data. False = "at rest", the existing staticMode() invariant rules.
let interacting = false;
let lastFrameTime = null; // seconds — for the inertia integration's per-frame dt

// ── tunables (ported from the old canvas AsciiPlanets) ──────────────────────
const ROT_SPEED = 0.12; // planet spin (rad/s) — calm
const BASE_R = 0.17; // planet radius as a fraction of min(viewport) at full scale, in CSS px per world unit
const APPROACH = 1.0; // how far before its zone (in progress units) it fades in
const DEPART = 1.15; // how far after its zone it has fully passed/shrunk away (default; hero overrides)
const OUT_PUSH = 1.4; // how hard the camera center slides toward the screen edge while passing
const RING_TILT_DEG = 68; // ring mesh tilt around X — matches the S2 spike's validated look
const FONT_DESKTOP = 13; // host font-size (px) — controls glyph density, like the old canvas FONT
const FONT_MOBILE = 21; // bigger font = fewer, coarser cells = cheaper static frame (I6, §5)
const CHAR_W_RATIO = 0.6; // monospace advance width ≈ 0.6× font-size — used only to size the hotspot hit target

// ── drag-to-rotate tunables (§A.2–§A.4) ──────────────────────────────────────
const DRAG_THRESHOLD_PX = 4; // below this, a press+release is a tap/click, not a drag
const DRAG_YAW_DEG_PER_PX = 0.5; // horizontal drag sensitivity
const DRAG_PITCH_DEG_PER_PX = 0.5; // vertical drag sensitivity
const PITCH_CLAMP = 60; // degrees — keeps the planet from flipping to a degenerate pole-on view
const VEL_WINDOW_MS = 100; // release-velocity averaging window (avoids a jerky end-of-drag spike)
const INERTIA_TAU = 0.4; // seconds — exponential friction time constant, ≈1-2s to settle
const INERTIA_MIN_VEL = 2; // deg/s — below this, inertia is considered at rest
const MAX_DT = 0.1; // seconds — clamp a single frame's dt (tab-hidden resume, big gaps between static frames)
const MAX_YAW_VEL = 2000; // deg/s — sane upper bound on release velocity; guards against a near-zero
// velocitySamples time span (e.g. coalesced pointermove events with near-identical timestamps)
// blowing up totalDyaw/span into an absurd one-frame snap once multiplied by dt in advanceInertia().

// Crescent needs its own strong-directional/low-ambient light for the
// terminator look (§3); every other style uses glyphcss's own scene defaults,
// restored explicitly here so switching worlds is a plain setOptions() call.
const DEFAULT_LIGHT = { directionalLight: { direction: [0.5, 0.7, 0.5], intensity: 1 }, ambientLight: { intensity: 0.4 } };
const CRESCENT_LIGHT = { directionalLight: { direction: [0.8, 0.3, 0.5], intensity: 1.2 }, ambientLight: { intensity: 0.05 } };

function smoothstep(t) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

function staticMode() {
  return reducedMotion || smallScreen || reducedData;
}

function assetFor(style, palette) {
  if (style === "crescent") return ASSETS["crescent-warm"];
  if (style === "bands") return ASSETS[`bands-${palette}`] ?? bandsPython;
  return ASSETS[`sphere-${palette}`] ?? sphereWarm;
}

function updateMinDim() {
  minDim = Math.min(window.innerWidth, window.innerHeight);
  if (camera) camera.zoom = minDim * BASE_R;
}

function applyLight(mode) {
  scene.setOptions(mode === "crescent" ? CRESCENT_LIGHT : DEFAULT_LIGHT);
}

// ── §A.6 interacting flag — dragging OR inertia decaying temporarily lifts
// the static gate so the interaction stays smooth on mobile/reduced-motion/
// reduced-data, then returns to a single resting frame. ─────────────────────
function setInteracting(value) {
  if (interacting === value) return;
  interacting = value;
  if (value) {
    if (animationId === null && !document.hidden) animationId = requestAnimationFrame(tick);
  } else if (staticMode()) {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    drawStatic();
  }
}

// §A.7 — drag offsets are per mounted-world-instance. Called on every world/
// ambient switch (via disposeActiveMeshes) and on pointercancel.
function resetDragState() {
  if (dragPointerId !== null) {
    hotspotHandle?.el?.releasePointerCapture?.(dragPointerId);
  }
  dragging = false;
  dragPointerId = null;
  velocitySamples = [];
  userYaw = 0;
  userPitch = 0;
  yawVel = 0;
  inertiaActive = false;
  setInteracting(false);
}

// §A.4 — advances release-inertia by one frame: decays the EXTRA yaw velocity
// toward zero and eases pitch back to its canonical 0. No-op when idle.
// baseYaw (angleDeg(elapsed) in draw()) never stops advancing underneath, so
// the visible spin eases from the flick speed down to the calm auto-spin with
// no explicit "blend" — it falls out of keeping the auto-spin baseline live.
function advanceInertia(dt) {
  if (!inertiaActive || dt <= 0) return;
  userYaw += yawVel * dt;
  yawVel *= Math.exp(-dt / INERTIA_TAU);
  userPitch += (0 - userPitch) * (1 - Math.exp(-dt / INERTIA_TAU));
  if (Math.abs(yawVel) < INERTIA_MIN_VEL) {
    yawVel = 0;
    userPitch = 0;
    inertiaActive = false;
    setInteracting(false);
  }
}

function removeHitRegion() {
  hitRegionCleanup?.();
  resetDragState(); // needs hotspotHandle still set, to release any active pointer capture
  hotspotHandle?.remove();
  hotspotHandle = null;
  hitRegionCleanup = null;
  tooltip.value = null;
}

function disposeActiveMeshes() {
  bodyHandle?.dispose();
  ringHandle?.dispose();
  bodyHandle = null;
  ringHandle = null;
  removeHitRegion();
}

// Hit-region size, in `ch` units — proportional to the world's full-scale
// on-screen footprint so bigger planets get a bigger hover/drag target.
// (S3-bis: hover AND drag both come from listeners on the imperative
// scene.addHotspot()'s real `.el`, NOT <GlyphHotspot>/<GlyphMesh> — both were
// dead code in the compiled @glyphcss/vue 0.1.2, confirmed by reading the
// source + a headless Vue+happy-dom test (see the spike report). That package
// isn't a dependency here at all — only the imperative `glyphcss` API is used.)
function hitRegionSizeCh(worldScale) {
  const fontPx = staticMode() ? FONT_MOBILE : FONT_DESKTOP;
  const charWpx = fontPx * CHAR_W_RATIO;
  const diameterPx = 2 * minDim * BASE_R * worldScale;
  const cols = Math.max(2, diameterPx / charWpx);
  return [cols, cols / 2]; // height gets ×cellAspect internally (≈2), so /2 keeps it roughly circular
}

// Flip/clamp near edges (§4): re-measures the real tooltip box once it has
// rendered and nudges x/y so it never overflows the viewport.
async function clampTooltip() {
  await nextTick();
  const el = tooltipRef.value;
  if (!el || !tooltip.value) return;
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = tooltip.value.x;
  let below = tooltip.value.below;
  const halfW = rect.width / 2;
  x = Math.min(Math.max(x, halfW + TOOLTIP_MARGIN), vw - halfW - TOOLTIP_MARGIN);
  // Above the anchor by default; flip below if that would clip the top edge.
  if (!below && tooltip.value.y - rect.height - TOOLTIP_MARGIN < 0) below = true;
  else if (below && tooltip.value.y + rect.height + TOOLTIP_MARGIN > vh) below = false;
  if (x !== tooltip.value.x || below !== tooltip.value.below) {
    tooltip.value = { ...tooltip.value, x, below };
  }
}

// §A.3 — Pointer Events state machine (mouse+touch+pen, one code path).
// setPointerCapture on pointerdown routes all subsequent moves to `.el` even
// after the pointer leaves the small hit target, which it will constantly —
// removes any need for window-level move listeners or manual re-hit-testing.
function onPointerDown(e) {
  if (dragPointerId !== null) return; // already tracking a pointer
  dragPointerId = e.pointerId;
  dragStartX = lastPointerX = e.clientX;
  dragStartY = lastPointerY = e.clientY;
  velocitySamples = [];
  inertiaActive = false;
  yawVel = 0;
  dragging = false;
  e.currentTarget.setPointerCapture(e.pointerId);
  setInteracting(true); // A.6: start the loop now even if static-at-rest
}

function onPointerMove(e) {
  if (e.pointerId !== dragPointerId) return;
  const dx = e.clientX - lastPointerX;
  const dy = e.clientY - lastPointerY;
  const now = performance.now();
  if (!dragging) {
    if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) < DRAG_THRESHOLD_PX) {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      return;
    }
    dragging = true;
    tooltip.value = null; // suppress the tooltip for the whole drag (§A.3)
  }
  const dYaw = dx * DRAG_YAW_DEG_PER_PX;
  userYaw += dYaw;
  userPitch = Math.max(-PITCH_CLAMP, Math.min(PITCH_CLAMP, userPitch - dy * DRAG_PITCH_DEG_PER_PX));
  velocitySamples.push({ t: now, dyaw: dYaw });
  const cutoff = now - VEL_WINDOW_MS;
  while (velocitySamples.length && velocitySamples[0].t < cutoff) velocitySamples.shift();
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
}

// §A.3: "On pointerup/pointercancel → release into inertia, or snap under
// reduced-motion." Both events go through the SAME release logic — a real
// browser pointercancel (OS gesture reinterpretation, focus loss mid-touch,
// etc.) is still a "release", just not a clean one. The OTHER kind of
// cancel — the active world changing mid-drag — is a hard reset instead
// (A.7), handled entirely separately via resetDragState() from
// disposeActiveMeshes(); it never goes through this function.
function endDrag(e) {
  if (e && e.pointerId !== dragPointerId) return;
  const wasDragging = dragging;
  dragPointerId = null;
  dragging = false;
  if (!wasDragging) {
    setInteracting(false);
    return;
  }
  // prefers-reduced-motion (§A.5): direct 1:1 follow already applied above —
  // only the POST-RELEASE coast is autonomous motion, so it's the one thing
  // disabled here. Never gate the drag-follow itself on motion preference.
  if (reducedMotion) {
    yawVel = 0;
    userPitch = 0; // pitch-ease also snaps instantly under reduced motion
    setInteracting(false);
    return;
  }
  if (velocitySamples.length >= 2) {
    const span = (velocitySamples[velocitySamples.length - 1].t - velocitySamples[0].t) / 1000;
    const totalDyaw = velocitySamples.reduce((sum, s) => sum + s.dyaw, 0);
    const rawVel = span > 0 ? totalDyaw / span : 0;
    yawVel = Math.max(-MAX_YAW_VEL, Math.min(MAX_YAW_VEL, rawVel));
  } else {
    yawVel = 0;
  }
  inertiaActive = Math.abs(yawVel) >= INERTIA_MIN_VEL;
  if (!inertiaActive) setInteracting(false); // already slow enough — no coast needed
  // else: stays interacting=true, decay handled per-frame in advanceInertia()
}

// A.1: the drag target is the SAME .el as the hover hotspot — no new hit
// layer. `withTooltip` gates only the hover tooltip (mouseenter/mouseleave);
// the hit region itself (and drag) is created unconditionally, including on
// touch/(hover:none) devices, which previously had no `.el` to drag at all.
function mountHitRegion(world, { withTooltip }) {
  hotspotHandle = scene.addHotspot({ id: world.id, at: [0, 0, 0], size: hitRegionSizeCh(world.scale) });
  const el = hotspotHandle.el;
  el.style.touchAction = "none"; // a finger-drag on the planet rotates it, not the page (§A.3)
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);

  let onEnter = null;
  let onLeave = null;
  if (withTooltip && !noHover) {
    const copy = t.value.journey.planets[world.id];
    onEnter = () => {
      if (dragging) return; // §A.3: suppressed for the whole drag
      const rect = el.getBoundingClientRect();
      tooltip.value = { x: rect.left + rect.width / 2, y: rect.top, name: copy.name, tech: copy.tech, below: false };
      clampTooltip();
    };
    onLeave = () => {
      tooltip.value = null;
    };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
  }

  hitRegionCleanup = () => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", endDrag);
    el.removeEventListener("pointercancel", endDrag);
    if (onEnter) el.removeEventListener("mouseenter", onEnter);
    if (onLeave) el.removeEventListener("mouseleave", onLeave);
  };
}

function mountWorld(world) {
  disposeActiveMeshes();
  applyLight(world.style === "crescent" ? "crescent" : "default");
  const asset = assetFor(world.style, "warm");
  const polygons = asset.map((p) => ({ vertices: p.vertices, color: p.color }));
  bodyHandle = scene.add(polygons);
  if (world.style === "rings") {
    const ringPolys = ringWarm.map((p) => ({ vertices: p.vertices, color: p.color }));
    ringHandle = scene.add(ringPolys, { rotation: [RING_TILT_DEG, 0, 0] });
  }
  mountHitRegion(world, { withTooltip: true });
  activeWorldId = world.id;
}

function mountAmbient(ambient) {
  disposeActiveMeshes();
  applyLight("default");
  const asset = assetFor(ambient.style, ambient.palette);
  const polygons = asset.map((p) => ({ vertices: p.vertices, color: p.color }));
  bodyHandle = scene.add(polygons);
  // §E: emblems get the same drag mechanism as journey worlds, but never a
  // hover tooltip (they never had one — out of scope to add here).
  mountHitRegion({ id: "ambient", scale: ambient.scale ?? 1 }, { withTooltip: false });
  activeWorldId = "ambient";
}

function departWindow(world) {
  return world.depart ?? DEPART;
}

// Compute this frame's scale (0..1, replaces alpha — see header) + `out`
// (0..1 depart progress, drives the camera-center slide toward the edge).
function fadeFor(world, progress) {
  const d = progress - world.index;
  const depart = departWindow(world);
  if (d <= -APPROACH || d >= depart) return null; // outside this world's window entirely
  if (d <= 0) {
    const s = smoothstep((d + APPROACH) / APPROACH);
    return { scale: s, out: 0 };
  }
  const out = d / depart;
  return { scale: 1 - smoothstep(out), out };
}

function angleDeg(elapsed) {
  return ((elapsed * ROT_SPEED * 180) / Math.PI) % 360;
}

function draw(elapsed) {
  if (!scene) return;

  // dt for the inertia integration only (§A.4) — clamped so a tab-hidden
  // resume or a big gap between static frames never produces one huge jump.
  const dt = lastFrameTime === null ? 0 : Math.min(elapsed - lastFrameTime, MAX_DT);
  lastFrameTime = elapsed;
  advanceInertia(dt); // no-op unless inertia is actively decaying

  if (props.ambient) {
    if (activeWorldId !== "ambient") mountAmbient(props.ambient);
    const radius = minDim * BASE_R * (props.ambient.scale ?? 1);
    camera.zoom = radius; // world radius is 1, so zoom==on-screen radius directly
    camera.center = [props.ambient.pos.x, props.ambient.pos.y];
    const baseYaw = angleDeg(elapsed);
    bodyHandle?.setTransform({ rotation: [userPitch, baseYaw + userYaw, 0] });
    scene.rerender();
    return;
  }

  let active = null;
  let fade = null;
  for (const w of WORLDS) {
    const f = fadeFor(w, props.progress);
    if (f) {
      active = w;
      fade = f;
      break;
    }
  }

  if (!active) {
    if (activeWorldId !== null) {
      disposeActiveMeshes();
      activeWorldId = null;
    }
    return;
  }
  if (activeWorldId !== active.id) mountWorld(active);

  const scale = fade.scale * active.scale;
  // §A.2: baseYaw (auto-spin) never stops advancing; userYaw/userPitch are the
  // drag/inertia offsets composed on top, applied identically to body + ring
  // so the ringed world stays rigid (its fixed 68° X-tilt simply adds to
  // userPitch — an approximation of composing two rotations as summed Euler
  // X, acceptable for a decorative planet; don't "fix" this into a heavier
  // quaternion composition).
  const baseYaw = angleDeg(elapsed);
  const spin = baseYaw + userYaw;
  bodyHandle?.setTransform({ scale, rotation: [userPitch, spin, 0] });
  ringHandle?.setTransform({ scale, rotation: [RING_TILT_DEG + userPitch, spin, 0] });

  // Exit direction: outward from screen center (away from the viewer's path),
  // so a world you pass slides toward the edge while it shrinks away.
  camera.zoom = minDim * BASE_R;
  camera.center = [
    active.pos.x + (active.pos.x - 0.5) * fade.out * OUT_PUSH,
    active.pos.y + (active.pos.y - 0.5) * fade.out * OUT_PUSH,
  ];

  scene.rerender();
}

function tick(ts) {
  // §A.6: interacting (dragging or coasting on inertia) keeps the loop alive
  // even under staticMode() — the interaction stays smooth on mobile/reduced-
  // motion/reduced-data, then returns to a single resting frame (via
  // setInteracting(false), which explicitly stops the loop and draws that
  // final frame — this guard alone does not do that part).
  if (!staticMode() || interacting) animationId = requestAnimationFrame(tick);
  draw(ts / 1000);
}

function drawStatic() {
  requestAnimationFrame((ts) => draw(ts / 1000));
}

function applyMode() {
  const fontPx = staticMode() ? FONT_MOBILE : FONT_DESKTOP;
  if (hostRef.value) hostRef.value.style.fontSize = `${fontPx}px`;
  if (staticMode() && !interacting) {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    drawStatic();
  } else if (animationId === null && !document.hidden) {
    animationId = requestAnimationFrame(tick);
  }
}

function onMotionChange(e) {
  reducedMotion = e.matches;
  applyMode();
}
function onSizeChange(e) {
  smallScreen = e.matches;
  applyMode();
}
function onDataChange(e) {
  reducedData = e.matches;
  applyMode();
}
function onHoverChange(e) {
  noHover = e.matches;
  // A.1: the hit region (and drag) must persist regardless of hover capability
  // — only clear a currently-visible tooltip. (Tooltip *listeners* are gated
  // at mount time in mountHitRegion(); a live hover-capability toggle mid-
  // session is a rare edge case not worth a remount to re-gate retroactively.)
  if (noHover) tooltip.value = null;
}
function onVisibility() {
  if (document.hidden) {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  } else if ((!staticMode() || interacting) && animationId === null) {
    animationId = requestAnimationFrame(tick);
  }
}
onMounted(() => {
  const host = hostRef.value;
  if (!host) return;

  updateMinDim();

  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  sizeQuery = window.matchMedia("(max-width: 767px)");
  dataQuery = window.matchMedia("(prefers-reduced-data: reduce)");
  hoverQuery = window.matchMedia("(hover: none)");
  reducedMotion = motionQuery.matches;
  smallScreen = sizeQuery.matches;
  reducedData = dataQuery.matches;
  noHover = hoverQuery.matches;
  motionQuery.addEventListener("change", onMotionChange);
  sizeQuery.addEventListener("change", onSizeChange);
  dataQuery.addEventListener("change", onDataChange);
  hoverQuery.addEventListener("change", onHoverChange);
  document.addEventListener("visibilitychange", onVisibility);

  host.style.fontSize = `${staticMode() ? FONT_MOBILE : FONT_DESKTOP}px`;
  host.style.lineHeight = "1.02";

  camera = createGlyphCamera({ zoom: minDim * BASE_R, center: [0.5, 0.5] });
  // GridSize.cellAspect is a REQUIRED field with no safe default at the
  // low-level rasterize() API — omitting it silently renders a completely
  // empty grid (no error, no throw). createGlyphScene()'s own
  // GlyphSceneOptions makes it optional (default 2.0), but we set it
  // explicitly anyway so this doesn't regress if the component is ever
  // refactored onto the lower-level rasterize()/buildRasterizeContext API.
  scene = createGlyphScene(host, {
    camera,
    autoSize: true,
    cellAspect: 2.0,
    mode: "solid",
    useColors: true,
    ...DEFAULT_LIGHT,
  });

  // Mirrors the old canvas component's own ResizeObserver: glyphcss's
  // `autoSize` re-fits cols/rows on host resize internally, but that doesn't
  // know about our static-vs-animated distinction, so a static frame needs an
  // explicit redraw here (an animated frame already redraws every tick).
  resizeObserver = new ResizeObserver(() => {
    updateMinDim();
    if (staticMode()) drawStatic();
  });
  resizeObserver.observe(host);

  if (staticMode()) drawStatic();
  else animationId = requestAnimationFrame(tick);
});

onUnmounted(() => {
  if (animationId !== null) cancelAnimationFrame(animationId);
  disposeActiveMeshes();
  scene?.destroy();
  scene = null;
  camera = null;
  resizeObserver?.disconnect();
  motionQuery?.removeEventListener("change", onMotionChange);
  sizeQuery?.removeEventListener("change", onSizeChange);
  dataQuery?.removeEventListener("change", onDataChange);
  hoverQuery?.removeEventListener("change", onHoverChange);
  document.removeEventListener("visibilitychange", onVisibility);
});

// In static mode there's no rAF loop to pick up an ambient change on navigation.
watch(
  () => props.ambient,
  () => {
    if (staticMode()) drawStatic();
  },
);
</script>

<template>
  <div
    ref="hostRef"
    class="planets-host fixed inset-0 w-full h-full z-[1] pointer-events-none"
    aria-hidden="true"
  />
  <div
    v-if="tooltip"
    ref="tooltipRef"
    class="planets-tooltip"
    :class="{ 'planets-tooltip--below': tooltip.below }"
    :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
  >
    <span class="planets-tooltip__name">{{ tooltip.name }}</span>
    <span class="planets-tooltip__tech">{{ tooltip.tech }}</span>
  </div>
</template>

<style scoped>
/* Never a CSS opacity on .planets-host itself (layer promotion blurs the
   glyph text) — alpha/fade is baked per-frame into mesh scale instead. */
.planets-host {
  overflow: hidden;
  font-family: var(--font-mono), ui-monospace, "Courier New", monospace;
}

/* I7: planet-scoped light-mode awareness — tooltip colors come from the site's
   CSS tokens, not hardcoded rgb, so it stays legible if/when a light theme
   lands (full site light mode is out of scope of this branch). The baked mesh
   colors themselves (src/assets/planets/*.json) are intentionally NOT given a
   light-theme variant here: they're saturated, absolute hex values chosen
   against the current dark --background, and there is no light :root token
   set yet to validate a rebake against (§6 explicitly defers full light mode
   to a future issue). Re-bake a light variant (bake-planets.mjs's `dim()` blend
   already supports mixing toward an arbitrary background) once that theme
   exists — don't guess at it now. */
.planets-tooltip {
  position: fixed;
  /* Anchored above the hotspot by default (top: anchor.y, pulled up by its own
     height + a gap). --below flips to sit under the hotspot instead, for
     worlds anchored too close to the top edge (clampTooltip() decides). */
  transform: translate(-50%, calc(-100% - 10px));
  z-index: 30;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.4rem 0.6rem;
  border-radius: 0.375rem;
  border: 1px solid color-mix(in oklch, var(--foreground) 18%, transparent);
  background: color-mix(in oklch, var(--background) 88%, transparent);
  backdrop-filter: blur(4px);
  font-family: var(--font-mono), ui-monospace, monospace;
  white-space: nowrap;
  box-shadow: 0 4px 16px oklch(0.08 0 0 / 0.35);
}

.planets-tooltip--below {
  transform: translate(-50%, 10px);
}

.planets-tooltip__name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--foreground);
}

.planets-tooltip__tech {
  font-size: 0.65rem;
  color: var(--muted-foreground);
}
</style>
