<script setup>
defineProps({ size: { type: String, default: "md" } });
</script>

<template>
  <div :class="['rounded-lg bg-primary/10 border border-primary/20', size === 'lg' ? 'p-4' : 'p-2']">
    <slot />
  </div>
</template>
