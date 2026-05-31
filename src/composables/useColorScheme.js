import { ref } from "vue";

// Module-level singleton: the galaxy's hover palette (1=amber, 2=cyan, 3=green).
// The Hero terminal `color N` easter egg writes it; GalaxyBackground reads it.
// Lives outside any component so the (now app-level) galaxy and the hero terminal
// share one source of truth without prop drilling.
const colorScheme = ref(1);

export function useColorScheme() {
  function setColorScheme(n) {
    if (n >= 1 && n <= 3) colorScheme.value = n;
  }
  return { colorScheme, setColorScheme };
}
