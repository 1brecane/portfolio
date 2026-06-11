<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Film, AlignJustify } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import { useJourneyMode } from "@/composables/useJourneyMode";

// Lets the visitor swap the long cinematic scroll journey for a plain stacked
// "simple view" (and back) — choice persisted via useJourneyMode().
const { t } = useI18n();
const { mode, toggle } = useJourneyMode();

// The hover tooltip describes the *action*; the accessible name stays fixed
// ("Simple view") so aria-pressed reads as a stable on/off switch instead of a
// control whose name and state both flip at once.
const actionLabel = computed(() =>
  mode.value === "cinematic" ? t.value.journey.switchToSimple : t.value.journey.switchToCinematic,
);

// ── First-visit hint ─────────────────────────────────────────────────────────
// The toggle is an unlabeled 32px icon — exactly the visitors who find the
// cinematic scroll too long are the ones who'd never discover it. Show a small
// one-time callout under it; never again once dismissed, after it times out, or
// if the user has ever used the toggle (a stored journey-mode choice).
const HINT_SEEN_KEY = "journey-hint-seen";
const showHint = ref(false);
let showTimer;
let hideTimer;

function markHintSeen() {
  showHint.value = false;
  clearTimeout(hideTimer);
  try {
    localStorage.setItem(HINT_SEEN_KEY, "1");
  } catch {
    /* private mode etc. — it'll just show again next visit */
  }
}

function onToggle() {
  if (showHint.value) markHintSeen();
  toggle();
}

onMounted(() => {
  let seen = true;
  try {
    seen = !!localStorage.getItem(HINT_SEEN_KEY) || !!localStorage.getItem("journey-mode");
  } catch {
    /* can't persist the dismissal either — don't nag */
  }
  if (seen || mode.value !== "cinematic") return;
  showTimer = setTimeout(() => {
    showHint.value = true;
    hideTimer = setTimeout(markHintSeen, 12000);
  }, 2500);
});

onBeforeUnmount(() => {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
});
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tactile-press"
      :aria-label="t.journey.simpleView"
      :aria-pressed="mode === 'flat'"
      :title="actionLabel"
      @click="onToggle"
    >
      <Film v-if="mode === 'cinematic'" class="h-4 w-4" />
      <AlignJustify v-else class="h-4 w-4" />
    </button>

    <Transition name="journey-hint">
      <div v-if="showHint" role="status" class="journey-hint glass-panel rounded-md">
        <p class="text-foreground/90 leading-relaxed">{{ t.journey.hint }}</p>
        <button type="button" class="journey-hint__dismiss" @click="markHintSeen">
          {{ t.journey.hintDismiss }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.journey-hint {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: -0.25rem;
  z-index: 60;
  width: 14rem;
  padding: 0.75rem;
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.7rem;
  box-shadow: 0 8px 30px oklch(0.05 0 0 / 0.5);
}

/* caret pointing up at the toggle */
.journey-hint::before {
  content: "";
  position: absolute;
  top: -5px;
  right: 0.85rem;
  width: 10px;
  height: 10px;
  transform: rotate(45deg);
  background: oklch(0.16 0.006 250);
  border-top: 1px solid oklch(0.5 0.01 250 / 0.32);
  border-left: 1px solid oklch(0.5 0.01 250 / 0.32);
}

.journey-hint__dismiss {
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: opacity 200ms ease;
}

.journey-hint__dismiss:hover {
  opacity: 0.8;
}

.journey-hint-enter-active,
.journey-hint-leave-active {
  transition:
    opacity 250ms ease,
    transform 250ms ease;
}

.journey-hint-enter-from,
.journey-hint-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
