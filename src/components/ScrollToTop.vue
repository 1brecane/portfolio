<script setup>
import { computed } from "vue";
import { ArrowUp } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import { useWindowScroll } from "@/composables/useWindowScroll";

const { t } = useI18n();
const { scrollY } = useWindowScroll();
const isVisible = computed(() => scrollY.value > 600);

function scrollToTop() {
  // The global CSS reduced-motion override doesn't reach an explicit JS smooth
  // scroll, so check the preference here (the return trip crosses the whole
  // journey — a long forced animation otherwise).
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
}
</script>

<template>
  <Transition name="fade">
    <button
      v-if="isVisible"
      class="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-primary text-primary-foreground shadow-lg neon-glow cursor-pointer tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :aria-label="t.a11y.scrollToTop"
      @click="scrollToTop"
    >
      <ArrowUp class="h-5 w-5" />
    </button>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
