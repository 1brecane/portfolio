import { ref, onMounted, onUnmounted } from "vue";

/**
 * useWindowScroll()
 *
 * Module-level singleton: ONE shared `scrollY` ref behind ONE rAF-throttled
 * `scroll` listener, shared by every consumer (NavBar, HeroSection, ScrollToTop).
 *
 * Previously each call attached its own listener that wrote a reactive ref on
 * *every* scroll event (no throttle) — three listeners + per-event reactive churn,
 * even though all consumers only read a threshold (`> 50`, `< 60`, `> 600`). One
 * coalesced, frame-throttled source is equivalent and far cheaper. A consumer
 * refcount attaches the listener on first mount and detaches it after the last
 * unmount.
 */

const scrollY = ref(typeof window !== "undefined" ? window.scrollY : 0);
let consumers = 0;
let raf = null;
let listening = false;

function update() {
  raf = null;
  scrollY.value = window.scrollY;
}

function onScroll() {
  if (raf === null) raf = requestAnimationFrame(update);
}

function start() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", onScroll, { passive: true });
}

function stop() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("scroll", onScroll);
  if (raf !== null) {
    cancelAnimationFrame(raf);
    raf = null;
  }
}

export function useWindowScroll() {
  onMounted(() => {
    consumers++;
    scrollY.value = window.scrollY; // sync now (page may have loaded already scrolled)
    start();
  });
  onUnmounted(() => {
    consumers--;
    if (consumers <= 0) stop();
  });

  return { scrollY };
}
