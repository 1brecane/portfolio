<script setup>
import { ref, onMounted, onUnmounted } from "vue";

// ════════════════════════════════════════════════════════════════════════════
// StarfieldBackground — an ASCII depth-starfield whose identity IS its motion.
//
// Replaces the old GalaxyBackground + DOM AsciiStarfield (two fixed z-0 layers)
// with ONE Canvas 2D layer. Stars live in a pseudo-3D space (x,y in [-0.5,0.5],
// depth z in (0,1]) and project from the center, so they spread outward as they
// approach — flying THROUGH a starfield rather than past a flat one.
//
// Driven by the scroll "journey" (useGalaxyJourney) just like the galaxy was:
//   • intensity → global opacity "breathing" (dims while reading a section,
//     blooms back to full in the gaps). Multiplied into each glyph's alpha.
//   • travel   → forward push + motion-smear streaks WHILE flying between
//     sections (0 while holding → calm; ~1 mid-gap → a gentle whoosh).
//   • center   → a small parallax offset as you progress through the journey.
//   • zoom     → unused (the "fly-into" semantics don't map to a flat field;
//                travel already carries the forward motion). Accepted for API parity.
// Plus a depth-scaled MOUSE parallax (near stars shift more than far ones) — the
// "deriva + parallasse" feel chosen in brainstorming.
//
// Perf mirrors the old galaxy: DPR-aware backing store, a single rAF loop, and a
// static one-frame render on phones / reduced-motion / metered connections.
// ════════════════════════════════════════════════════════════════════════════

const props = defineProps({
  zoom: { type: Number, default: 1 }, // accepted for parity; not used (see header)
  center: { type: Object, default: () => ({ x: 0, y: 0 }) },
  intensity: { type: Number, default: 1 },
  travel: { type: Number, default: 0 },
});

const canvasRef = ref(null);

let animationId = null;
let resizeObserver = null;
let motionQuery = null;
let sizeQuery = null;
let dataQuery = null;
let reducedMotion = false;
let smallScreen = false;
let reducedData = false;
let lastTs = null;
let ctx2d = null;
let cssW = 0;
let cssH = 0;
let dpr = 1;

let stars = [];

// ── TUNABLE KNOBS ─────────────────────────────────────────────────────────────
const GLYPHS = [".", ":", "·", "*", "+", "=", "%", "@"]; // keep the ASCII identity
const DENSITY = 6500; // one star per this many px² (lower = denser)
const MAX_STARS = 520; // hard cap so huge 4K viewports stay cheap
const F = 0.55; // projection focal factor (field of view)
const NEON_RATE = 0.1; // fraction of stars tinted with the site's neon accent
const BASE_DRIFT = 0.02; // slow forward creep so it's never fully dead ("deriva")
const TRAVEL_SPEED = 0.6; // extra forward speed at full travel (mid-gap whoosh)
const MOUSE_SHIFT = 46; // px the nearest stars shift across the full mouse sweep
const CENTER_SHIFT = 60; // px the nearest stars shift across the journey's center range
const SIZE_BASE = 3;
const SIZE_K = 5;
const SIZE_MAX = 30;
const TRAIL_COPIES = 3;
const NEAR_Z = 0.05; // recycle a star once it passes this close

const STAR_RGB = [206, 214, 231]; // soft blue-white
const NEON_RGB = [255, 90, 54]; // ≈ oklch(0.65 0.25 25), the site's --primary/--neon

// Smoothed mouse position in [-0.5, 0.5] (viewport-relative).
let mouseTX = 0;
let mouseTY = 0;
let mouseX = 0;
let mouseY = 0;

function staticMode() {
  return reducedMotion || smallScreen || reducedData;
}

function spawn(far) {
  return {
    x: Math.random() - 0.5,
    y: Math.random() - 0.5,
    z: far ? 1 : NEAR_Z + Math.random() * (1 - NEAR_Z),
    glyph: GLYPHS[(Math.random() * GLYPHS.length) | 0],
    rate: 0.6 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
    neon: Math.random() < NEON_RATE,
  };
}

function buildStars() {
  const count = Math.min(MAX_STARS, Math.round((cssW * cssH) / DENSITY));
  stars = Array.from({ length: count }, () => spawn(false));
}

