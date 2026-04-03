<script setup>
import { Github, Linkedin } from "lucide-vue-next";
import { SOCIAL_LINKS } from "@/constants/socialLinks";

defineProps({
  iconClass: { type: String, default: "h-5 w-5" },
});
</script>

<template>
  <div class="flex items-center gap-6">
    <a
      :href="SOCIAL_LINKS.github"
      target="_blank"
      rel="noopener noreferrer"
      class="text-muted-foreground hover:text-primary transition-colors"
      aria-label="GitHub"
    >
      <Github :class="iconClass" />
    </a>
    <a
      :href="SOCIAL_LINKS.linkedin"
      target="_blank"
      rel="noopener noreferrer"
      class="text-muted-foreground hover:text-primary transition-colors"
      aria-label="LinkedIn"
    >
      <Linkedin :class="iconClass" />
    </a>
  </div>
</template>
