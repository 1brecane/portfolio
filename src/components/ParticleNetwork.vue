<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const canvas = ref(null);

let ctx;
let animationId = null;
let mouseX = 0;
let mouseY = 0;
let width = 0;
let height = 0;
let dpr = 1;

const PARTICLE_COUNT = 120;
const CONNECTION_DISTANCE = 150;
const PRIMARY_R = 212, PRIMARY_G = 72, PRIMARY_B = 59;
const DIM_R = 51, DIM_G = 37, DIM_B = 37;

const particles = [];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function initParticles() {
  particles.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
    });
  }
}

function onMouseMove(e) {
  mouseX = (e.clientX / width) * 2 - 1;
  mouseY = (e.clientY / height) * 2 + 1;
}

function resize() {
  const el = canvas.value;
  if (!el) return;
  dpr = Math.min(window.devicePixelRatio, 2);
  width = el.clientWidth;
  height = el.clientHeight;
  el.width = width * dpr;
  el.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function animate() {
  animationId = requestAnimationFrame(animate);
  ctx.clearRect(0, 0, width, height);

  const halfW = width / 2;
  const halfH = height / 2;
  const offsetX = mouseX * 15;
  const offsetY = mouseY * 10;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -halfW || p.x > halfW) p.vx *= -1;
    if (p.y < -halfH || p.y > halfH) p.vy *= -1;
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const a = particles[i];
    const ax = a.x + halfW + offsetX;
    const ay = a.y + halfH + offsetY;

    for (let j = i + 1; j < PARTICLE_COUNT; j++) {
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CONNECTION_DISTANCE) {
        const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.6;
        const t = alpha;
        const r = lerp(DIM_R, PRIMARY_R, t) | 0;
        const g = lerp(DIM_G, PRIMARY_G, t) | 0;
        const b2 = lerp(DIM_B, PRIMARY_B, t) | 0;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r},${g},${b2},${alpha})`;
        ctx.lineWidth = 1;
        ctx.moveTo(ax, ay);
        ctx.lineTo(b.x + halfW + offsetX, b.y + halfH + offsetY);
        ctx.stroke();
      }
    }
  }

  ctx.fillStyle = `rgba(${PRIMARY_R},${PRIMARY_G},${PRIMARY_B},0.8)`;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i];
    ctx.beginPath();
    ctx.arc(p.x + halfW + offsetX, p.y + halfH + offsetY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function init() {
  const el = canvas.value;
  if (!el) return;
  ctx = el.getContext("2d");
  resize();
  initParticles();
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("resize", resize);
  animate();
}

function cleanup() {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("resize", resize);
}

onMounted(init);
onUnmounted(cleanup);
</script>

<template>
  <canvas ref="canvas" class="absolute inset-0 w-full h-full" />
</template>
