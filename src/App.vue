<script setup>
import { computed, provide } from "vue";
import { useRoute } from "vue-router";
import StarfieldBackground from "@/components/StarfieldBackground.vue";
import AsciiPlanets from "@/components/AsciiPlanets.vue";
import { useGalaxyJourney } from "@/composables/useGalaxyJourney";
import { caseStudies } from "@/data/caseStudies";

// The camera that flies through the galaxy as you scroll the journey. Called
// once, here: it owns window listeners, and the canvases it drives live in this
// shell so they never remount across route changes.
const { zoom, center, intensity, travel, activeIndex, progress } = useGalaxyJourney();

provide("journeyActiveIndex", activeIndex);

const route = useRoute();
// Case-study pages: swap the journey worlds for one fixed "emblem" planet.
const ambient = computed(() =>
  route.name === "case-study" ? (caseStudies[route.params.slug]?.planet ?? null) : null,
);
</script>

<template>
  <!-- Fixed ASCII starfield at z-0, behind the page (content is z-[2]). Driven by
       the scroll journey: intensity breathes, travel pushes/streaks between sections. -->
  <StarfieldBackground :zoom="zoom" :center="center" :intensity="intensity" :travel="travel" />
  <!-- The ASCII "worlds" met along the journey (hero rings → projects crescent → contact sphere). -->
  <AsciiPlanets :progress="progress" :ambient="ambient" />

  <RouterView />
</template>
