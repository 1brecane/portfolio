<script setup>
import { useI18n } from "@/i18n";

const { locale, setLocale, t } = useI18n();

const options = [
  { id: "it", label: "IT" },
  { id: "en", label: "EN" },
];
</script>

<template>
  <div
    class="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 font-mono text-xs"
    role="group"
    :aria-label="t.a11y.changeLanguage"
  >
    <button
      v-for="opt in options"
      :key="opt.id"
      type="button"
      :class="[
        'min-w-[2.25rem] px-2.5 py-1.5 rounded-sm uppercase tracking-wide transition-all duration-200',
        locale === opt.id
          ? 'bg-primary text-primary-foreground neon-glow shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
      ]"
      :aria-pressed="locale === opt.id"
      @click="setLocale(opt.id)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
