<script setup>
import { useTemplateRef } from "vue";
import { useScrollPresentation } from "@/composables/useScrollPresentation";

// Pins a journey section to the viewport and reveals its content progressively
// as the user scrolls (a slide, not a scroll-past). `zone` tags the stable,
// non-sticky track so useGalaxyJourney() can anchor the camera to it. `steps`
// is the number of staged `.present-step` children inside the slot.
defineProps({
  zone: { type: String, required: true },
  steps: { type: Number, default: 1 },
});

const trackRef = useTemplateRef("trackRef");
const { progress } = useScrollPresentation(trackRef);
</script>

<template>
  <div
    ref="trackRef"
    class="present-track"
    :data-journey="zone"
    :style="{ '--present': progress, '--steps': steps }"
  >
    <div class="present-sticky">
      <slot />
    </div>
  </div>
</template>
