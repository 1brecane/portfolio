<script setup>
import { computed } from "vue";
import { useI18n } from "@/i18n";

// Minimal fixed progress indicator for the scroll journey — one dot per zone,
// the active one lit with its label. Purely an orientation cue (non-interactive,
// aria-hidden); driven by `activeIndex` from useGalaxyJourney().
const props = defineProps({
  activeIndex: { type: Number, default: 0 },
});

const { t } = useI18n();

// Same order as ZONES in useGalaxyJourney.js; labels reuse the nav strings.
const zones = computed(() => [
  { id: "hero", label: t.value.nav.home },
  { id: "about", label: t.value.nav.about },
  { id: "stack", label: t.value.nav.stack },
  { id: "projects", label: t.value.nav.projects },
  { id: "homelab", label: t.value.nav.homelab },
  { id: "contact", label: t.value.nav.contact },
]);

const progress = computed(() => {
  const last = zones.value.length - 1;
  return last > 0 ? props.activeIndex / last : 0;
});
</script>

<template>
  <div class="journey-rail" aria-hidden="true">
    <div class="journey-rail__track">
      <div class="journey-rail__fill" :style="{ height: `${progress * 100}%` }" />
    </div>
    <ul class="journey-rail__list">
      <li
        v-for="(zone, i) in zones"
        :key="zone.id"
        class="journey-rail__item"
        :class="{ 'is-active': i === activeIndex }"
      >
        <span class="journey-rail__label">{{ zone.label }}</span>
        <span class="journey-rail__dot" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.journey-rail {
  position: fixed;
  top: 50%;
  right: 1.5rem;
  transform: translateY(-50%);
  z-index: 40;
  pointer-events: none;
  display: flex;
  align-items: center;
}

/* faint vertical rail with a primary fill that tracks journey progress */
.journey-rail__track {
  position: absolute;
  right: 3px;
  top: 6px;
  bottom: 6px;
  width: 1px;
  background: color-mix(in oklch, var(--foreground) 14%, transparent);
  overflow: hidden;
}

.journey-rail__fill {
  width: 100%;
  background: var(--primary);
  transition: height 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.journey-rail__list {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.journey-rail__item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}

.journey-rail__label {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: lowercase;
  color: var(--primary);
  opacity: 0;
  transform: translateX(0.4rem);
  transition:
    opacity 280ms ease,
    transform 280ms ease;
  text-shadow: 0 1px 8px oklch(0.08 0 0 / 0.7);
}

.journey-rail__dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--foreground) 32%, transparent);
  transition:
    background 280ms ease,
    box-shadow 280ms ease,
    transform 280ms ease;
}

.journey-rail__item.is-active .journey-rail__label {
  opacity: 1;
  transform: translateX(0);
}

.journey-rail__item.is-active .journey-rail__dot {
  background: var(--primary);
  transform: scale(1.5);
  box-shadow: 0 0 10px var(--neon-glow);
}

/* Tall pinned rails don't belong on small screens. */
@media (max-width: 767px) {
  .journey-rail {
    display: none;
  }
}
</style>
