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
      // Add a new line string if we just moved to a new index
      if (displayedLines.value.length <= currentLineIndex.value) {
        displayedLines.value.push("");
      }
      
      // Append the next character to the current line
      displayedLines.value[currentLineIndex.value] = line.slice(
        0,
        currentCharIndex.value + 1,
      );
      currentCharIndex.value++;
      
      // Schedule next character
      timerId = setTimeout(tick, 30);
    } else {
      // Move to the next line after completing the current one
      currentLineIndex.value++;
      currentCharIndex.value = 0;
      
      // Pause longer between lines
      timerId = setTimeout(tick, 500);
    }
  }

  // Resets state and restarts the typewriter effect
  function restart() {
    stop();
    displayedLines.value = [];
    currentLineIndex.value = 0;
    currentCharIndex.value = 0;
    tick();
  }

  // Restart effect when source lines change
  watch(lines, restart);
  
  onMounted(tick);
  onUnmounted(stop);

  return { displayedLines };
}
