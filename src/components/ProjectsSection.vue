<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { BookOpen, ExternalLink, Github } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import { useI18n } from "@/i18n";
import { SOCIAL_LINKS } from "@/constants/socialLinks";
import { projectDefs } from "@/data/projects";
import { caseStudySlugForProject } from "@/data/caseStudies";

const { t } = useI18n();

const projects = computed(() =>
  projectDefs.map((def, i) => ({
    ...def,
    title: t.value.projects.items[i].title,
    description: t.value.projects.items[i].description,
    typeLabel: t.value.projects.types[def.type],
    caseStudy: caseStudySlugForProject(def.id),
  }))
);
</script>

<template>
  <SectionLayout
    id="projects"
    :title="t.projects.title"
    :subtitle="t.projects.subtitle"
    grid-bg
    bleed-gutter
  >
    <template #default>
      <!-- §1 "corner-cut diamond" (planets3d-layout-rework.md): same 2x2 grid,
           but each card's INNER corner (the one facing the grid center) is
           clip-path-beveled, so the four bevels together form one coherent
           diamond opening at the center where the `projects` world (crescent,
           AsciiPlanets.vue WORLDS) sits — unobstructed by any card's hit
           region (clip-path clips hit-testing too, not just paint). The gap
           is equalized (md:gap-12) so the opening is a true diamond, not a
           rhombus. Below md there's a single column — no cut, no pinwheel,
           the planet stays in its static mobile framing behind the stacked
           cards, so the gap doesn't just add dead vertical space there.
           `pointer-events-none` here (opted back to `auto` per-card): the
           grid container's own box spans the gap too — with the default
           `auto` it swallows clicks meant for the crescent hotspot in that
           gap even though no card actually renders there. -->
      <div class="projects-grid grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-24 pointer-events-none">
        <article
          v-for="(project, i) in projects"
          :key="project.id"
          class="present-step group relative glass-panel rounded-lg overflow-hidden card-glow pointer-events-auto"
          :style="{ '--step': i, '--card-accent': project.accent }"
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

            <!-- Same chip component as the About timeline skills, for consistency. -->
            <div class="flex flex-wrap gap-2 mb-6">
              <AppBadge
                v-for="tag in project.tags"
                :key="tag"
                variant="outline"
                class="text-xs font-mono"
              >
                {{ tag }}
              </AppBadge>
            </div>

            <div class="flex flex-wrap items-center gap-4 md:gap-3">
              <RouterLink
                v-if="project.caseStudy"
                v-slot="{ href, navigate }"
                :to="`/projects/${project.caseStudy}`"
                custom
              >
                <AppButton
                  as="a"
                  variant="accent"
                  size="sm"
                  class="font-mono text-xs gap-2 max-md:min-h-11"
                  :href="href"
                  @click="navigate"
                >
                  <BookOpen class="h-4 w-4" />
                  {{ t.projects.caseStudy }}
                </AppButton>
              </RouterLink>
              <AppButton
                as="a"
                variant="outline"
                size="sm"
                class="font-mono text-xs gap-2 max-md:min-h-11 border-border hover:border-[var(--card-accent)] hover:text-[var(--card-accent)]"
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
                class="font-mono text-xs gap-2 max-md:min-h-11 border-border hover:border-[var(--card-accent)] hover:text-[var(--card-accent)]"
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
                variant="accent"
                size="sm"
                class="font-mono text-xs gap-2 max-md:min-h-11"
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

      <div class="present-step text-center mt-12 pointer-events-auto" :style="{ '--step': 4 }">
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

<style scoped>
/* §1.3 corner-cut diamond — md+ only (§1.5: below md the cards stay full
   rounded rects, a diagonal slice on a full-width stacked card would look
   broken). --cut is a single bevel size used on both axes so the cut stays a
   true 45° regardless of card aspect ratio (rem is absolute). Each card's
   INNER corner (facing the grid center) is beveled — see the table in
   planets3d-layout-rework.md §1.2. clip-path also clips hit-testing, so this
   removes the corner rectangle from each card's pointer-events-auto area,
   which is what used to overlap the crescent's centered hotspot. */
@media (min-width: 768px) {
  .projects-grid > article {
    --cut: 4.5rem; /* TUNABLE — tuned against a real screenshot at md/lg/xl */
  }
  /* i=0 top-left → cut bottom-right */
  .projects-grid > article:nth-child(1) {
    clip-path: polygon(
      0 0,
      100% 0,
      100% calc(100% - var(--cut)),
      calc(100% - var(--cut)) 100%,
      0 100%
    );
  }
  /* i=1 top-right → cut bottom-left */
  .projects-grid > article:nth-child(2) {
    clip-path: polygon(
      0 0,
      100% 0,
      100% 100%,
      var(--cut) 100%,
      0 calc(100% - var(--cut))
    );
  }
  /* i=2 bottom-left → cut top-right */
  .projects-grid > article:nth-child(3) {
    clip-path: polygon(
      0 0,
      calc(100% - var(--cut)) 0,
      100% var(--cut),
      100% 100%,
      0 100%
    );
  }
  /* i=3 bottom-right → cut top-left */
  .projects-grid > article:nth-child(4) {
    clip-path: polygon(var(--cut) 0, 100% 0, 100% 100%, 0 100%, 0 var(--cut));
  }
}
</style>
