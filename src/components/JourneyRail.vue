<script setup>
import { computed } from "vue";
import { useI18n } from "@/i18n";
import { useJourneyMode } from "@/composables/useJourneyMode";
import { scrollToZone } from "@/composables/useJourneyScroll";

// Fixed chapter indicator for the scroll journey — one dot per zone, the active
// one lit with its label, driven by `activeIndex` from useGalaxyJourney(). Each
// dot is a real button that flies the camera to that section. Hidden in "flat"
// (simple) view and on small screens.
const props = defineProps({
  activeIndex: { type: Number, default: 0 },
});

const { t } = useI18n();
const { mode } = useJourneyMode();

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
  <nav v-if="mode !== 'flat'" class="journey-rail" :aria-label="t.journey.navAria">
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
        <button
          type="button"
          class="journey-rail__btn"
          :aria-current="i === activeIndex ? 'true' : undefined"
          :title="zone.label"
          @click="scrollToZone(zone.id)"
        >
          <span class="journey-rail__label">{{ zone.label }}</span>
          <span class="journey-rail__num" aria-hidden="true">{{
            String(i + 1).padStart(2, "0")
          }}</span>
          <span class="journey-rail__dotwrap">
            <span class="journey-rail__dot" />
            <span
              v-if="i === activeIndex"
              :key="activeIndex"
              class="journey-rail__ping"
              aria-hidden="true"
            />
          </span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.journey-rail {
  position: fixed;
  top: 50%;
  right: 1.5rem;
  transform: translateY(-50%);
  z-index: 40;
  /* the rail surface is inert; only the dot buttons take pointer events */
  pointer-events: none;
  display: flex;
  align-items: center;
}

/* faint vertical rail with a primary fill that tracks journey progress */
.journey-rail__track {
  position: absolute;
  /* Center the 1px track on the dots. A dot sits at the button's right edge minus
     its 0.15rem right padding; dot center = 0.15rem + half the 6px dot. Centering
     a 1px track there → right = 0.15rem + 3px - 0.5px. (Plain right:3px sat ~2px
     too far right, since it ignored the button's right padding.) */
  right: calc(0.15rem + 2.5px);
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
}

.journey-rail__btn {
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  /* generous hit area without visual weight */
  padding: 0.3rem 0.15rem 0.3rem 0.75rem;
  margin: -0.3rem 0;
  background: none;
  border: 0;
}

.journey-rail__btn:focus-visible {
  outline: none;
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

/* always-visible chapter number — a quiet column next to the dots */
.journey-rail__num {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  color: color-mix(in oklch, var(--foreground) 38%, transparent);
  transition: color 280ms ease;
  text-shadow: 0 1px 8px oklch(0.08 0 0 / 0.7);
}

.journey-rail__item.is-active .journey-rail__num {
  color: var(--primary);
}

/* unscaled anchor for the arrival ping — the dot inside scales on hover/active,
   and a ping nested in it would compound that transform with its own keyframes */
.journey-rail__dotwrap {
  position: relative;
  display: inline-flex;
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

/* reveal the label on hover/focus so the rail is also a quick-jump menu */
.journey-rail__btn:hover .journey-rail__label,
.journey-rail__btn:focus-visible .journey-rail__label {
  opacity: 1;
  transform: translateX(0);
}

.journey-rail__btn:hover .journey-rail__dot,
.journey-rail__btn:focus-visible .journey-rail__dot {
  background: var(--primary);
  transform: scale(1.35);
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

/* one-shot radar ping when the camera arrives at a chapter */
.journey-rail__ping {
  position: absolute;
  inset: -5px;
  border-radius: 9999px;
  border: 1px solid var(--primary);
  opacity: 0;
  animation: rail-ping 900ms ease-out 1;
  pointer-events: none;
}

@keyframes rail-ping {
  0% {
    transform: scale(0.5);
    opacity: 0.9;
  }
  100% {
    transform: scale(2.1);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .journey-rail__ping {
    display: none;
  }
}

/* Tall pinned rails don't belong on small screens. */
@media (max-width: 767px) {
  .journey-rail {
    display: none;
  }
}
</style>