// ── draw one frame ────────────────────────────────────────────────────────────
function draw(elapsed, dt) {
  const ctx = ctx2d || (ctx2d = canvasRef.value.getContext("2d"));
  const W = cssW;
  const H = cssH;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const intensity = props.intensity ?? 1;
  const travel = props.travel ?? 0;
  const cenX = props.center?.x ?? 0;
  const cenY = props.center?.y ?? 0;

  // Ease the mouse toward its target so parallax glides instead of snapping.
  if (!staticMode()) {
    const k = Math.min(1, dt * 6);
    mouseX += (mouseTX - mouseX) * k;
    mouseY += (mouseTY - mouseY) * k;
  }

  // Parallax displacement applied to the NEAREST stars; scaled per-star by depth.
  const shiftX = mouseX * MOUSE_SHIFT + cenX * CENTER_SHIFT;
  const shiftY = (mouseY * MOUSE_SHIFT + cenY * CENTER_SHIFT) * 0.85;

  const cx = W / 2;
  const cy = H / 2;
  const speed = BASE_DRIFT + travel * TRAVEL_SPEED;
  const trailAmt = Math.min(1, travel * 1.6);

  for (const s of stars) {
    // Advance toward the viewer; recycle when it passes us.
    s.z -= speed * dt;
    if (s.z < NEAR_Z) {
      Object.assign(s, spawn(true));
      continue;
    }

    const df = 1 - s.z; // 0 (far) → ~1 (near): near stars parallax + streak more
    const nx = cx + (s.x / s.z) * W * F + shiftX * df;
    const ny = cy + (s.y / s.z) * H * F + shiftY * df;
    if (nx < -60 || nx > W + 60 || ny < -60 || ny > H + 60) {
      if (s.z < 0.5) Object.assign(s, spawn(true));
      continue;
    }

    const size = Math.min(SIZE_MAX, SIZE_BASE + SIZE_K / s.z);
    const tw = Math.sin(elapsed * s.rate + s.phase) * 0.5 + 0.5;
    const depth = Math.min(1, df * 1.05 + 0.18);
    let alpha = depth * (0.45 + tw * 0.55) * intensity;
    if (alpha > 1) alpha = 1;
    if (alpha <= 0) continue;

    const c = s.neon ? NEON_RGB : STAR_RGB;
    ctx.font = `${size}px ui-monospace, 'Courier New', monospace`;

    // Motion smear: only while flying between sections (travel > 0). Ghost copies
    // bridge where the star was ~70ms ago (a larger z) to where it is now, so the
    // streak length scales with speed and reads as one continuous trail.
    if (trailAmt > 0.02) {
      const zTrail = s.z + speed * 0.07;
      const dfT = 1 - zTrail;
      const tx = cx + (s.x / zTrail) * W * F + shiftX * dfT;
      const ty = cy + (s.y / zTrail) * H * F + shiftY * dfT;
      for (let i = 1; i <= TRAIL_COPIES; i++) {
        const f = i / (TRAIL_COPIES + 1);
        const gx = nx + (tx - nx) * f;
        const gy = ny + (ty - ny) * f;
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha * (1 - f) * 0.5 * trailAmt})`;
        ctx.fillText(s.glyph, gx, gy);
      }
    }

    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
    ctx.fillText(s.glyph, nx, ny);
  }
}

// ── animation loop ──────────────────────────────────────────────────────────
function tick(ts) {
  if (lastTs === null) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  if (!staticMode()) animationId = requestAnimationFrame(tick);
  if (canvasRef.value) draw(ts / 1000, dt);
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
  const first = cssW === 0;
  cssW = w;
  cssH = h;
  dpr = ratio;
  // (Re)seed the field on first layout and whenever the area changes a lot.
  if (first || stars.length === 0) buildStars();
}

function drawStatic() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  requestAnimationFrame((ts) => draw(ts / 1000, 0));
}

function applyMode() {
  if (staticMode()) {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    drawStatic();
  } else if (animationId === null && !document.hidden) {
    lastTs = null;
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

function onMouseMove(e) {
  mouseTX = e.clientX / window.innerWidth - 0.5;
  mouseTY = e.clientY / window.innerHeight - 0.5;
}
function onMouseLeave() {
  mouseTX = 0;
  mouseTY = 0;
}

function onVisibility() {
  if (document.hidden) {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  } else if (!staticMode() && animationId === null) {
    lastTs = null;
    animationId = requestAnimationFrame(tick);
  }
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  syncSize(canvas);

  resizeObserver = new ResizeObserver(() => {
    syncSize(canvas);
    buildStars();
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
  window.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseleave", onMouseLeave);
  document.removeEventListener("visibilitychange", onVisibility);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="starfield-canvas fixed inset-0 w-full h-full z-0 pointer-events-none"
    aria-hidden="true"
  />
</template>
