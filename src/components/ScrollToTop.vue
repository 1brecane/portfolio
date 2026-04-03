<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ArrowUp } from "lucide-vue-next";

const isVisible = ref(false);

function handleScroll() {
  isVisible.value = window.scrollY > 600;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => window.addEventListener("scroll", handleScroll));
onUnmounted(() => window.removeEventListener("scroll", handleScroll));
</script>

<template>
  <Transition name="fade">
    <button
      v-if="isVisible"
      class="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-primary text-primary-foreground
             shadow-lg neon-glow cursor-pointer transition-transform hover:scale-110
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Scroll to top"
      @click="scrollToTop"
    >
      <ArrowUp class="h-5 w-5" />
    </button>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
