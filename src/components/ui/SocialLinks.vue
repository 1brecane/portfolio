<script setup>
import { Github, Linkedin, Mail } from "lucide-vue-next";
import { SOCIAL_LINKS } from "@/constants/socialLinks";

defineProps({
  iconClass: { type: String, default: "h-5 w-5" },
  showMail: { type: Boolean, default: false },
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
    <a
      v-if="showMail"
      :href="`mailto:${SOCIAL_LINKS.email}`"
      class="text-muted-foreground hover:text-primary transition-colors"
      aria-label="Email"
    >
      <Mail :class="iconClass" />
    </a>
  </div>
</template>
