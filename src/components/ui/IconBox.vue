<script setup>
defineProps({
  size: { type: String, default: "md" },
  // Tinted glass chip for the slotted icon. The icon's own color is set by the
  // consumer (e.g. `text-chart-2`) so it matches the accent chosen here.
  accent: { type: String, default: "primary" },
});

// Literal classes so Tailwind's scanner generates them.
const accentMap = {
  primary: "bg-primary/10 border-primary/25",
  cyan: "bg-chart-2/10 border-chart-2/25",
  purple: "bg-chart-3/15 border-chart-3/30",
  amber: "bg-chart-4/10 border-chart-4/25",
};
</script>

<template>
  <div
    :class="[
      'rounded-lg border',
      accentMap[accent] || accentMap.primary,
      size === 'lg' ? 'p-4' : 'p-2',
    ]"
  >
    <slot />
  </div>
</template>
