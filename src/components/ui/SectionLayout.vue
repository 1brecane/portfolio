<script setup>
import SectionHeader from "@/components/ui/SectionHeader.vue";

defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  gridBg: { type: Boolean, default: false },
  // Opt-in only (default false = today's untouched behavior everywhere else):
  // this section's own box — even the "empty" width beside narrower content
  // like Contact's `max-w-2xl` form — sits above the fixed z-1 AsciiPlanets
  // layer and, with the CSS pointer-events default, would swallow clicks
  // meant for a planet hotspot drawn in that free space. ContactSection is
  // the only current caller with a planet living beside its content.
  bleedGutter: { type: Boolean, default: false },
});
</script>

<template>
  <section
    :id="id"
    :class="['relative py-24 md:py-32', { 'grid-bg': gridBg, 'pointer-events-none': bleedGutter }]"
  >
    <div class="relative mx-auto max-w-6xl px-6">
      <SectionHeader :title="title" :subtitle="subtitle" />
      <slot />
    </div>
  </section>
</template>
