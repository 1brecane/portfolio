<script setup>
defineProps({
  variant: { type: String, default: "default" },
  size: { type: String, default: "default" },
  as: { type: String, default: undefined },
});
</script>

<template>
  <component
    :is="as === 'a' ? 'a' : 'button'"
    :class="[
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
      {
        'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
        'border border-input bg-background hover:bg-muted': variant === 'outline',
        'hover:bg-muted': variant === 'ghost',
      },
      {
        'h-10 px-4 py-2': size === 'default',
        'h-9 rounded-md px-3': size === 'sm',
        'h-11 rounded-md px-8': size === 'lg',
        'h-10 w-10': size === 'icon',
      },
    ]"
  >
    <slot />
  </component>
</template>
