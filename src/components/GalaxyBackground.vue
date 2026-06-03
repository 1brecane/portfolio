<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useColorScheme } from "@/composables/useColorScheme";

// ════════════════════════════════════════════════════════════════════════════
// GalaxyBackground — a still-but-alive ASCII spiral galaxy rendered in Canvas 2D.
//
// THREE hard rules (see docs/features.md):
//   A1. It does NOT rotate or flow. Particle positions are static.
//   A2. It feels alive via a smooth PER-PARTICLE twinkle (opacity only) — every
//       glyph fades on its own slow clock, like AsciiStarfield.
//   A3. Zoom ENLARGES the existing glyphs; it never spawns new ones. Particles
//       live on a FIXED grid in GALAXY space (one per integer index ix,iz), hashed
//       from their index so the SAME characters persist at every zoom. The camera
//       (zoom + center props) projects them to the screen and scales the font.
// ════════════════════════════════════════════════════════════════════════════

// Camera, driven by useGalaxyJourney() via App.vue.
const props = defineProps({
  zoom: { type: Number, default: 1 },
  center: { type: Object, default: () => ({ x: 0, y: 0 }) },
  // 0..1 galaxy opacity — the journey dims it while reading a section and lets it
  // bloom back to full in the empty gaps ("breathing"). 1 = full.
  intensity: { type: Number, default: 1 },
  // 0..1 warp amount — peaks mid-gap while the camera flies, stretching particles
  // toward the vanishing point. 0 = crisp (holding a section).
  travel: { type: Number, default: 0 },
});

const { colorScheme } = useColorScheme();

const canvasRef = ref(null);

let animationId = null;
let resizeObserver = null;
let motionQuery = null;
let sizeQuery = null;
let dataQuery = null;
let reducedMotion = false;
let smallScreen = false; // mobile: render one static frame, no rAF loop
let reducedData = false; // metered connection: same, save battery/CPU
let startTime = null;
let ctx2d = null; // cached 2D context — getContext() does a lookup; fetch it once, not per frame
let charWidth = null; // cached monospace "M" width at the active FONT_SIZE; re-measured when the mobile breakpoint flips
// The canvas DRAWS in CSS pixels but its backing store is devicePixelRatio× larger,
// so glyphs rasterize crisply on high-DPR phones instead of being upscaled to mush.
// (This was the real "doesn't look rendered well" on mobile.) Cached from syncSize so
// draw() never does a per-frame layout read.
let cssW = 0;
let cssH = 0;
let dpr = 1;

// The galaxy is drawn once (no animation loop) when any of these hold — the
// twinkle/warp aren't worth the per-frame canvas cost on phones, metered
// connections, or for reduced-motion users.
function staticMode() {
  return reducedMotion || smallScreen || reducedData;
}

// ── TUNABLE KNOBS ─────────────────────────────────────────────────────────────
const FONT_SIZE = 15; // base glyph size at zoom=1 (px). Scales with zoom.
// On phones the disc is CONTAIN-fit into a narrow viewport (see scale below), so
// it ends up much smaller than on desktop. A smaller glyph keeps the grid dense
// enough that the full spiral still reads as a galaxy, not a handful of chunky chars.
const FONT_SIZE_MOBILE = 10;
const OUTER_R = 1.1; // galaxy disc radius in galaxy-space units (overflows edges).
const TWINKLE_SPEED_BASE = 0.85; // min per-particle twinkle rate (rad/s)
const TWINKLE_SPEED_VAR = 1.4; // extra rate spread (rad/s) → period ≈ 3–7s
// (twinkle amplitude is baked into the alpha formulas in draw(), see A2)
// Fast, low-amplitude micro-shimmer layered ON TOP of the slow twinkle — this is
// the lively "flicker" feel, kept small so it never reads as random blinking.
const SHIMMER_SPEED = 2.0; // base fast-flicker rate (rad/s)
const SHIMMER_AMP = 0.07; // amplitude — flicker, not blink
const STREAK_MAX = 26; // px — max warp-streak length at full travel (tunable)
const STREAK_COPIES = 3; // trailing ghost copies drawn per particle while warping
// Perf: only bright particles get warp streaks. Faint ones are the bulk of the
// field but their streaks are ~invisible, and the gaps (where travel > 0) are
// exactly where you scroll fastest — so skipping them cuts the heaviest frames.
const STREAK_MIN_ALPHA = 0.3;

