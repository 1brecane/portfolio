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
const N_ARMS = 3;
const ARM_WIDTH = 0.4;   // wide → diffuse, particle-like
const CORE_R = 0.1;
const BLACK_HOLE_R = 0.08;
const OUTER_R = 1.10;   // large so the disc overflows all four edges

// ── perspective projection ────────────────────────────────────────────────────
const TILT_DEG  = 40;
const TILT_SIN  = Math.sin(TILT_DEG * Math.PI / 180); // ≈ 0.669

// ── rendering ────────────────────────────────────────────────────────────────
const FONT_SIZE = 15;
const CHARSET   = " .·+*";   // light glyphs → particle aesthetic

// ── mouse hover ───────────────────────────────────────────────────────────────
let mouseX = -9999;
let mouseY = -9999;
const MOUSE_RADIUS    = 130;
const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;

// Trail: per-cell hover intensity that decays over time
const trailMap  = new Map(); // integer cell key → intensity 0..1
const TRAIL_K   = 0.5;
let   prevElapsed = 0;

// Color bands as RGB tuples — mirrors charColor thresholds
const BANDS_BASE = [
  [0.13, [255, 255, 255]],
  [0.22, [255, 170, 119]],
  [0.40, [255,  85,  51]],
  [0.70, [238,  51,  17]],
  [Infinity, [122, 18,  8]],
];

const BANDS_HOVER = [
  [0.13, [255, 255, 255]],    // white core stays white
  [0.22, [255, 224, 102]],    // amber  → light gold
  [0.40, [255, 204,   0]],    // red    → vivid gold
  [0.70, [255, 170,   0]],    // crimson → warm amber
  [Infinity, [204, 102, 0]],  // dark red → dark orange
];

function getBandRgb(r, bands) {
  for (const [thresh, rgb] of bands) {
    if (r < thresh) return rgb;
  }
  return bands[bands.length - 1][1];
}

function blendColor(a, b, t) {
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
}

function smoothstep(t) { return t * t * (3 - 2 * t); }

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

// ── colour: white-hot core → bright amber → vivid red → visible crimson ──────
function charColor(r) {
  if (r < 0.13) return "#ffffff";
  if (r < 0.22) return "#ffaa77";
  if (r < 0.40) return "#ff5533";
  if (r < 0.70) return "#ee3311";
  return               "#7a1208";
}

// ── draw one frame ────────────────────────────────────────────────────────────
function draw(canvas, elapsed) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Decay all trail intensities proportional to elapsed time
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

  ctx.font = `${FONT_SIZE}px ui-monospace, 'Courier New', monospace`;

  const CHAR_W = ctx.measureText("M").width;
  const CHAR_H = FONT_SIZE;

  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";

  const cols  = Math.ceil(W / CHAR_W) + 2;
  const rows  = Math.ceil(H / CHAR_H) + 2;

  const cx    = W / 2;
  const cy    = H * 0.52;
  const scale = W / 2;

  const rot = elapsed * 0.035;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = (col - 1) * CHAR_W + CHAR_W / 2;
      const py = (row - 1) * CHAR_H + CHAR_H / 2;

      const x_gal = (px - cx) / scale;
      const z_gal = (py - cy) / (scale * TILT_SIN);

      const r     = Math.sqrt(x_gal * x_gal + z_gal * z_gal);
      if (r > OUTER_R) continue;

      const theta = Math.atan2(z_gal, x_gal);

      const h1 = hash(col, row);
      const h2 = hash(col + 500, row + 500);

      const isBlackHole = r < BLACK_HOLE_R;
      const isRing      = !isBlackHole && r < CORE_R;

      // ── black hole interior: barely visible dark chars ───────────────────────
      if (isBlackHole) {
        const bhSet = "@#$·.";
        const ch = bhSet[Math.floor(h2 * bhSet.length)];
        ctx.globalAlpha = 0.28 + h1 * 0.32; // 0.28 – 0.60
        ctx.fillStyle   = "#262638";
        ctx.fillText(ch, px, py);
        continue;
      }

      // ── white ring: event horizon ─────────────────────────────────────────────
      if (isRing) {
        const ringSet = "@#O";
        const ch = ringSet[Math.floor(h1 * ringSet.length)];
        const pulse = Math.sin(elapsed * 2.5 + col * 1.5 + row * 1.1) * 0.12;
        ctx.globalAlpha = Math.min(1, 0.88 + pulse);
        ctx.fillStyle   = "#ffffff";
        ctx.fillText(ch, px, py);
        continue;
      }

      // ── normal galaxy ─────────────────────────────────────────────────────────
      let d = density(r, theta, rot);
      const fillRate = r < CORE_R * 2.5 ? 0.95 : 0.68;
      if (h1 > d * fillRate) continue;

      const charIdx = Math.min(
        CHARSET.length - 1,
        Math.floor((d * 0.65 + h2 * 0.35) * CHARSET.length),
      );
      let ch = CHARSET[charIdx];
      if (ch === " ") continue;

      const twinkle = Math.sin(elapsed * 1.8 + col * 2.3 + row * 1.7) * 0.10;

      const h3 = hash(col + 1000, row + 777);
      const isBrightStar = d > 0.12 && h3 < 0.07;

      const dxm      = px - mouseX;
      const dym      = py - mouseY;
      const distSq   = dxm * dxm + dym * dym;
      const currentT = distSq < MOUSE_RADIUS_SQ
        ? smoothstep(1 - distSq / MOUSE_RADIUS_SQ)
        : 0;

      const cellKey  = row * 10000 + col;
      const stored   = trailMap.get(cellKey) || 0;
      if (currentT > stored) trailMap.set(cellKey, currentT);
      const mouseT = Math.max(currentT, stored);

      if (isBrightStar) {
        ch = h3 < 0.035 ? "+" : "*";
        ctx.globalAlpha = Math.min(1, 0.65 + Math.sin(elapsed * 2.8 + col * 3.7 + row * 2.3) * 0.35);
        if (mouseT > 0 && h3 >= 0.02) {
          ctx.fillStyle = blendColor([255, 238, 204], [255, 240, 100], mouseT);
        } else {
          ctx.fillStyle = h3 < 0.02 ? "#ffffff" : "#ffeecc";
        }
      } else {
        ctx.globalAlpha = Math.min(1, Math.max(0.50, d * 1.8 + twinkle));
        if (mouseT > 0) {
          ctx.fillStyle = blendColor(getBandRgb(r, BANDS_BASE), getBandRgb(r, BANDS_HOVER), mouseT);
        } else {
          ctx.fillStyle = charColor(r);
        }
      }
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

function onMouseMove(e) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (canvas.width  / rect.width);
  mouseY = (e.clientY - rect.top)  * (canvas.height / rect.height);
}

function onMouseLeave() {
  mouseX = -9999;
  mouseY = -9999;
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

  window.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("mouseleave", onMouseLeave);

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
  window.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseleave", onMouseLeave);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 w-full h-full z-0 pointer-events-none"
    aria-hidden="true"
  />
</template>
