<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
});
</script>

<template>
  <!-- The header is a `present-step` (step 0) like the section's content, so the
       title reveals and RECEDES with the journey instead of doing its own vertical
       scroll-reveal drift. Driven by --reveal/--exit inherited from the track. -->
  <div
    class="section-header-legible present-step text-center mb-16"
    :style="{ '--step': 0 }"
  >
    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
      {{ title }}
    </h2>
    <p class="text-foreground/75 max-w-xl mx-auto leading-relaxed">
      {{ subtitle }}
    </p>
  </div>
</template>
