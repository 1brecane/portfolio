<script setup>
import { computed } from "vue";
import { ExternalLink, Github } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import { useI18n } from "@/i18n";
import { SOCIAL_LINKS } from "@/constants/socialLinks";

const { t } = useI18n();

// ── tech logos ────────────────────────────────────────────────────────────────
const logos = {
  python:     `<img src="/python.png"     width="22" height="22" alt="Python"     style="object-fit:contain" />`,
  nestjs:     `<img src="/nestjs.png"     width="22" height="22" alt="NestJS"     style="object-fit:contain" />`,
  vue:        `<img src="/vue.png"        width="22" height="22" alt="Vue.js"     style="object-fit:contain" />`,
  javascript: `<img src="/javascript.png" width="22" height="22" alt="JavaScript" style="object-fit:contain" />`,
  react:      `<img src="/react.png"      width="22" height="22" alt="React"      style="object-fit:contain" />`,
};

const projectDefs = [
  {
    id: 1,
    logoHtml: logos.python,
    tags: ["Python", "pygame", "Game Dev"],
    github: "https://github.com/1brecane/cattenheimer",
    demo: null,
    type: "gaming",
    accentColor: "from-[#3776AB] to-[#FFD43B]",
    badgeClass: "bg-[#3776AB]/20 text-[#3776AB] border-[#3776AB]/30",
  },
  {
    id: 4,
    logoHtml: logos.vue,
    tags: ["Vue.js", "Tailwind", "JavaScript", "Claude Code", "Cursor"],
    github: "https://github.com/1brecane/portfolio",
    demo: null,
    type: "frontend",
    accentColor: "from-[#41b883] to-[#35495e]",
    badgeClass: "bg-[#41b883]/20 text-[#41b883] border-[#41b883]/30",
  },
  {
    id: 3,
    logoHtml: logos.nestjs,
    tags: ["NestJS", "Redis", "MySQL"],
    github: "https://github.com/1brecane/paidia_be",
    demo: null,
    type: "lab",
    accentColor: "from-[#E0234E] to-[#ea2845]",
    badgeClass: "bg-[#E0234E]/20 text-[#E0234E] border-[#E0234E]/30",
  },
  {
    id: 2,
    logoHtml: `<span class="flex items-center gap-1">${logos.javascript}${logos.react}</span>`,
    tags: ["Fastify", "React", "MySQL", "Docker"],
    github: "https://github.com/1brecane/centro-sportivo-be",
    githubFe: "https://github.com/1brecane/centro-sportivo-fe",
    demo: null,
    type: "fullstack",
    accentColor: "from-[#F7DF1E] to-[#61DAFB]",
    badgeClass: "bg-[#61DAFB]/20 text-[#61DAFB] border-[#61DAFB]/30",
  },
];

const projects = computed(() =>
  projectDefs.map((def, i) => ({
    ...def,
    title: t.value.projects.items[i].title,
    description: t.value.projects.items[i].description,
    typeLabel: t.value.projects.types[def.type],
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
          <!-- coloured accent bar -->
          <div :class="`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${project.accentColor}`" />

          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <!-- tech logo -->
                <div class="p-2 rounded-lg bg-muted border border-border flex items-center justify-center min-w-[40px] min-h-[40px]"
                     v-html="project.logoHtml" />
                <div>
                  <h3 class="font-semibold text-lg">{{ project.title }}</h3>
                  <AppBadge
                    variant="outline"
                    :class="`mt-1 text-xs ${project.badgeClass}`"
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

            <div class="flex flex-wrap items-center gap-3">
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
                {{ project.githubFe ? t.projects.sourceBe : t.projects.source }}
              </AppButton>
              <AppButton
                v-if="project.githubFe"
                as="a"
                variant="outline"
                size="sm"
                class="font-mono text-xs gap-2 border-border hover:border-primary hover:text-primary"
                :href="project.githubFe"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github class="h-4 w-4" />
                {{ t.projects.sourceFe }}
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
          :href="SOCIAL_LINKS.github"
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
