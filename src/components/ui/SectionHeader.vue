<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  isVisible: { type: Boolean, default: false },
});
</script>

<template>
  <div :class="['scroll-reveal text-center mb-16', { revealed: isVisible }]">
    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
      {{ title }}
    </h2>
    <p class="text-muted-foreground max-w-xl mx-auto leading-relaxed">
      {{ subtitle }}
    </p>
  </div>
</template>
