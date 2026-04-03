<script setup>
import { computed } from "vue";
import { ExternalLink, Github, Gamepad2, Layers, FlaskConical, Code } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import { useI18n } from "@/i18n";

const { t } = useI18n();

const projectDefs = [
  {
    id: 1,
    icon: Gamepad2,
    tags: ["Python", "CLI", "Game Dev"],
    github: "https://github.com/1brecane/cattenheimer",
    demo: null,
    type: "gaming",
    accentColor: "from-chart-4 to-chart-5",
  },
  {
    id: 2,
    icon: Layers,
    tags: ["Fastify", "React", "MySQL", "Docker"],
    github: "https://github.com/1brecane/centro-sportivo-be",
    demo: null,
    type: "fullstack",
    accentColor: "from-chart-2 to-primary",
  },
  {
    id: 3,
    icon: FlaskConical,
    tags: ["Node.js", "Redis", "RabbitMQ", "gRPC"],
    github: "https://github.com/1brecane/paidia_be",
    demo: null,
    type: "lab",
    accentColor: "from-chart-3 to-chart-5",
  },
  {
    id: 4,
    icon: Code,
    tags: ["Vue.js", "Tailwind", "JavaScript"],
    github: "https://github.com/1brecane/portfolio",
    demo: null,
    type: "frontend",
    accentColor: "from-primary to-chart-2",
  },
];

const typeStyles = {
  gaming: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  fullstack: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  lab: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  frontend: "bg-primary/20 text-primary border-primary/30",
};

/** Merges static project definitions with i18n-resolved titles/descriptions */
const projects = computed(() =>
  projectDefs.map((def, i) => ({
    ...def,
    title: t.value.projects.items[i].title,
    description: t.value.projects.items[i].description,
    typeLabel: t.value.projects.types[def.type],
    typeClass: typeStyles[def.type],
  }))
);
</script>

<template>
  <SectionLayout
    id="projects"
    :title="t.projects.title"
    :subtitle="t.projects.subtitle"
    grid-bg
  >
    <template #default="{ isVisible }">
      <div :class="['grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children', { revealed: isVisible }]">
        <article
          v-for="project in projects"
          :key="project.id"
          class="group relative bg-card border border-border rounded-lg overflow-hidden card-glow"
        >
          <div :class="`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${project.accentColor}`" />

          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-muted border border-border">
                  <component :is="project.icon" class="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 class="font-semibold text-lg">{{ project.title }}</h3>
                  <AppBadge
                    variant="outline"
                    :class="`mt-1 text-xs ${project.typeClass}`"
                  >
                    {{ project.typeLabel }}
                  </AppBadge>
                </div>
              </div>
            </div>

            <p class="text-muted-foreground text-sm leading-relaxed mb-4">
              {{ project.description }}
            </p>

            <div class="flex flex-wrap gap-2 mb-6">
              <span
                v-for="tag in project.tags"
                :key="tag"
                class="px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-muted-foreground"
              >
                {{ tag }}
              </span>
            </div>

            <div class="flex items-center gap-3">
              <AppButton
                as="a"
                variant="outline"
                size="sm"
                class="font-mono text-xs gap-2 border-border hover:border-primary hover:text-primary"
                :href="project.github"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github class="h-4 w-4" />
                {{ t.projects.source }}
              </AppButton>
              <AppButton
                v-if="project.demo"
                as="a"
                size="sm"
                class="font-mono text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                :href="project.demo"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink class="h-4 w-4" />
                {{ t.projects.liveDemo }}
              </AppButton>
            </div>
          </div>
        </article>
      </div>

      <div :class="['scroll-reveal text-center mt-12', { revealed: isVisible }]" style="transition-delay: 400ms">
        <AppButton
          as="a"
          variant="outline"
          size="lg"
          class="font-mono border-border hover:border-primary hover:text-primary gap-2"
          href="https://github.com/1brecane"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github class="h-5 w-5" />
          {{ t.projects.viewAll }}
        </AppButton>
      </div>
    </template>
  </SectionLayout>
</template>
