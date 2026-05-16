<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const canvasRef = ref(null);

let animationId   = null;
let resizeObserver = null;
let motionQuery   = null;
let reducedMotion = false;
let startTime     = null;

// ── galaxy constants ──────────────────────────────────────────────────────────
const SPIRAL_K  = 1 / Math.tan((10 * Math.PI) / 180);
const N_ARMS    = 3;
const ARM_WIDTH = 0.3;   // wide → diffuse, particle-like
const CORE_R    = 0.1;
const OUTER_R   = 1.10;   // large so the disc overflows all four edges

// ── perspective projection ────────────────────────────────────────────────────
// We view the galaxy disc (XZ plane) at ~45° elevation, like looking at a
// horizontal granite slab from the side.  In screen space:
//   screen_x = galaxy_x            (no change)
//   screen_y = galaxy_z * TILT_SIN (depth axis compressed)
// To invert (pixel → galaxy coords):
//   galaxy_x = (px - cx) / scale
//   galaxy_z = (py - cy) / (scale * TILT_SIN)
const TILT_DEG  = 40;
const TILT_SIN  = Math.sin(TILT_DEG * Math.PI / 180); // ≈ 0.669

// ── rendering ────────────────────────────────────────────────────────────────
const FONT_SIZE = 15;
const CHARSET   = " .·+*";   // light glyphs → particle aesthetic

// ── stable per-cell pseudo-random hash ───────────────────────────────────────
function hash(col, row) {
  const v = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
  return v - Math.floor(v); // 0…1 uniform-ish
}

// ── galaxy density at (r, θ, rotation) ───────────────────────────────────────
function density(r, theta, rot) {
  if (r === 0)      return 1;
  if (r > OUTER_R)  return 0;

  const core  = Math.exp(-(r * r) / (2 * CORE_R * CORE_R));
  const outer = 1 - Math.pow(r / OUTER_R, 3);
  const inner = 1 - Math.exp(-(r * r) / (2 * 0.03 * 0.03));

  const base = SPIRAL_K * Math.log(r);
  let arm = 0;
  for (let a = 0; a < N_ARMS; a++) {
    const armTheta = base + a * (Math.PI * 2 / N_ARMS) + rot;
    let diff = ((theta - armTheta) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    arm = Math.max(
      arm,
      Math.exp(-(diff * diff) / (2 * ARM_WIDTH * ARM_WIDTH)) * outer * inner,
    );
  }

  return Math.max(core, arm);
}

// ── colour: white-hot core → orange-red → vivid red → deep crimson ───────────
function charColor(r) {
  if (r < 0.13) return "#fff0e8";
  if (r < 0.22) return "#ff6644";
  if (r < 0.40) return "#ee2200";
  if (r < 0.70) return "#cc1100";
  return               "#991100";
}

// ── draw one frame ────────────────────────────────────────────────────────────
function draw(canvas, elapsed) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.font = `${FONT_SIZE}px ui-monospace, 'Courier New', monospace`;

  const CHAR_W = ctx.measureText("M").width;
  const CHAR_H = FONT_SIZE;

  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";

  // Extra cols/rows so perspective-clipped chars are never half-cut
  const cols  = Math.ceil(W / CHAR_W) + 2;
  const rows  = Math.ceil(H / CHAR_H) + 2;

  const cx    = W / 2;
  // Shift centre slightly upward: the "near" (bottom) side of the disc is more
  // visible, like looking at a slab from below eye-level
  const cy    = H * 0.52;
  const scale = W / 2; // r=1 → screen half-width

  const rot = elapsed * 0.035;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = (col - 1) * CHAR_W + CHAR_W / 2;
      const py = (row - 1) * CHAR_H + CHAR_H / 2;

      // ── invert the perspective to get galaxy-disc coordinates ────────────
      const x_gal = (px - cx) / scale;
      const z_gal = (py - cy) / (scale * TILT_SIN); // un-compress depth axis

      const r     = Math.sqrt(x_gal * x_gal + z_gal * z_gal);
      if (r > OUTER_R) continue;

      const theta = Math.atan2(z_gal, x_gal);

      const h1 = hash(col, row);
      const h2 = hash(col + 500, row + 500);

      let d = density(r, theta, rot);

      // ── scatter: treat density as probability of a star existing ─────────
      const isCore = r < CORE_R;
      const fillRate = isCore ? 1.0 : r < CORE_R * 2.5 ? 0.92 : 0.50;
      if (h1 > d * fillRate) continue;

      // ── character: heavy glyphs in core, light particles in arms ─────────
      let ch;
      if (isCore) {
        const coreSet = "#@#@#@";
        ch = coreSet[Math.min(coreSet.length - 1, Math.floor(d * coreSet.length))];
      } else {
        const charIdx = Math.min(
          CHARSET.length - 1,
          Math.floor((d * 0.65 + h2 * 0.35) * CHARSET.length),
        );
        ch = CHARSET[charIdx];
      }
      if (ch === " ") continue;

      // ── subtle per-star twinkle ──────────────────────────────────────────
      const twinkle = Math.sin(elapsed * 1.8 + col * 2.3 + row * 1.7) * 0.10;
      ctx.globalAlpha = Math.min(1, Math.max(0.25, d * 1.3 + twinkle));
      ctx.fillStyle   = charColor(r);
      ctx.fillText(ch, px, py);
    }
  }

  ctx.globalAlpha = 1;
}

// ── animation loop ────────────────────────────────────────────────────────────
function tick(ts) {
  if (startTime === null) startTime = ts;
  const canvas = canvasRef.value;
  if (canvas) draw(canvas, (ts - startTime) / 1000);
  if (!reducedMotion) animationId = requestAnimationFrame(tick);
}

function syncSize(canvas) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width  = w;
    canvas.height = h;
  }
}

function onMotionChange(e) {
  reducedMotion = e.matches;
  if (!reducedMotion) {
    animationId = requestAnimationFrame(tick);
  } else {
    if (animationId !== null) { cancelAnimationFrame(animationId); animationId = null; }
  }
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  syncSize(canvas);

  resizeObserver = new ResizeObserver(() => {
    syncSize(canvas);
    if (reducedMotion) requestAnimationFrame((ts) => {
      if (startTime === null) startTime = ts;
      draw(canvas, (ts - startTime) / 1000);
    });
  });
  resizeObserver.observe(canvas);

  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = motionQuery.matches;
  motionQuery.addEventListener("change", onMotionChange);

  if (reducedMotion) {
    requestAnimationFrame((ts) => { startTime = ts; draw(canvas, 0); });
  } else {
    animationId = requestAnimationFrame(tick);
  }
});

onUnmounted(() => {
  if (animationId !== null) cancelAnimationFrame(animationId);
  resizeObserver?.disconnect();
  motionQuery?.removeEventListener("change", onMotionChange);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 w-full h-full z-0 pointer-events-none"
    aria-hidden="true"
  />
</template>
