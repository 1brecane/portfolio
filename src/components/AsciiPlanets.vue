<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";

// ════════════════════════════════════════════════════════════════════════════
// AsciiPlanets — the "worlds" you meet along the scroll journey, in ASCII.
//
// Three planets anchored to journey zones (see ZONES in useGalaxyJourney.js):
//   • hero      (index 0) → ringed planet — the START you depart from
//   • projects  (index 3) → crescent      — a world glimpsed mid-flight
//   • contact   (index 5) → full sphere    — the destination you ARRIVE at
//
// Each is rendered with ASCII glyphs (luminance ramp), slowly rotating, lit by
// the site's neon accent. Driven by the journey's MONOTONIC `progress` (i = holding
// zone i, i+t = t through the gap toward i+1). For a world at zone Z, d = progress−Z:
//   • d < 0 (approaching): the world flies IN from the distance — small → full size,
//     fading up. You meet it in the open gap before its section.
//   • d = 0 (at the section): full size at its anchor.
//   • d > 0 (passed it): since you keep flying FORWARD, it comes TOWARD you — grows
//     past full and slides outward off the screen edge while fading. It dissolves
//     toward the viewer, never receding into the heading direction.
// The dramatic moments land in the OPEN gaps (not behind pinned section panels), so
// the worlds actually read. Exactly one is on screen at a time — cheap and narrative.
//
// Sits at z-0 ABOVE the starfield, behind the page content (z-2). Static one-frame
// render on phones / reduced-motion / metered, like the starfield.
// ════════════════════════════════════════════════════════════════════════════

const props = defineProps({
  progress: { type: Number, default: 0 }, // monotonic journey position (see useGalaxyJourney)
  // Case-study pages: draw ONE fixed world ({style, palette, pos, scale}) instead
  // of the journey worlds. null = journey mode (default, unchanged).
  ambient: { type: Object, default: null },
});

const AMBIENT_ALPHA = 0.5; // emblem planet glyph alpha — subtle, text stays readable. TUNABLE.

// Worlds keyed by ZONES index. pos = screen anchor (viewport fractions); the exit
// direction (while passing you) is derived from pos → away from screen center.
// scale = relative size. TUNABLE.
const WORLDS = [
  { index: 0, style: "rings", palette: "warm", pos: { x: 0.72, y: 0.42 }, scale: 1.05 },
  { index: 3, style: "crescent", palette: "warm", pos: { x: 0.3, y: 0.5 }, scale: 1.0 },
  { index: 5, style: "sphere", palette: "warm", pos: { x: 0.52, y: 0.46 }, scale: 1.15 },
];

const canvasRef = ref(null);

let animationId = null;
let resizeObserver = null;
let motionQuery = null;
let sizeQuery = null;
let dataQuery = null;
let reducedMotion = false;
let smallScreen = false;
let reducedData = false;
let ctx2d = null;
let cssW = 0;
let cssH = 0;
let dpr = 1;
let charW = 0; // cached monospace cell width at FONT

// ── tunables ──────────────────────────────────────────────────────────────────
const FONT = 13; // glyph size (px)
const ROT_SPEED = 0.12; // planet spin (rad/s) — calm
const BASE_R = 0.17; // planet radius as a fraction of min(viewport) at full size
const SMALL = 0.32; // size factor when far away (approaching)
const LARGE = 2.6; // size factor as it looms past you (leaving)
const APPROACH = 1.0; // how far before its zone (in progress units) it fades in
const DEPART = 1.15; // how far after its zone it has fully passed/faded
const OUT_PUSH = 1.4; // how hard it slides off-screen while passing you
const RAMP = " .:-=+*#%@";
const L = (() => {
  const v = [-0.6, -0.5, 0.66];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
})();

// Per-world palettes lifted from the old galaxy: a multi-stop ramp from shadow (0)
// to the bright sub-solar highlight (1), so each planet has depth instead of one
// flat tint — and the three read as DIFFERENT worlds. `warm` is the galaxy's base
// gradient; `blue`/`green` echo the `color N` terminal easter-egg palettes. TUNABLE.
const PALETTES = {
  warm: [[0, [58, 16, 12]], [0.25, [200, 55, 30]], [0.5, [255, 110, 65]], [0.75, [255, 190, 140]], [1, [255, 250, 245]]],
  blue: [[0, [10, 28, 66]], [0.25, [22, 95, 185]], [0.5, [55, 175, 255]], [0.75, [170, 232, 255]], [1, [248, 252, 255]]],
  green: [[0, [10, 42, 16]], [0.25, [34, 140, 38]], [0.5, [95, 220, 85]], [0.75, [200, 255, 175]], [1, [248, 255, 248]]],
};

