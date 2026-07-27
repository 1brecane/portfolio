<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import { createGlyphScene, createGlyphCamera } from "glyphcss";
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

// Worlds keyed by ZONES index. pos = screen anchor (viewport fractions); the exit
// direction (while passing you) is derived from pos → away from screen center.
// scale = relative size. TUNABLE.
const WORLDS = [
  {
    id: "hero",
    index: 0,
    style: "rings",
    // Retune 2026-07-27: the porthole era's 1.25 read as too large/dominant
    // once seen live (direct user feedback — "il pianeta nell'hero è troppo
    // grande"). Shrunk to 0.95, x nudged 0.77→0.8 to stay clear of the
    // headline at the narrower `lg` widths now that it's smaller. Full-bleed
    // single-column layout (HeroSection.vue) is otherwise unchanged.
    pos: { x: 0.8, y: 0.42 },
    scale: 0.95,
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
    // Retune 2026-07-27: at scale 1.0 the crescent badly outsized the real
    // clip-path diamond opening (measured from live card rects: --cut=4.5rem
    // cut on each of 4 corners, ~116px horizontal / ~93px vertical card-to-
    // card gap), bleeding its bright body under the glass-panel cards'
    // bottom edges. Shrunk to 0.55 (153px on-screen diameter) — confirmed via
    // screenshot AND hit-test at md(768)/lg(1024)/xlw(1440)/xl(1920):
    // centered in the diamond with visible margin to every cut edge, no
    // bleed under any card. x:0.5/y:0.56 unchanged (grid is page-centered; y
    // accounts for the header+row height above the hold).
    pos: { x: 0.5, y: 0.56 },
    scale: 0.55,
  },
  {
    id: "contact",
    index: 5,
    style: "sphere",
    // Retune 2026-07-27: the previous pass's pos/scale (0.78/1.2) put a real
    // porthole-ring device in negative clearance (~-74px, overlapping the
    // form) at the narrow end of `lg` (1024px) even though it read fine at
    // 1440/1920 — headless Chromium measured. Shrunk scale 1.2→1.0, pushed
    // x 0.78→0.85 to recenter in the actually-available gutter. Clearance
    // to the form is positive at every tested width (≈+34px at 1024,
    // ≈+208px at 1440, ≈+104px-to-viewport-edge at 1920). y:0.55 unchanged.
    pos: { x: 0.85, y: 0.55 },
    scale: 1.0,
  },
];

const ASSETS = {
  "sphere-warm": sphereWarm,
  "sphere-green": sphereGreen,
  "bands-python": bandsPython,
  "crescent-warm": crescentWarm,
};

const hostRef = ref(null);

let scene = null;
let camera = null;
let animationId = null;
let resizeObserver = null;
let motionQuery = null;
let sizeQuery = null;
let dataQuery = null;
let reducedMotion = false;
let smallScreen = false;
let reducedData = false;
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
let userPitch = 0; // deg, accumulated from vertical drag; the composed camera.rotX is clamped, not this accumulator (see clampOrbitPitch)
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
// Camera-orbit rotation (spec-planets3d-002 §3.1) — the mesh no longer
// carries any live rotation, so the camera's rest angles must be explicit.
const BASE_ROT_X = 65; // camera resting orbit tilt (deg) — today's createGlyphCamera default
const BASE_ROT_Y = 45; // camera resting orbit azimuth (deg) — ditto
// Pole-avoiding clamp band on the COMPOSED camera.rotX (base + userPitch),
// not the raw accumulator — supersedes the old PITCH_CLAMP.
const ORBIT_PITCH_MIN = 10; // deg
const ORBIT_PITCH_MAX = 90; // deg
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
const DEFAULT_LIGHT = { directionalLight: { direction: [0.9, 0.25, 0.35], intensity: 1.15 }, ambientLight: { intensity: 0.32 } };
const CRESCENT_LIGHT = { directionalLight: { direction: [0.8, 0.3, 0.5], intensity: 1.2 }, ambientLight: { intensity: 0.16 } };

function smoothstep(t) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

function staticMode() {
  return reducedMotion || smallScreen || reducedData;
}

// Clamps the FINAL composed camera.rotX (base + userPitch), not userPitch in
// isolation — the Euler path has gimbal lock at the poles, so this keeps the
// orbit inside a band that never flips through one (spec §3.1).
function clampOrbitPitch(rotX) {
  return Math.max(ORBIT_PITCH_MIN, Math.min(ORBIT_PITCH_MAX, rotX));
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
  }
  // Camera-orbit sign (§3.3): the near-facing surface follows the drag ("grab
  // and throw" feel) — orbiting the camera around a stationary mesh is the
  // visual inverse of rotating the mesh itself, so the yaw sign is flipped
  // relative to the old mesh-rotation code. Pitch verified against the
  // running app and flipped again to match the "drag up → near surface tips
  // up toward the viewer" feel (human visual pass, not derivable from the
  // yaw case alone — pitch and yaw aren't mirror images of each other under
  // this camera's Euler convention). userPitch is intentionally unclamped
  // here — the clamp lives on the composed camera.rotX (§3.1).
  const dYaw = -dx * DRAG_YAW_DEG_PER_PX;
  userYaw += dYaw;
  userPitch -= dy * DRAG_PITCH_DEG_PER_PX;
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

