<script setup>
import { computed } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import SocialLinks from "@/components/ui/SocialLinks.vue";
import ParticleNetwork from "@/components/ParticleNetwork.vue";
import { useI18n } from "@/i18n";
import { useTypewriter } from "@/composables/useTypewriter";

const { t } = useI18n();

const terminalLines = computed(() => t.value.hero.terminal);
const { displayedLines } = useTypewriter(terminalLines);
</script>

<template>
  <section id="hero" class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <ParticleNetwork />

    <div class="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background pointer-events-none" />

    <div class="relative z-10 mx-auto max-w-6xl px-6 py-24 text-center">
      <!-- Terminal window with typewriter effect -->
      <div class="mx-auto max-w-2xl mb-12">
        <div class="bg-card border border-border rounded-lg overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
            <div class="w-3 h-3 rounded-full bg-destructive" />
            <div class="w-3 h-3 rounded-full bg-chart-4" />
            <div class="w-3 h-3 rounded-full bg-chart-2" />
            <span class="ml-4 font-mono text-xs text-muted-foreground">bash</span>
          </div>
          <div class="p-6 text-left font-mono text-sm">
            <div
              v-for="(line, index) in displayedLines"
              :key="`line-${index}-${line}`"
              :class="line.startsWith('$') ? 'text-primary' : 'text-foreground'"
            >
              {{ line }}
              <span
                v-if="index === displayedLines.length - 1 && line === '$ _'"
                class="inline-block w-2 h-4 bg-primary ml-1 cursor-blink"
              />
            </div>
            <span
              v-if="displayedLines.length > 0 && displayedLines[displayedLines.length - 1] !== '$ _'"
              class="inline-block w-2 h-4 bg-primary cursor-blink"
            />
          </div>
        </div>
      </div>

      <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance">
        {{ t.hero.headline }}
        <span class="text-primary neon-text">{{ t.hero.headlineHighlight }}</span>
        {{ t.hero.headlineEnd }}
      </h1>

      <p class="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed text-pretty">
        {{ t.hero.subheadline }}
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <AppButton
          as="a"
          href="#projects"
          size="lg"
          class="font-mono bg-primary text-primary-foreground hover:bg-primary/90 neon-glow"
        >
          {{ t.hero.viewProjects }}
        </AppButton>
        <AppButton
          as="a"
          href="#about"
          size="lg"
          variant="outline"
          class="font-mono border-border hover:border-primary hover:text-primary"
        >
          {{ t.hero.downloadCv }}
        </AppButton>
      </div>

      <SocialLinks icon-class="h-6 w-6" class="justify-center" />
    </div>
  </section>
</template>
