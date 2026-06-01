import { ref, watch } from "vue";

/**
 * useJourneyMode()
 *
 * Module-level singleton for the user's chosen viewing mode:
 *   • "cinematic" — the full pinned-slide + camera-flight journey (default).
 *   • "flat"      — a "simple view" that collapses the gaps and pinning so the
 *                   page reads as a plain stacked layout (no long scroll).
 *
 * The choice is persisted to localStorage and mirrored onto
 * `<html data-journey-mode="…">`, which `globals.css` keys off to flatten the
 * layout (same rules as the responsive / reduced-motion fallback). The galaxy
 * camera (useGalaxyJourney) also reads this and holds still in "flat".
 *
 * Returning visitors get their last choice without re-watching the intro.
 */

const STORAGE_KEY = "journey-mode";
const mode = ref("cinematic");
let initialized = false;

function syncDom(v) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.journeyMode = v;
  }
}

function init() {
  if (initialized) return;
  initialized = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "flat" || saved === "cinematic") mode.value = saved;
  } catch {
    /* localStorage unavailable (private mode etc.) — fall back to default */
  }
  syncDom(mode.value);
  watch(mode, (v) => {
    syncDom(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore persistence failures */
    }
  });
}

export function useJourneyMode() {
  init();

  function setMode(v) {
    if (v === "flat" || v === "cinematic") mode.value = v;
  }
  function toggle() {
    mode.value = mode.value === "flat" ? "cinematic" : "flat";
  }

  return { mode, setMode, toggle };
}
