<script setup>
import { ref, defineAsyncComponent, onMounted } from "vue";
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
  <template v-if="isNotFound">
    <NotFound />
  </template>
  <template v-else>
    <main class="min-h-screen">
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
