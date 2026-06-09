<script setup>
import { computed, onMounted, onUnmounted, provide, ref, useTemplateRef } from "vue";
import { useScrollPresentation } from "@/composables/useScrollPresentation";
import { getZoneFlow } from "@/composables/useGalaxyJourney";

// Pins a journey section to the viewport and reveals its content progressively
// as the user scrolls (a slide, not a scroll-past). `zone` tags the stable,
// non-sticky track so useGalaxyJourney() can anchor the camera to it. `steps`
// is the number of staged `.present-step` children inside the slot.
const props = defineProps({
  zone: { type: String, required: true },
  steps: { type: Number, default: 1 },
});

const trackRef = useTemplateRef("trackRef");
const { progress } = useScrollPresentation(trackRef);

// Slide progress for children — SectionHeader uses it for the title decode.
provide("presentProgress", progress);

// Per-zone drift vectors (camera-pan direction, see getZoneFlow). Note the
// semantics: --enter-x/y is the slide's INITIAL OFFSET direction — it travels
// the opposite way, settling at 0. The micro-rotation leans the exiting slide
// into its horizontal motion. Computed so a (hypothetical) runtime zone change
// stays correct.
const flowStyle = computed(() => {
  const flow = getZoneFlow(props.zone);
  return {
    "--enter-x": flow.enter.x.toFixed(3),
    "--enter-y": flow.enter.y.toFixed(3),
    "--exit-x": flow.exit.x.toFixed(3),
    "--exit-y": flow.exit.y.toFixed(3),
    "--exit-rot": `${(flow.exit.x * 1.2).toFixed(2)}deg`,
  };
});

// ── Short-viewport hold-pan ───────────────────────────────────────────────────
// On laptop-height screens a slide can be taller than the viewport: there's no
// flex slack left to center it, so the bottom is cut off (and the title sits
// under the fixed navbar). `--pan` is that overflow in px; globals.css uses it
// to slowly pan the slide up across the hold band, so the long hold scrub
// exposes the bottom. 0 on screens where the slide fits → exact no-op.
// translate doesn't affect scrollHeight, so the ResizeObserver can't feed back.
const stickyRef = useTemplateRef("stickyRef");
const pan = ref(0);
let panObserver = null;

function measurePan() {
  const el = stickyRef.value;
  if (!el) return;
  pan.value = Math.max(0, el.scrollHeight - window.innerHeight);
}

onMounted(() => {
  measurePan();
  window.addEventListener("resize", measurePan, { passive: true });
  panObserver = new ResizeObserver(measurePan);
  if (stickyRef.value) panObserver.observe(stickyRef.value);
});

onUnmounted(() => {
  window.removeEventListener("resize", measurePan);
  panObserver?.disconnect();
});
</script>

<template>
  <div
    ref="trackRef"
    class="present-track"
    :data-journey="zone"
    :style="{ '--present': progress, '--steps': steps, '--pan': `${pan}px`, ...flowStyle }"
  >
    <div ref="stickyRef" class="present-sticky">
      <slot />
    </div>
    <!-- gentle proximity scroll-snap point at the fully-revealed reading position -->
    <span class="present-snap" aria-hidden="true" />
  </div>
</template>