// ── galaxy shape constants ────────────────────────────────────────────────────
const SPIRAL_K = 1 / Math.tan((10 * Math.PI) / 180);
const N_ARMS = 3;
const ARM_WIDTH = 0.4; // wide → diffuse, particle-like
const CORE_R = 0.1;
const BLACK_HOLE_R = 0.08;

// ── perspective tilt ──────────────────────────────────────────────────────────
const TILT_DEG = 40;
const TILT_SIN = Math.sin((TILT_DEG * Math.PI) / 180); // ≈ 0.643
// Phones view the disc nearly FACE-ON (74° vs 40°). The desktop's steep tilt, cover-fit
// to a narrow portrait, zooms so far into the squished disc that only the core shows — a
// "blob". Face-on needs far less zoom to fill the screen, so the spiral arms read and you
// look down at a round galaxy. (Desktop is untouched.)
const TILT_DEG_MOBILE = 74;
const TILT_SIN_MOBILE = Math.sin((TILT_DEG_MOBILE * Math.PI) / 180); // ≈ 0.961
// How hard the disc fills the phone's WIDTH (the mobile fit is width-contain, not the
// desktop's cover — see scale below). 1.0 fits the whole disc edge-to-edge in the width;
// slightly above 1 crops only the faint outermost arm tips (r≈1.0–1.1, where the
// `outer = 1-(r/OUTER_R)³` falloff has nearly faded) so the spiral fills the screen
// instead of floating as a small centred circle. The full spiral always reads — this only
// trades a sliver of dead edge for presence. Tune up for bigger, down for more margin.
const MOBILE_FILL = 1.12;

const CHARSET = " .·+*"; // light glyphs → particle aesthetic

// ── mouse hover trail ─────────────────────────────────────────────────────────
let mouseX = -9999;
let mouseY = -9999;
const MOUSE_RADIUS = 130;
const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
const trailMap = new Map(); // particle key → hover intensity 0..1 (decays over time)
const TRAIL_K = 0.5;
let prevElapsed = 0;

// Color bands as RGB tuples — mirrors charColor thresholds
const BANDS_BASE = [
  [0.13, [255, 255, 255]],
  [0.22, [255, 170, 119]],
  [0.4, [255, 85, 51]],
  [0.7, [238, 51, 17]],
  [Infinity, [122, 18, 8]],
];

// Hover palettes indexed 1–3, selectable via terminal `color N`
const BANDS_HOVER_MAP = {
  1: [
    [0.13, [255, 255, 255]],
    [0.22, [255, 224, 102]],
    [0.4, [255, 204, 0]],
    [0.7, [255, 170, 0]],
    [Infinity, [204, 102, 0]],
  ],
  2: [
    [0.13, [255, 255, 255]],
    [0.22, [153, 230, 255]],
    [0.4, [0, 200, 255]],
    [0.7, [0, 150, 220]],
    [Infinity, [0, 80, 180]],
  ],
  3: [
    [0.13, [255, 255, 255]],
    [0.22, [180, 255, 130]],
    [0.4, [100, 255, 50]],
    [0.7, [50, 200, 0]],
    [Infinity, [20, 130, 0]],
  ],
};

const STAR_HOVER_MAP = {
  1: [255, 240, 100],
  2: [100, 240, 255],
  3: [150, 255, 100],
};

