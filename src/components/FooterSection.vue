<script setup>
import SocialLinks from "@/components/ui/SocialLinks.vue";
import { useI18n } from "@/i18n";
import { useScrollReveal } from "@/composables/useScrollReveal";

const { t } = useI18n();
const { target: sectionRef, isVisible } = useScrollReveal({ threshold: 0.3 });
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer ref="sectionRef" class="relative border-t border-border bg-card/50">
    <div class="mx-auto max-w-6xl px-6 py-12">
      <div :class="['scroll-reveal flex flex-col md:flex-row items-center justify-between gap-6', { revealed: isVisible }]">
        <span class="font-mono text-sm font-semibold tracking-tight">
          <span class="text-primary">SR</span><span class="text-muted-foreground">.</span>
        </span>

        <SocialLinks show-mail />

        <p class="text-sm text-muted-foreground font-mono">
          &copy; {{ currentYear }} | {{ t.footer.builtWith }}
        </p>
      </div>
    </div>
  </footer>
</template>
