<script setup>
import { computed } from "vue";
import { GraduationCap, Briefcase, Calendar } from "lucide-vue-next";
import AppBadge from "@/components/ui/AppBadge.vue";
import IconBox from "@/components/ui/IconBox.vue";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import { useI18n } from "@/i18n";
import { vTilt } from "@/directives/tilt";

const { t } = useI18n();

const timelineDefs = [
  {
    id: "work-infogest",
    type: "work",
    icon: Briefcase,
    current: true, // the present role — gets the lit "now" treatment
    skills: ["JavaScript", "Node.js", "MongoDB", "RabbitMQ", "C#", "DevOps"],
  },
  {
    id: "edu-its",
    type: "education",
    icon: GraduationCap,
    skills: ["HTML5", "JavaScript", "CSS", "MongoDB", "MySQL", "React", "Node.js", "Python", "C#"],
  },
  {
    id: "edu-itet",
    type: "education",
    icon: GraduationCap,
    skills: ["Economia Aziendale", "C++", "HTML5", "CSS", "PHP", "Visual Basic"],
  },
];

// Work = galaxy cyan, education = neon red — matches the timeline dots and the
// cyan→red gradient of the "drawing" connector line.
const typeStyle = {
  work: { dot: "border-chart-2", accent: "cyan", iconClass: "text-chart-2" },
  education: { dot: "border-primary", accent: "primary", iconClass: "text-primary" },
};

const timeline = computed(() =>
  timelineDefs.map((entry) => ({
    ...entry,
    ...t.value.about.timeline[entry.id],
    ...typeStyle[entry.type],
  }))
);
</script>

<template>
  <SectionLayout
    id="about"
    :title="t.about.title"
    :subtitle="t.about.subtitle"
    grid-bg
  >
    <template #default>
      <!-- Timeline — each entry is a staged journey reveal step. The connector is
           a faint rail with a cyan→red gradient "fill" that draws down as the
           slide reveals (--reveal, inherited from the present-track). -->
      <div class="timeline relative max-w-3xl mx-auto">
        <span class="timeline__line" aria-hidden="true" />
        <span class="timeline__fill" aria-hidden="true" />
        <div
          v-for="(entry, i) in timeline"
          :key="entry.id"
          class="present-step relative pl-8 pb-12 last:pb-0"
          :style="{ '--step': i }"
        >
          <div :class="['absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-card border-2 z-10', entry.dot]">
            <span v-if="entry.current" class="timeline__pulse" aria-hidden="true" />
          </div>

          <div v-tilt :class="['glass-panel rounded-lg p-6 card-glow', { 'is-current': entry.current }]">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <div class="flex items-center gap-3">
                <IconBox :accent="entry.accent">
                  <component :is="entry.icon" :class="['h-5 w-5', entry.iconClass]" />
                </IconBox>
                <div>
                  <h3 class="font-semibold text-lg flex items-center gap-2">
                    {{ entry.title }}
                    <span v-if="entry.current" class="timeline__now font-mono text-[0.6rem] uppercase tracking-wider text-chart-2">
                      ● now
                    </span>
                  </h3>
                  <p class="text-sm text-muted-foreground">{{ entry.place }}</p>
                </div>
              </div>
              <div class="sm:ml-auto flex items-center gap-2 text-muted-foreground">
                <Calendar class="h-4 w-4" />
                <span class="font-mono text-xs">{{ entry.period }}</span>
              </div>
            </div>

            <p class="text-muted-foreground text-sm leading-relaxed mb-4">
              {{ entry.description }}
            </p>

            <div class="flex flex-wrap gap-2">
              <AppBadge
                v-for="skill in entry.skills"
                :key="skill"
                variant="outline"
                class="text-xs font-mono"
              >
                {{ skill }}
              </AppBadge>
            </div>
          </div>
        </div>
      </div>
    </template>
  </SectionLayout>
</template>

<style scoped>
/* Connector rail + its drawing fill. Both sit on the left edge where the dots are. */
.timeline__line,
.timeline__fill {
  position: absolute;
  left: 0;
  top: 0.25rem;
  bottom: 0.25rem;
  width: 2px;
  border-radius: 2px;
}

/* faint base rail (the "uncharged" track). Fades IN with the reveal and OUT with
   the exit — like the rest of the slide — so it isn't already drawn on arrival and
   doesn't linger after you scroll past. */
.timeline__line {
  background: color-mix(in oklch, var(--foreground) 16%, transparent);
  opacity: calc(var(--reveal, 1) * var(--exit, 1));
}

/* the charge: scales from the top as the slide reveals (now → past), and fades out
   with the slide on exit. */
.timeline__fill {
  background: linear-gradient(to bottom, var(--chart-2), var(--primary));
  box-shadow: 0 0 8px oklch(0.72 0.14 200 / 0.35);
  transform-origin: top;
  transform: scaleY(var(--reveal, 1));
  opacity: var(--exit, 1);
  transition: transform 120ms linear, opacity 120ms linear;
}

/* lit ring pinging out from the current-role dot */
.timeline__pulse {
  position: absolute;
  inset: -3px;
  border-radius: 9999px;
  background: var(--chart-2);
  opacity: 0.4;
  animation: timeline-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes timeline-ping {
  0% { transform: scale(1); opacity: 0.5; }
  70%, 100% { transform: scale(2.6); opacity: 0; }
}

/* current-role card: a subtle cyan rim so "now" reads at a glance */
.is-current {
  border-color: oklch(0.72 0.14 200 / 0.45) !important;
}

.timeline__now {
  text-shadow: 0 0 8px oklch(0.72 0.14 200 / 0.6);
}

/* Fallbacks: when the journey is flattened (small / reduced-motion / flat view)
   the track isn't pinned, so --present pins to 1 → --exit is 0. Force the rail
   fully visible there, matching how `.present-step` is forced visible. */
@media (max-width: 767px), (prefers-reduced-motion: reduce) {
  .timeline__line,
  .timeline__fill { opacity: 1; }
}
[data-journey-mode="flat"] .timeline__line,
[data-journey-mode="flat"] .timeline__fill { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .timeline__pulse { animation: none; }
  .timeline__fill { transition: none; }
}
</style>
