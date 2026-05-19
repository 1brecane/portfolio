<script setup>
import { useScrollReveal } from "@/composables/useScrollReveal";
import SectionHeader from "@/components/ui/SectionHeader.vue";

defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  gridBg: { type: Boolean, default: false },
});

const { isVisible } = useScrollReveal("sectionRef");
</script>

<template>
  <section :id="id" ref="sectionRef" :class="['relative py-24 md:py-32', { 'grid-bg': gridBg }]">
    <div class="relative mx-auto max-w-6xl px-6">
      <SectionHeader
        :title="title"
        :subtitle="subtitle"
        :is-visible="isVisible"
      />

      <slot :is-visible="isVisible" />
    </div>
  </section>
</template>
