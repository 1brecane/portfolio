<script setup>
import { computed } from "vue";
import { GraduationCap, Briefcase, Calendar } from "lucide-vue-next";
import SectionHeader from "@/components/ui/SectionHeader.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import { useI18n } from "@/i18n";
import { useScrollReveal } from "@/composables/useScrollReveal";

const { t } = useI18n();
const { target: sectionRef, isVisible } = useScrollReveal();

const timelineDefs = [
  {
    id: "work-infogest",
    type: "work",
    icon: Briefcase,
    period: "ago 2025 - presente",
    skills: ["JavaScript", "Node.js", "MongoDB", "React", "C#", "DevOps"],
  },
  {
    id: "edu-its",
    type: "education",
    icon: GraduationCap,
    period: "ott 2024 - lug 2026",
    skills: ["HTML5", "JavaScript", "CSS", "MongoDB", "MySQL", "React", "Node.js", "Python", "C#"],
  },
  {
    id: "edu-itet",
    type: "education",
    icon: GraduationCap,
    period: "2019 - 2024",
    skills: ["Economia Aziendale", "C++", "HTML5", "CSS", "PHP", "Visual Basic"],
  },
];

const dotColor = {
  work: "border-chart-2",
  education: "border-primary",
};

/** Merges static timeline definitions with i18n-resolved labels */
const timeline = computed(() =>
  timelineDefs.map((entry) => ({
    ...entry,
    title: t.value.about.timeline[entry.id].title,
    place: t.value.about.timeline[entry.id].place,
    description: t.value.about.timeline[entry.id].description,
    dot: dotColor[entry.type],
  }))
);
</script>

<template>
  <section id="about" ref="sectionRef" class="relative py-24 md:py-32 grid-bg">
    <div class="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />

    <div class="relative mx-auto max-w-6xl px-6">
      <SectionHeader
        :title="t.about.title"
        :subtitle="t.about.subtitle"
        :is-visible="isVisible"
      />

      <!-- Timeline -->
      <div :class="['relative max-w-3xl mx-auto stagger-children', { revealed: isVisible }]">
        <div
          v-for="entry in timeline"
          :key="entry.id"
          class="relative pl-8 pb-12 last:pb-0 border-l-2 border-border"
        >
          <div :class="['absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-card border-2', entry.dot]" />

          <div class="bg-card border border-border rounded-lg p-6 card-glow">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <component :is="entry.icon" class="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 class="font-semibold text-lg">{{ entry.title }}</h3>
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
    </div>
  </section>
</template>
