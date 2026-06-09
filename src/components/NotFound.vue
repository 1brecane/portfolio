<script setup>
import { computed } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import { Home } from 'lucide-vue-next';
import { useI18n } from '@/i18n';
import { useTypewriter } from '@/composables/useTypewriter';

const { t } = useI18n();
const lines = computed(() => [t.value.notFound.title]);
const { displayedLines } = useTypewriter(lines);
</script>

<template>
  <main class="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
    <!-- Grid Background -->
    <div class="absolute inset-0 grid-bg opacity-30"></div>
    
    <div class="relative z-10 max-w-2xl mx-auto px-6 text-center">
      
      <h1 class="text-5xl md:text-7xl font-mono font-bold text-foreground mb-6">
        <span class="text-primary">></span> {{ displayedLines[0] ?? '' }}<span class="cursor-blink text-primary">_</span>
      </h1>
      
      <p class="text-xl text-muted-foreground mb-10 max-w-lg mx-auto">
        {{ t.notFound.description }}
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <AppButton as="a" href="/" class="w-full sm:w-auto">
          <Home class="w-4 h-4 mr-2" />
          {{ t.notFound.returnHome }}
        </AppButton>
      </div>
    </div>
  </main>
</template>
