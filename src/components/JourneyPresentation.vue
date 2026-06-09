<script setup>
import { computed, provide, useTemplateRef } from "vue";
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
</script>

<template>
  <div
    ref="trackRef"
    class="present-track"
    :data-journey="zone"
    :style="{ '--present': progress, '--steps': steps, ...flowStyle }"
  >
    <div class="present-sticky">
      <slot />
    </div>
    <!-- gentle proximity scroll-snap point at the fully-revealed reading position -->
    <span class="present-snap" aria-hidden="true" />
  </div>
</template>
