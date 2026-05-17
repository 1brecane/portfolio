<script setup>
import { computed } from "vue";
import { GraduationCap, Briefcase, Calendar } from "lucide-vue-next";
import AppBadge from "@/components/ui/AppBadge.vue";
import IconBox from "@/components/ui/IconBox.vue";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import { useI18n } from "@/i18n";

const { t } = useI18n();

const timelineDefs = [
  {
    id: "work-infogest",
    type: "work",
    icon: Briefcase,
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

const dotColor = {
  work: "border-chart-2",
  education: "border-primary",
};

const timeline = computed(() =>
  timelineDefs.map((entry) => ({
    ...entry,
    ...t.value.about.timeline[entry.id],
    dot: dotColor[entry.type],
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
    <template #default="{ isVisible }">
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
                <IconBox>
                  <component :is="entry.icon" class="h-5 w-5 text-primary" />
                </IconBox>
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
    </template>
  </SectionLayout>
</template>
