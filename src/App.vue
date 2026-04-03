<script setup>
import NavBar from "@/components/NavBar.vue";
import HeroSection from "@/components/HeroSection.vue";
import AboutSection from "@/components/AboutSection.vue";
import TechStack from "@/components/TechStack.vue";
import ProjectsSection from "@/components/ProjectsSection.vue";
import HomeLabSection from "@/components/HomeLabSection.vue";
import FooterSection from "@/components/FooterSection.vue";
import ScrollToTop from "@/components/ScrollToTop.vue";
</script>

<template>
  <main class="min-h-screen">
    <NavBar />
    <HeroSection />
    <AboutSection />
    <TechStack />
    <ProjectsSection />
    <HomeLabSection />
    <FooterSection />
    <ScrollToTop />
  </main>
</template>
