<script setup>
import { ref, defineAsyncComponent, onMounted } from "vue";
import AsciiStarfield from "@/components/AsciiStarfield.vue";
import GalaxyBackground from "@/components/GalaxyBackground.vue";
import NavBar from "@/components/NavBar.vue";
import HeroSection from "@/components/HeroSection.vue";
import JourneyPresentation from "@/components/JourneyPresentation.vue";
import JourneyRail from "@/components/JourneyRail.vue";
import NotFound from "@/components/NotFound.vue";
import { useGalaxyJourney } from "@/composables/useGalaxyJourney";

const AboutSection = defineAsyncComponent(() => import("@/components/AboutSection.vue"));
const TechStack = defineAsyncComponent(() => import("@/components/TechStack.vue"));
const ProjectsSection = defineAsyncComponent(() => import("@/components/ProjectsSection.vue"));
const HomeLabSection = defineAsyncComponent(() => import("@/components/HomeLabSection.vue"));
const ContactSection = defineAsyncComponent(() => import("@/components/ContactSection.vue"));
const FooterSection = defineAsyncComponent(() => import("@/components/FooterSection.vue"));
const ScrollToTop = defineAsyncComponent(() => import("@/components/ScrollToTop.vue"));

const isNotFound = ref(false);

// The camera that flies through the galaxy as you scroll the journey.
const { zoom, center, intensity, travel, activeIndex } = useGalaxyJourney();

onMounted(() => {
  const path = window.location.pathname;
  if (path !== "/" && path !== "/index.html") {
    isNotFound.value = true;
  }
});
</script>

<template>
  <!-- Two fixed background layers at z-0, behind the page (content is z-[2]). -->
  <AsciiStarfield />
  <GalaxyBackground :zoom="zoom" :center="center" :intensity="intensity" :travel="travel" />

  <template v-if="isNotFound">
    <div class="relative z-[2] min-h-screen">
      <NotFound />
    </div>
  </template>
  <template v-else>
    <main class="relative z-[2] min-h-screen">
      <NavBar />
      <JourneyRail :active-index="activeIndex" />
      <HeroSection />

      <div class="journey-gap" aria-hidden="true" />
      <JourneyPresentation zone="about" :steps="3">
        <AboutSection />
      </JourneyPresentation>

      <div class="journey-gap" aria-hidden="true" />
      <JourneyPresentation zone="stack" :steps="4">
        <TechStack />
      </JourneyPresentation>

      <div class="journey-gap" aria-hidden="true" />
      <JourneyPresentation zone="projects" :steps="5">
        <ProjectsSection />
      </JourneyPresentation>

      <div class="journey-gap" aria-hidden="true" />
      <JourneyPresentation zone="homelab" :steps="1">
        <HomeLabSection />
      </JourneyPresentation>

      <div class="journey-gap" aria-hidden="true" />
      <JourneyPresentation zone="contact" :steps="1">
        <ContactSection />
      </JourneyPresentation>

      <FooterSection />
      <ScrollToTop />
    </main>
  </template>
</template>
