<script setup>
defineProps({
  variant: { type: String, default: "default" },
});
</script>

<template>
  <div
    :class="[
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      {
        'border-transparent bg-primary text-primary-foreground': variant === 'default',
        'text-foreground': variant === 'outline',
      },
    ]"
  >
    <slot />
  </div>
</template>
