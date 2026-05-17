import { ref, useTemplateRef, onMounted, onUnmounted } from "vue";

export function useScrollReveal(refName, options = {}) {
  const target = useTemplateRef(refName);
  const isVisible = ref(false);
  let observer = null;

  onMounted(() => {
    if (!target.value) return;

    // Immediately reveal elements already in or above the viewport —
    // prevents hidden sections after fast upward scroll (IO may not fire in time)
    const rect = target.value.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) {
      isVisible.value = true;
      return;
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isVisible.value = true;
          observer.disconnect();
        }
      },
      {
        threshold: options.threshold ?? 0.05,
        rootMargin: options.rootMargin ?? "100px 0px -30px 0px",
      }
    );

    observer.observe(target.value);
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  return { isVisible };
}
