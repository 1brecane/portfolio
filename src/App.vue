<script setup>
import { ref, defineAsyncComponent, onMounted } from "vue";
import StarfieldBackground from "@/components/StarfieldBackground.vue";
import AsciiPlanets from "@/components/AsciiPlanets.vue";
import NavBar from "@/components/NavBar.vue";
import HeroSection from "@/components/HeroSection.vue";
import JourneyPresentation from "@/components/JourneyPresentation.vue";
import JourneyRail from "@/components/JourneyRail.vue";
import NotFound from "@/components/NotFound.vue";
import SectionLoader from "@/components/ui/SectionLoader.vue";
import { useI18n } from "@/i18n";
import { useGalaxyJourney } from "@/composables/useGalaxyJourney";
import { scrollToZone } from "@/composables/useJourneyScroll";

const { t } = useI18n();

// Lazy sections share a loading placeholder that reserves a screen of height, so
// they don't pop in blank / shift the layout on slow connections. `delay: 200`
// skips the loader on fast loads (no flash), so it only shows when it's actually slow.
const lazy = (loader) =>
  defineAsyncComponent({ loader, loadingComponent: SectionLoader, delay: 200 });

const AboutSection = lazy(() => import("@/components/AboutSection.vue"));
const TechStack = lazy(() => import("@/components/TechStack.vue"));
const ProjectsSection = lazy(() => import("@/components/ProjectsSection.vue"));
const HomeLabSection = lazy(() => import("@/components/HomeLabSection.vue"));
const ContactSection = lazy(() => import("@/components/ContactSection.vue"));
const FooterSection = lazy(() => import("@/components/FooterSection.vue"));
const ScrollToTop = defineAsyncComponent(() => import("@/components/ScrollToTop.vue"));

const isNotFound = ref(false);

// The camera that flies through the galaxy as you scroll the journey.
const { zoom, center, intensity, travel, activeIndex, progress } = useGalaxyJourney();

onMounted(() => {
  const path = window.location.pathname;
  if (path !== "/" && path !== "/index.html") {
    isNotFound.value = true;
    return;
  }

  // Deep link: if loaded with #section, land on that revealed slide once it (and
  // the lazy sections above it) have mounted — retry until its track exists.
  const hash = window.location.hash.replace("#", "");
  if (hash) {
    let done = false;
    const tryScroll = () => {
      if (done) return;
      const el =
        document.querySelector(`.present-track[data-journey="${hash}"]`) ||
        document.getElementById(hash);
      if (el) {
        done = true;
        scrollToZone(hash);
      }
    };
    [300, 700, 1300, 2000].forEach((ms) => setTimeout(tryScroll, ms));
  }
});
</script>

<template>
  <!-- Fixed ASCII starfield at z-0, behind the page (content is z-[2]). Driven by
       the scroll journey: intensity breathes, travel pushes/streaks between sections. -->
  <StarfieldBackground :zoom="zoom" :center="center" :intensity="intensity" :travel="travel" />
  <!-- The ASCII "worlds" met along the journey (hero rings → projects crescent → contact sphere). -->
  <AsciiPlanets :progress="progress" />

  <template v-if="isNotFound">
    <div class="relative z-[2] min-h-screen">
      <NotFound />
    </div>
  </template>
  <template v-else>
    <a href="#main-content" class="skip-link">{{ t.a11y.skipToContent }}</a>
    <main class="relative z-[2] min-h-screen">
      <NavBar :active-index="activeIndex" />
      <JourneyRail :active-index="activeIndex" />
      <div id="main-content" tabindex="-1">
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
      </div>
      <ScrollToTop />
    </main>
  </template>
</template>
