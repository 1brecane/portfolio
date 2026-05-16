<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const CHARSET = " .:·*+=%@";

const stars = ref([]);
let motionQuery = null;
let reducedMotion = false;

function createStars() {
  const w = window.innerWidth;
  const count = w < 480 ? 70 : w < 1024 ? 110 : 160;

  stars.value = Array.from({ length: count }, (_, id) => ({
    id,
    char: CHARSET[Math.floor(Math.random() * CHARSET.length)],
    left: Math.random() * 100,
    top: Math.random() * 100,
    opacity: 0.12 + Math.random() * 0.35,
    size: 9 + Math.random() * 11,
    delay: Math.random() * 6,
    duration: 2.5 + Math.random() * 4,
    primary: Math.random() > 0.72,
  }));
}

function onResize() {
  createStars();
}

function onMotionChange(e) {
  reducedMotion = e.matches;
}

onMounted(() => {
  createStars();
  window.addEventListener("resize", onResize, { passive: true });

  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = motionQuery.matches;
  motionQuery.addEventListener("change", onMotionChange);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  motionQuery?.removeEventListener("change", onMotionChange);
});
</script>

<template>
  <div class="ascii-starfield" aria-hidden="true">
    <span
      v-for="star in stars"
      :key="star.id"
      class="ascii-star"
      :class="{ 'ascii-star--primary': star.primary, 'ascii-star--twinkle': !reducedMotion }"
      :style="{
        left: `${star.left}%`,
        top: `${star.top}%`,
        opacity: star.opacity,
        fontSize: `${star.size}px`,
        animationDelay: `${star.delay}s`,
        animationDuration: `${star.duration}s`,
      }"
    >{{ star.char }}</span>
  </div>
</template>

<style scoped>
.ascii-starfield {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.ascii-star {
  position: absolute;
  font-family: var(--font-mono), ui-monospace, monospace;
  line-height: 1;
  color: color-mix(in oklch, var(--foreground) 70%, transparent);
  transform: translate(-50%, -50%);
  will-change: opacity;
}

.ascii-star--primary {
  color: color-mix(in oklch, var(--primary) 80%, white 20%);
}

.ascii-star--twinkle {
  animation: ascii-twinkle ease-in-out infinite;
}

@keyframes ascii-twinkle {
  0%,
  100% {
    opacity: 0.15;
  }
  50% {
    opacity: 1;
  }
}
</style>