function staticMode() {
  return reducedMotion || smallScreen || reducedData;
}

// Interpolate a brightness b∈[0,1] through a palette's multi-stop ramp.
function shadeColor(b, stops) {
  const x = b < 0 ? 0 : b > 1 ? 1 : b;
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (x - t0) / (t1 - t0 || 1);
      return `rgb(${(c0[0] + (c1[0] - c0[0]) * f) | 0},${(c0[1] + (c1[1] - c0[1]) * f) | 0},${(c0[2] + (c1[2] - c0[2]) * f) | 0})`;
    }
  }
  const c = stops[stops.length - 1][1];
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function rampChar(b) {
  let i = Math.round(b * (RAMP.length - 1));
  if (i < 0) i = 0;
  if (i > RAMP.length - 1) i = RAMP.length - 1;
  return RAMP[i];
}
function tex(lon, lat) {
  const v =
    0.5 +
    0.28 * Math.sin(lat * 3.0) +
    0.3 * Math.sin(lon * 2.0 + 1.3) * Math.cos(lat * 1.7) +
    0.18 * Math.sin(lon * 5.0 + lat * 3.0);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smoothstep(t) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

function drawRing(ctx, cxp, cyp, Rpx, stops) {
  const tilt = 0.34;
  const radii = [1.45, 1.62, 1.78];
  const chars = ["·", "*", ":"];
  const spacing = charW * 1.1; // target screen distance between ring glyphs
  for (let ri = 0; ri < radii.length; ri++) {
    const rr = radii[ri] * Rpx;
    // Step by arc length, not by a fixed angle: a constant `da` bunches the glyphs
    // at the squashed ends of the tilted ellipse. Advancing `a` by spacing ÷ (the
    // ellipse's screen speed ds/da) keeps the on-screen gap even all the way around.
    let a = 0;
    while (a < Math.PI * 2) {
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const front = sa > 0; // bottom half passes in front of the sphere
      const x = cxp + ca * rr;
      const y = cyp + sa * rr * tilt;
      const nx = (x - cxp) / Rpx;
      const ny = (y - cyp) / Rpx;
      if (front || nx * nx + ny * ny >= 1) {
        // (skip the back half where it's occluded by the sphere)
        ctx.fillStyle = shadeColor(0.45 + 0.4 * Math.abs(ca), stops);
        ctx.fillText(chars[ri], x, y);
      }
      const speed = rr * Math.sqrt(sa * sa + tilt * tilt * ca * ca);
      a += spacing / Math.max(speed, 0.5);
    }
  }
}

// Render one planet centered at (cxp,cyp) with radius Rpx, rotated by `ang`.
function drawPlanet(ctx, style, cxp, cyp, Rpx, ang, stops) {
  ctx.font = `${FONT}px ui-monospace, 'Courier New', monospace`;
  const lineH = FONT * 1.02;
  const extentX = style === "rings" ? 1.9 : 1.06;
  const colMin = Math.floor((cxp - extentX * Rpx) / charW);
  const colMax = Math.ceil((cxp + extentX * Rpx) / charW);
  const rowMin = Math.floor((cyp - 1.1 * Rpx) / lineH);
  const rowMax = Math.ceil((cyp + 1.1 * Rpx) / lineH);

  for (let row = rowMin; row <= rowMax; row++) {
    const yp = (row + 0.5) * lineH;
    const ny = (yp - cyp) / Rpx;
    for (let col = colMin; col <= colMax; col++) {
      const xp = (col + 0.5) * charW;
      const nx = (xp - cxp) / Rpx;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      let bright = nx * L[0] + ny * L[1] + nz * L[2];
      if (bright < 0) bright = 0;

      const bx = nx * Math.cos(ang) + nz * Math.sin(ang);
      const bz = -nx * Math.sin(ang) + nz * Math.cos(ang);
      const lon = Math.atan2(bx, bz);
      const lat = Math.asin(ny < -1 ? -1 : ny > 1 ? 1 : ny);

      let shade;
      if (style === "crescent") {
        shade = Math.pow(bright, 1.7);
        if (shade < 0.06) continue;
      } else {
        shade = bright * (0.55 + 0.45 * tex(lon, lat)) + 0.04;
      }
      if (shade <= 0.02) continue;
      ctx.fillStyle = shadeColor(shade > 1 ? 1 : shade, stops);
      ctx.fillText(rampChar(shade), xp, yp);
    }
  }

  if (style === "rings") drawRing(ctx, cxp, cyp, Rpx, stops);
}

function draw(elapsed) {
  const ctx = ctx2d || (ctx2d = canvasRef.value.getContext("2d"));
  const W = cssW;
  const H = cssH;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (charW === 0) {
    ctx.font = `${FONT}px ui-monospace, 'Courier New', monospace`;
    charW = ctx.measureText("M").width || 7;
  }

  const ang = elapsed * ROT_SPEED;
  const minDim = Math.min(W, H);
  const progress = props.progress ?? 0;

  if (props.ambient) {
    const a = props.ambient;
    const radius = minDim * BASE_R * (a.scale ?? 1);
    ctx.globalAlpha = AMBIENT_ALPHA;
    drawPlanet(ctx, a.style, W * a.pos.x, H * a.pos.y, radius, ang, PALETTES[a.palette] || PALETTES.warm);
    ctx.globalAlpha = 1;
    return;
  }

  for (const w of WORLDS) {
    const d = progress - w.index;
    if (d <= -APPROACH || d >= DEPART) continue; // outside this world's window

    let scale, alpha, out;
    if (d <= 0) {
      // Approaching: fly in from the distance — small → full, fading up. (out=0)
      const s = smoothstep((d + APPROACH) / APPROACH);
      scale = SMALL + (1 - SMALL) * s;
      alpha = s;
      out = 0;
    } else {
      // Passed it: comes TOWARD you — grows past full, slides off-screen, fades.
      out = d / DEPART; // 0 at zone → 1 gone
      scale = 1 + (LARGE - 1) * out;
      alpha = 1 - smoothstep(out);
    }
    if (alpha < 0.01) continue;

    const radius = minDim * BASE_R * w.scale * scale;
    // Exit direction: outward from screen center (away from the viewer's path),
    // so a world you pass slides off toward the edge while looming larger.
    const cxp = W * (w.pos.x + (w.pos.x - 0.5) * out * OUT_PUSH);
    const cyp = H * (w.pos.y + (w.pos.y - 0.5) * out * OUT_PUSH);

    ctx.globalAlpha = alpha;
    drawPlanet(ctx, w.style, cxp, cyp, radius, ang, PALETTES[w.palette] || PALETTES.warm);
  }
  ctx.globalAlpha = 1;
}

function tick(ts) {
  if (!staticMode()) animationId = requestAnimationFrame(tick);
  if (canvasRef.value) draw(ts / 1000);
}

function syncSize(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const bw = Math.max(1, Math.round(w * ratio));
  const bh = Math.max(1, Math.round(h * ratio));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  cssW = w;
  cssH = h;
  dpr = ratio;
}

function drawStatic() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  requestAnimationFrame((ts) => draw(ts / 1000));
}

function applyMode() {
  if (staticMode()) {
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
  } else if (!staticMode() && animationId === null) {
    animationId = requestAnimationFrame(tick);
  }
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  syncSize(canvas);

  resizeObserver = new ResizeObserver(() => {
    syncSize(canvas);
    if (staticMode()) drawStatic();
  });
  resizeObserver.observe(canvas);

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

  if (staticMode()) drawStatic();
  else animationId = requestAnimationFrame(tick);
});

onUnmounted(() => {
  if (animationId !== null) cancelAnimationFrame(animationId);
  ctx2d = null;
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
  <canvas
    ref="canvasRef"
    class="planets-canvas fixed inset-0 w-full h-full z-0 pointer-events-none"
    aria-hidden="true"
  />
</template>
