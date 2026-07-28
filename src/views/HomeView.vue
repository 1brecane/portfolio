<script setup>
import { defineAsyncComponent, inject, onMounted } from "vue";
import NavBar from "@/components/NavBar.vue";
import HeroSection from "@/components/HeroSection.vue";
import JourneyPresentation from "@/components/JourneyPresentation.vue";
import JourneyRail from "@/components/JourneyRail.vue";
import SectionLoader from "@/components/ui/SectionLoader.vue";
import { useI18n } from "@/i18n";
import { scrollToZone } from "@/composables/useJourneyScroll";

const { t } = useI18n();
const activeIndex = inject("journeyActiveIndex");

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

onMounted(() => {
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
  <a href="#main-content" class="skip-link">{{ t.a11y.skipToContent }}</a>
  <!-- pointer-events-none at the page-content root: `min-h-screen` + normal
       document flow means this <main>'s own box spans the full scroll height
       at z-[2], one stacking level above the fixed z-1 AsciiPlanets layer —
       with the CSS default (`auto`) it would swallow every click meant for a
       planet hotspot underneath, everywhere on the page, not just where a
       section is visually "empty". Re-enable `auto` on the real content
       (nav, rail, each section) so normal interactivity is unaffected —
       deliberately NOT on `#main-content` itself, whose own box spans the
       same full height as `<main>` and would just reintroduce the same
       block one level down. Only actually-reserved dead zones (e.g.
       HeroSection's planet spacer) carve their own further
       pointer-events-none locally, inside a section that's otherwise auto. -->
  <main class="relative z-[2] min-h-screen pointer-events-none">
    <NavBar :active-index="activeIndex" />
    <JourneyRail :active-index="activeIndex" class="pointer-events-auto" />
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
      <JourneyPresentation zone="projects" :steps="5" bleed-gutter>
        <ProjectsSection />
      </JourneyPresentation>

      <div class="journey-gap" aria-hidden="true" />
      <JourneyPresentation zone="homelab" :steps="1">
        <HomeLabSection />
      </JourneyPresentation>

      <div class="journey-gap" aria-hidden="true" />
      <JourneyPresentation zone="contact" :steps="1" bleed-gutter>
        <ContactSection />
      </JourneyPresentation>

      <FooterSection class="pointer-events-auto" />
    </div>
    <ScrollToTop class="pointer-events-auto" />
  </main>
</template>
