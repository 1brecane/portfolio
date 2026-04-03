import { ref, onMounted, onUnmounted } from "vue";

/**
 * Observes an element's intersection with the viewport and flips
 * `isVisible` to true once it enters. Disconnects immediately after
 * triggering to avoid unnecessary observation.
 *
 * Bind `target` as a template ref on the element to watch.
 */
export function useScrollReveal(options = {}) {
  const target = ref(null);
  const isVisible = ref(false);
  let observer = null;

  onMounted(() => {
    if (!target.value) return;

    // Initialize IntersectionObserver to trigger when element enters viewport
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isVisible.value = true;
          // Stop observing once revealed to save resources
          observer.disconnect();
        }
      },
      {
        threshold: options.threshold ?? 0.12,
        rootMargin: options.rootMargin ?? "0px 0px -60px 0px",
      }
    );

    observer.observe(target.value);
  });

  onUnmounted(() => {
    // Clean up observer on component unmount
    observer?.disconnect();
  });

  return { target, isVisible };
}
