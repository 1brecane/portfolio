<script setup>
import { computed } from "vue";
import { Film, AlignJustify } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import { useJourneyMode } from "@/composables/useJourneyMode";

// Lets the visitor swap the long cinematic scroll journey for a plain stacked
// "simple view" (and back) — choice persisted via useJourneyMode().
const { t } = useI18n();
const { mode, toggle } = useJourneyMode();

const label = computed(() =>
  mode.value === "cinematic" ? t.value.journey.switchToSimple : t.value.journey.switchToCinematic,
);
</script>

<template>
  <button
    type="button"
    class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    :aria-label="label"
    :aria-pressed="mode === 'cinematic'"
    :title="label"
    @click="toggle"
  >
    <Film v-if="mode === 'cinematic'" class="h-4 w-4" />
    <AlignJustify v-else class="h-4 w-4" />
  </button>
</template>
