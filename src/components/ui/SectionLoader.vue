<script setup>
// Placeholder shown while an async section chunk loads (see HomeView.vue's
// defineAsyncComponent loaders). Reserves a screen of height so the page doesn't
// pop / shift when the real section mounts (matters in flat view & on mobile,
// where the .present-track height is auto rather than a fixed --present-track).
</script>

<template>
  <div
    class="flex min-h-[60vh] items-center justify-center"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <span class="sr-only">Loading…</span>
    <span class="section-loader" aria-hidden="true">
      <span class="section-loader__dot" />
      <span class="section-loader__dot" />
      <span class="section-loader__dot" />
    </span>
  </div>
</template>

<style scoped>
.section-loader {
  display: inline-flex;
  gap: 0.5rem;
}
.section-loader__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--primary);
  opacity: 0.35;
  animation: section-loader-pulse 1.2s ease-in-out infinite;
}
.section-loader__dot:nth-child(2) {
  animation-delay: 0.15s;
}
.section-loader__dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes section-loader-pulse {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 12px var(--neon-glow);
  }
}

@media (prefers-reduced-motion: reduce) {
  .section-loader__dot {
    animation: none;
    opacity: 0.5;
  }
}
</style>
