<script setup>
import { ref, onMounted } from 'vue';
import NavBar from "@/components/NavBar.vue";
import HeroSection from "@/components/HeroSection.vue";
import AboutSection from "@/components/AboutSection.vue";
import TechStack from "@/components/TechStack.vue";
import ProjectsSection from "@/components/ProjectsSection.vue";
import HomeLabSection from "@/components/HomeLabSection.vue";
import ContactSection from "@/components/ContactSection.vue";
import FooterSection from "@/components/FooterSection.vue";
import ScrollToTop from "@/components/ScrollToTop.vue";
import NotFound from "@/components/NotFound.vue";

const isNotFound = ref(false);

onMounted(() => {
  // Check if the current path is something other than root /
  // We ignore hash routing (e.g., /#about) since it's a single page app
  const path = window.location.pathname;
  if (path !== '/' && path !== '/index.html') {
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
