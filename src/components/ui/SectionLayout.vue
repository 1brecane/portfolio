<script setup>
import SectionHeader from "@/components/ui/SectionHeader.vue";

defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  gridBg: { type: Boolean, default: false },
});
</script>

<template>
  <section :id="id" :class="['relative py-24 md:py-32', { 'grid-bg': gridBg }]">
    <div class="relative mx-auto max-w-6xl px-6">
      <SectionHeader :title="title" :subtitle="subtitle" />
      <slot />
    </div>
  </section>
</template>
