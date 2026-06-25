import { ref, computed, watch, onMounted, onUnmounted } from "vue";

// ── typing rhythm (TUNABLE) ─────────────────────────────────────────────────────
const CHAR_MIN_MS = 18; // fastest keystroke
const CHAR_JITTER_MS = 28; // random extra per char → 18–46ms
const PUNCT_PAUSE_MS = 140; // extra pause after , . ; : ! ?
const SPACE_PAUSE_MS = 90; // occasional hesitation on a space
const SPACE_PAUSE_CHANCE = 0.12;
const LINE_PAUSE_MS = 320; // pause between lines
const PUNCT = ",.;:!?";

/**
 * Simulates a terminal typewriter effect over an array of strings, with a
 * human rhythm (jittered per-char delay, longer pauses after punctuation).
 * Restarts when `lines` changes (e.g. locale switch). `finish()` reveals
 * everything instantly — used for click/key skip; reduced-motion users get
 * the finished state from the start (and on a live media-query flip).
 */
export function useTypewriter(lines) {
  const displayedLines = ref([]);
  const currentLineIndex = ref(0);
  const currentCharIndex = ref(0);
  let timerId = null;
  let reducedQuery = null;

  // Clears the active timeout to prevent overlapping ticks
  function stop() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  // Processes the next character or line in the sequence
  function tick() {
    const src = lines.value;
    if (currentLineIndex.value >= src.length) return;

    const line = src[currentLineIndex.value];

    if (currentCharIndex.value < line.length) {
      if (displayedLines.value.length <= currentLineIndex.value) {
        displayedLines.value.push("");
      }
      const ch = line[currentCharIndex.value];
      displayedLines.value[currentLineIndex.value] = line.slice(
        0,
        currentCharIndex.value + 1,
      );
      currentCharIndex.value++;

      let delay = CHAR_MIN_MS + Math.random() * CHAR_JITTER_MS;
      if (PUNCT.includes(ch)) delay += PUNCT_PAUSE_MS;
      else if (ch === " " && Math.random() < SPACE_PAUSE_CHANCE) delay += SPACE_PAUSE_MS;
      timerId = setTimeout(tick, delay);
    } else {
      currentLineIndex.value++;
      currentCharIndex.value = 0;
      timerId = setTimeout(tick, LINE_PAUSE_MS);
    }
  }

  // Reveal all lines instantly (skip, reduced motion). Idempotent.
  function finish() {
    stop();
    displayedLines.value = lines.value.slice();
    currentLineIndex.value = lines.value.length;
    currentCharIndex.value = 0;
  }

  // Resets state and restarts the typewriter effect
  function restart() {
    stop();
    if (reducedQuery?.matches) {
      finish();
      return;
    }
    displayedLines.value = [];
    currentLineIndex.value = 0;
    currentCharIndex.value = 0;
    tick();
  }

  function onMotionChange(e) {
    if (e.matches) finish();
  }

  // Restart effect when source lines change (locale switch)
  watch(lines, restart);

  onMounted(() => {
    reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedQuery.addEventListener("change", onMotionChange);
    restart();
  });
  onUnmounted(() => {
    stop();
    reducedQuery?.removeEventListener("change", onMotionChange);
  });

  const isFinished = computed(() => currentLineIndex.value >= lines.value.length);

  return { displayedLines, isFinished, finish };
}
