import { ref, watch, onMounted, onUnmounted } from "vue";

/**
 * Simulates a terminal typewriter effect over an array of strings.
 * Each line is revealed character by character, then the next line begins
 * after a short pause. Automatically restarts when `lines` changes (e.g. locale switch).
 */
export function useTypewriter(lines) {
  const displayedLines = ref([]);
  const currentLineIndex = ref(0);
  const currentCharIndex = ref(0);
  let timerId = null;

  function stop() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function tick() {
    const src = lines.value;
    if (currentLineIndex.value >= src.length) return;

    const line = src[currentLineIndex.value];

    if (currentCharIndex.value < line.length) {
      if (displayedLines.value.length <= currentLineIndex.value) {
        displayedLines.value.push("");
      }
      displayedLines.value[currentLineIndex.value] = line.slice(
        0,
        currentCharIndex.value + 1,
      );
      currentCharIndex.value++;
      timerId = setTimeout(tick, 30);
    } else {
      currentLineIndex.value++;
      currentCharIndex.value = 0;
      timerId = setTimeout(tick, 500);
    }
  }

  function restart() {
    stop();
    displayedLines.value = [];
    currentLineIndex.value = 0;
    currentCharIndex.value = 0;
    tick();
  }

  watch(lines, restart);
  onMounted(tick);
  onUnmounted(stop);

  return { displayedLines };
}
