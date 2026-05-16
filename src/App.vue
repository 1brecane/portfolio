<script setup>
import { ref, defineAsyncComponent, onMounted } from "vue";
import AsciiStarfield from "@/components/AsciiStarfield.vue";
import NavBar from "@/components/NavBar.vue";
import HeroSection from "@/components/HeroSection.vue";
import NotFound from "@/components/NotFound.vue";

const AboutSection = defineAsyncComponent(() => import("@/components/AboutSection.vue"));
const TechStack = defineAsyncComponent(() => import("@/components/TechStack.vue"));
const ProjectsSection = defineAsyncComponent(() => import("@/components/ProjectsSection.vue"));
const HomeLabSection = defineAsyncComponent(() => import("@/components/HomeLabSection.vue"));
const ContactSection = defineAsyncComponent(() => import("@/components/ContactSection.vue"));
const FooterSection = defineAsyncComponent(() => import("@/components/FooterSection.vue"));
const ScrollToTop = defineAsyncComponent(() => import("@/components/ScrollToTop.vue"));

const isNotFound = ref(false);

onMounted(() => {
  const path = window.location.pathname;
  if (path !== "/" && path !== "/index.html") {
    isNotFound.value = true;
  }
});
</script>

<template>
  <AsciiStarfield />
  <template v-if="isNotFound">
    <div class="relative z-[2] min-h-screen">
      <NotFound />
    </div>
  </template>
  <template v-else>
    <main class="relative z-[2] min-h-screen">
      <NavBar />
      <HeroSection />
      <AboutSection />
      <TechStack />
      <ProjectsSection />
      <HomeLabSection />
      <ContactSection />
      <FooterSection />
      <ScrollToTop />
    </main>
  </template>
</template>