// A.1: the drag target is the SAME .el that used to also host the hover
// tooltip (removed — the planets are drag-only now, no informational popup).
function mountHitRegion(world) {
  hotspotHandle = scene.addHotspot({ id: world.id, at: [0, 0, 0], size: hitRegionSizeCh(world.scale) });
  const el = hotspotHandle.el;
  el.style.touchAction = "none"; // a finger-drag on the planet rotates it, not the page (§A.3)
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);

  hitRegionCleanup = () => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", endDrag);
    el.removeEventListener("pointercancel", endDrag);
  };
}

function mountWorld(world) {
  disposeActiveMeshes();
  applyLight(world.style === "crescent" ? "crescent" : "default");
  const asset = assetFor(world.style, "warm");
  const polygons = asset.map((p) => ({ vertices: p.vertices, color: p.color }));
  // castShadow: the sphere's own shadow-map cast is what gives the ring a
  // real light/dark band (see ringHandle below) — a flat ring's faces all
  // share ~the same normal, so directional+ambient light alone shades it
  // uniformly no matter the orbit angle; only a projected shadow varies.
  bodyHandle = scene.add(polygons, { castShadow: true });
  if (world.style === "rings") {
    const ringPolys = ringWarm.map((p) => ({ vertices: p.vertices, color: p.color }));
    ringHandle = scene.add(ringPolys, { rotation: [RING_TILT_DEG, 0, 0], receiveShadow: true });
  }
  mountHitRegion(world);
  activeWorldId = world.id;
}

function mountAmbient(ambient) {
  disposeActiveMeshes();
  applyLight("default");
  const asset = assetFor(ambient.style, ambient.palette);
  const polygons = asset.map((p) => ({ vertices: p.vertices, color: p.color }));
  bodyHandle = scene.add(polygons);
  // §E: emblems get the same drag mechanism as journey worlds.
  mountHitRegion({ id: "ambient", scale: ambient.scale ?? 1 });
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
    // §4: emblems get the same camera-orbit treatment as journey worlds —
    // rotX/rotY written before the progress-driven zoom/center below.
    const baseYaw = angleDeg(elapsed);
    camera.rotY = BASE_ROT_Y + baseYaw + userYaw;
    camera.rotX = clampOrbitPitch(BASE_ROT_X + userPitch);
    const radius = minDim * BASE_R * (props.ambient.scale ?? 1);
    camera.zoom = radius; // world radius is 1, so zoom==on-screen radius directly
    camera.center = [props.ambient.pos.x, props.ambient.pos.y];
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

  // §3.1: baseYaw (auto-spin) never stops advancing; userYaw/userPitch are the
  // drag/inertia offsets composed on top, applied to the CAMERA. Neither mesh
  // gets a live transform any more — body sits at its rest pose and the ring
  // keeps only its fixed mount-time tilt (RING_TILT_DEG), so the two are
  // trivially rigid with each other at every orbit angle (no more summed-
  // Euler approximation needed).
  const baseYaw = angleDeg(elapsed);
  camera.rotY = BASE_ROT_Y + baseYaw + userYaw;
  camera.rotX = clampOrbitPitch(BASE_ROT_X + userPitch);

  // The approach/loom-past size change is camera work, not mesh work — same
  // pattern as the ambient branch above (`camera.zoom` IS the on-screen
  // radius). The journey owns `camera.zoom`/`center` end to end; meshes must
  // never carry a journey-driven `scale`, or rotation and the fly-in/loom-past
  // size would be fighting over the same transform.
  const scale = fade.scale * active.scale;
  camera.zoom = minDim * BASE_R * scale;
  // Exit direction: outward from screen center (away from the viewer's path),
  // so a world you pass slides toward the edge while it shrinks away.
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
  reducedMotion = motionQuery.matches;
  smallScreen = sizeQuery.matches;
  reducedData = dataQuery.matches;
  motionQuery.addEventListener("change", onMotionChange);
  sizeQuery.addEventListener("change", onSizeChange);
  dataQuery.addEventListener("change", onDataChange);
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
    // Interpolates normals across adjacent faces instead of flat per-face
    // shading, so the low-poly baked spheres (320 faces, kept low for bundle
    // size — see scripts/bake-planets.mjs) read as smoothly curved under
    // lighting/rotation instead of visibly faceted. Zero bundle cost, unlike
    // baking more polygons.
    smoothShading: true,
    // Enables the shadow-map technique scene-wide — without this key present
    // (even empty), the per-mesh castShadow/receiveShadow flags (hero's ring)
    // are no-ops. opacity below the library default (0.25) since the ring is
    // already fairly dim against the dark background; too dark reads as a
    // hole instead of a shadow.
    shadow: { opacity: 0.35 },
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
</template>

<style scoped>
/* Never a CSS opacity on .planets-host itself (layer promotion blurs the
   glyph text) — alpha/fade is baked per-frame into mesh scale instead. */
.planets-host {
  overflow: hidden;
  font-family: var(--font-mono), ui-monospace, "Courier New", monospace;
}
</style>