function getBandRgb(r, bands) {
  for (const [thresh, rgb] of bands) {
    if (r < thresh) return rgb;
  }
  return bands[bands.length - 1][1];
}

function blendColor(a, b, t) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

// ── stable per-particle pseudo-random hash, keyed by GALAXY index (ix, iz) ─────
// Hashing the galaxy index (not screen pixels) is what makes the SAME set of
// characters persist at every zoom level.
function hash(ix, iz) {
  const v = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
  return v - Math.floor(v); // 0…1 uniform-ish
}

// ── galaxy density at (r, θ); NO rotation (A1) ────────────────────────────────
function density(r, theta) {
  if (r === 0) return 1;
  if (r > OUTER_R) return 0;

  const core = Math.exp(-(r * r) / (2 * CORE_R * CORE_R));
  const outer = 1 - Math.pow(r / OUTER_R, 3);
  const inner = 1 - Math.exp(-(r * r) / (2 * 0.03 * 0.03));

  const base = SPIRAL_K * Math.log(r);
  let arm = 0;
  for (let a = 0; a < N_ARMS; a++) {
    const armTheta = base + a * ((Math.PI * 2) / N_ARMS);
    let diff = (((theta - armTheta) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    arm = Math.max(arm, Math.exp(-(diff * diff) / (2 * ARM_WIDTH * ARM_WIDTH)) * outer * inner);
  }

  return Math.max(core, arm);
}

function charColor(r) {
  if (r < 0.13) return "#ffffff";
  if (r < 0.22) return "#ffaa77";
  if (r < 0.4) return "#ff5533";
  if (r < 0.7) return "#ee3311";
  return "#7a1208";
}

// ── draw one frame ────────────────────────────────────────────────────────────
function draw(canvas, elapsed) {
  const bandsHover = BANDS_HOVER_MAP[colorScheme.value] ?? BANDS_HOVER_MAP[1];
  const starHover = STAR_HOVER_MAP[colorScheme.value] ?? STAR_HOVER_MAP[1];

  const ctx = ctx2d || (ctx2d = canvas.getContext("2d"));
  // Work in CSS pixels (W/H), scaling the context by dpr so the larger backing store
  // is filled at full resolution. On a DPR-1 screen this is the identity transform and
  // the output is byte-for-byte what it was before.
  const W = cssW || canvas.clientWidth;
  const H = cssH || canvas.clientHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, W, H);

  // Decay all hover-trail intensities proportional to elapsed time
  const dt = elapsed - prevElapsed;
  prevElapsed = elapsed;
  if (dt > 0 && dt < 0.5) {
    const decay = Math.exp(-TRAIL_K * dt);
    for (const [key, val] of trailMap) {
      const next = val * decay;
      if (next < 0.008) trailMap.delete(key);
      else trailMap.set(key, next);
    }
  }

  // Camera
  const zoom = props.zoom || 1;
  const centerX = props.center?.x ?? 0;
  const centerY = props.center?.y ?? 0;

  // Breathing opacity is baked into every glyph's alpha HERE rather than as a CSS
  // `opacity` on the <canvas> element. Animating element opacity promotes the fixed
  // full-viewport canvas to a compositing layer whose intermediate surface some GPUs
  // allocate at CSS (DPR-1) resolution — downsampling the galaxy to a blur, but only
  // while opacity ≠ 1, i.e. exactly during the scroll-driven breathing. Multiplying it
  // into globalAlpha keeps the canvas fully opaque (no layer) and crisp at every frame.
  const intensity = props.intensity ?? 1;

  // Per-device geometry. Phones keep the cover fit (fills the screen, no dead space) but
  // view the disc nearly face-on with a smaller glyph (see knobs) so the spiral reads.
  const isSmall = smallScreen;
  const fontSize = isSmall ? FONT_SIZE_MOBILE : FONT_SIZE;
  const tiltSin = isSmall ? TILT_SIN_MOBILE : TILT_SIN;

  // Base geometry — independent of zoom, so the grid identity never changes.
  // Desktop uses a "COVER" fit (size from whichever axis needs it most → fills the
  // viewport; on wide screens the width term wins, desktop look unchanged).
  //
  // Phones use a "CONTAIN-by-WIDTH" fit instead. A tall portrait can't cover a round
  // face-on disc without zooming so far that the side arms crop off-screen and only the
  // core band shows (the "blob"). Fitting the disc to the WIDTH shows the WHOLE spiral —
  // all arms read — with starfield letterbox above/below (the disc is ~as tall as wide,
  // shorter than the portrait). MOBILE_FILL (≥1) crops just the faint outer tips so it
  // fills the width with presence. Because on-screen grid spacing is CHAR_W·zoom
  // (independent of `scale`), this only reframes the view — same glyphs, no perf cost.
  const scale = isSmall
    ? (W / (2 * OUTER_R)) * MOBILE_FILL
    : Math.max(W / 2, H / (2 * OUTER_R * tiltSin));
  const cx = W / 2;
  const cy = H * 0.52;

  // Measure the BASE monospace cell so that at zoom=1 the galaxy grid projects
  // exactly one character-cell apart (preserves the original full-disc look).
  // It only changes when the active font size changes (desktop ⇄ mobile breakpoint),
  // so measure once and cache — avoids a font swap + measureText every frame. The
  // cache is invalidated in onSizeChange when the breakpoint flips.
  if (charWidth === null) {
    ctx.font = `${fontSize}px ui-monospace, 'Courier New', monospace`;
    charWidth = ctx.measureText("M").width;
  }
  const CHAR_W = charWidth;
  const CHAR_H = fontSize;

  // FIXED grid spacing in galaxy space (A3).
  const stepX = CHAR_W / scale;
  const stepZ = CHAR_H / (scale * tiltSin);

  // The font GROWS with zoom — this is what enlarges existing glyphs (A3).
  ctx.font = `${fontSize * zoom}px ui-monospace, 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Project a galaxy point to the screen through the camera.
  const projX = scale * zoom;
  const projZ = scale * tiltSin * zoom;

  // Iterate ONLY the on-screen slice of (ix, iz) (A3 perf): invert the projection
  // at the screen edges, then clamp to the galaxy disc. Work shrinks as you zoom in.
  const ixLimit = Math.ceil(OUTER_R / stepX);
  const izLimit = Math.ceil(OUTER_R / stepZ);

  const xGalMin = centerX + (0 - cx) / projX;
  const xGalMax = centerX + (W - cx) / projX;
  const zGalMin = centerY + (0 - cy) / projZ;
  const zGalMax = centerY + (H - cy) / projZ;

  const ixStart = Math.max(-ixLimit, Math.floor(xGalMin / stepX) - 1);
  const ixEnd = Math.min(ixLimit, Math.ceil(xGalMax / stepX) + 1);
  const izStart = Math.max(-izLimit, Math.floor(zGalMin / stepZ) - 1);
  const izEnd = Math.min(izLimit, Math.ceil(zGalMax / stepZ) + 1);

  for (let iz = izStart; iz <= izEnd; iz++) {
    const zGal = iz * stepZ;
    for (let ix = ixStart; ix <= ixEnd; ix++) {
      const xGal = ix * stepX;

      const r = Math.sqrt(xGal * xGal + zGal * zGal);
      if (r > OUTER_R) continue;

      // Project to screen.
      const px = cx + (xGal - centerX) * projX;
      const py = cy + (zGal - centerY) * projZ;
      if (px < -40 || px > W + 40 || py < -40 || py > H + 40) continue;

      const theta = Math.atan2(zGal, xGal);

      const hLook1 = hash(ix, iz);
      const hLook2 = hash(ix + 500, iz + 500);

      // Per-particle twinkle on its OWN slow clock (A2). Opacity only.
      const tHashA = hash(ix + 31, iz + 17);
      const tHashB = hash(ix + 97, iz + 53);
      const twPhase = tHashB * Math.PI * 2;
      const twSpeed = TWINKLE_SPEED_BASE + tHashA * TWINKLE_SPEED_VAR;
      const tw = Math.sin(elapsed * twSpeed + twPhase) * 0.5 + 0.5; // 0..1
      // Fast micro-shimmer, per-particle phase/rate → neighbors flicker out of
      // sync (the old "flicker" texture), but tiny so the field never blinks.
      const shimmer = Math.sin(elapsed * (SHIMMER_SPEED + tHashA * 1.1) + twPhase * 2.7) * SHIMMER_AMP;

      const isBlackHole = r < BLACK_HOLE_R;
      const isRing = !isBlackHole && r < CORE_R;

      // ── black hole interior: barely-visible dark chars ────────────────────────
      if (isBlackHole) {
        const bhSet = "@#$·.";
        const ch = bhSet[Math.floor(hLook2 * bhSet.length)];
        ctx.globalAlpha = (0.28 + hLook1 * 0.32) * (0.72 + tw * 0.28) * intensity;
        ctx.fillStyle = "#262638";
        ctx.fillText(ch, px, py);
        continue;
      }

      // ── white ring: event horizon ─────────────────────────────────────────────
      if (isRing) {
        const ringSet = "@#O";
        const ch = ringSet[Math.floor(hLook1 * ringSet.length)];
        ctx.globalAlpha = Math.min(1, 0.82 + tw * 0.18 + shimmer) * intensity;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(ch, px, py);
        continue;
      }

      // ── normal galaxy field ───────────────────────────────────────────────────
      const d = density(r, theta);
      const fillRate = r < CORE_R * 2.5 ? 0.95 : 0.68;
      if (hLook1 > d * fillRate) continue;

      const charIdx = Math.min(CHARSET.length - 1, Math.floor((d * 0.65 + hLook2 * 0.35) * CHARSET.length));
      let ch = CHARSET[charIdx];
      if (ch === " ") continue;

      const hStar = hash(ix + 1000, iz + 777);
      const isBrightStar = d > 0.12 && hStar < 0.07;

      // Hover trail (screen-space proximity, keyed by particle identity)
      const dxm = px - mouseX;
      const dym = py - mouseY;
      const distSq = dxm * dxm + dym * dym;
      const currentT = distSq < MOUSE_RADIUS_SQ ? smoothstep(1 - distSq / MOUSE_RADIUS_SQ) : 0;
      const cellKey = (ix + 4096) * 100000 + (iz + 4096);
      const stored = trailMap.get(cellKey) || 0;
      if (currentT > stored) trailMap.set(cellKey, currentT);
      const mouseT = Math.max(currentT, stored);

      let alpha;
      let streakMul;
      if (isBrightStar) {
        ch = hStar < 0.035 ? "+" : "*";
        // Bright stars: larger slow swing (A2) + a stronger fast shimmer.
        const aStar = 0.2 + tw * 0.8 + shimmer * 1.6;
        alpha = aStar < 0 ? 0 : aStar > 1 ? 1 : aStar;
        streakMul = 1.7; // stars streak the most
        if (mouseT > 0 && hStar >= 0.02) {
          ctx.fillStyle = blendColor([255, 238, 204], starHover, mouseT);
        } else {
          ctx.fillStyle = hStar < 0.02 ? "#ffffff" : "#ffeecc";
        }
      } else {
        // Dense-field twinkle: gentle slow breathe + fast micro-shimmer,
        // both scaled by peak so brighter particles flicker more (A2).
        const peak = Math.min(1, 0.55 + d * 0.8);
        const aField = peak * (0.35 + tw * 0.65 + shimmer);
        alpha = aField < 0 ? 0 : aField > 1 ? 1 : aField;
        streakMul = 1.0;
        if (mouseT > 0) {
          ctx.fillStyle = blendColor(getBandRgb(r, BANDS_BASE), getBandRgb(r, bandsHover), mouseT);
        } else {
          ctx.fillStyle = charColor(r);
        }
      }

      // Warp streaks: while the camera flies (travel > 0) draw faded ghost copies
      // trailing toward the vanishing point, so the field stretches past at speed.
      // Only bright particles streak (STREAK_MIN_ALPHA) — see note above.
      const warp = props.travel;
      if (warp > 0.02 && alpha > STREAK_MIN_ALPHA) {
        const dvx = px - cx;
        const dvy = py - cy;
        const dist = Math.hypot(dvx, dvy);
        if (dist > 1) {
          // particles farther from the vanishing point streak more (real warp)
          const len = warp * STREAK_MAX * streakMul * Math.min(1, dist / (W * 0.5));
          const nx = (dvx / dist) * len;
          const ny = (dvy / dist) * len;
          for (let s = 1; s <= STREAK_COPIES; s++) {
            const f = s / STREAK_COPIES;
            ctx.globalAlpha = alpha * (1 - f) * 0.55 * intensity;
            ctx.fillText(ch, px - nx * f, py - ny * f);
          }
        }
      }

      ctx.globalAlpha = alpha * intensity;
      ctx.fillText(ch, px, py);
    }
  }

  ctx.globalAlpha = 1;
}

// ── animation loop ────────────────────────────────────────────────────────────
// Schedule the NEXT frame BEFORE drawing, so a one-off draw error can never
// freeze the loop.
function tick(ts) {
  if (startTime === null) startTime = ts;
  if (!staticMode()) animationId = requestAnimationFrame(tick);
  const canvas = canvasRef.value;
  if (canvas) draw(canvas, (ts - startTime) / 1000);
}

function syncSize(canvas) {
  // Cap dpr at 2: beyond that the extra fill cost isn't worth it and phones get heavy.
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
  requestAnimationFrame((ts) => {
    if (startTime === null) startTime = ts;
    draw(canvas, 0);
  });
}

// Start/stop the loop to match the current static-vs-animated state.
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
  charWidth = null; // mobile uses a different FONT_SIZE → re-measure the cell
  applyMode();
}

function onDataChange(e) {
  reducedData = e.matches;
  applyMode();
}

function onMouseMove(e) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  // CSS pixels — draw() works in CSS-pixel space (the context is scaled by dpr).
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
}

function onMouseLeave() {
  mouseX = -9999;
  mouseY = -9999;
}

// Perf guard: stop burning CPU/battery while the tab is hidden; resume on return.
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

  window.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("mouseleave", onMouseLeave);
  document.addEventListener("visibilitychange", onVisibility);

  if (staticMode()) {
    drawStatic();
  } else {
    animationId = requestAnimationFrame(tick);
  }
});

onUnmounted(() => {
  if (animationId !== null) cancelAnimationFrame(animationId);
  ctx2d = null; // a remount gets a fresh <canvas> → re-fetch its context
  resizeObserver?.disconnect();
  motionQuery?.removeEventListener("change", onMotionChange);
  sizeQuery?.removeEventListener("change", onSizeChange);
  dataQuery?.removeEventListener("change", onDataChange);
  window.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseleave", onMouseLeave);
  document.removeEventListener("visibilitychange", onVisibility);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="galaxy-canvas fixed inset-0 w-full h-full z-0 pointer-events-none"
    aria-hidden="true"
  />
</template>

<style scoped>
/* The galaxy stays at element opacity 1 — the breathing (`intensity`) is baked into
   each glyph's alpha in draw() instead. Animating CSS opacity on this fixed full-viewport
   canvas promoted it to a compositing layer that some GPUs rasterized at DPR-1 while the
   opacity transitioned (during scroll), blurring the galaxy. Per-frame redraw already makes
   the breathing a smooth glide, so no CSS transition is needed. */
</style>
