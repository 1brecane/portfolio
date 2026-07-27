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
      <!-- §1 "radial cutout" (2026-07-27 redesign, replaces the corner-cut
           diamond): same 2x2 grid, but each card's INNER corner (the one
           facing the grid center) gets a CONCAVE CIRCULAR bite via a
           mask-image radial-gradient hard-stop, not a clip-path polygon
           bevel — clip-path can only draw straight segments (verified,
           see git history), a real arc needs mask. The four quarter-circle
           bites, each centered on the shared grid-center point (offset from
           each card's own corner by half the gap on each axis — see the
           per-card --mx/--my below), combine into ONE seamless circular
           void at the center where the `projects` world (crescent,
           AsciiPlanets.vue WORLDS) sits. Cards are also bigger (p-8, was
           p-6) and pushed further apart (gap-32, was gap-24) so there's
           real room for a generously-sized circle, not a cramped notch.
           mask-image excludes the masked-out region from hit-testing too
           (same property clip-path had), so the circular opening stays
           unobstructed by any card's hit region. Below md there's a single
           column — no cut, the planet stays in its static mobile framing
           behind the stacked cards. `pointer-events-none` here (opted back
           to `auto` per-card): the grid container's own box spans the gap
           too — with the default `auto` it swallows clicks meant for the
           crescent hotspot in that gap even though no card actually
           renders there. -->
      <div class="projects-grid grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-32 pointer-events-none">
        <article
          v-for="(project, i) in projects"
          :key="project.id"
          class="present-step group relative glass-panel rounded-lg overflow-hidden card-glow pointer-events-auto"
          :style="{ '--step': i, '--card-accent': project.accent }"
        >
          <!-- coloured accent bar -->
          <div :class="`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${project.accentColor}`" />

          <div class="p-8">
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
/* Radial cutout — md+ only (below md the cards stay full rounded rects, a
   circular bite out of a full-width stacked card would look broken).
   --r is the cutout circle's radius; --gx/--gy are HALF the grid's
   column/row gap (md:gap-32 = 8rem, so half = 4rem) — the distance from
   each card's own inner corner out to the shared grid-center point along
   each axis. TUNABLE together: bigger --r reads as a bigger "porthole",
   but must stay under --gx/--gy + (roughly) half a card's own width/height
   or the circle starts eating into a NEIGHBOURING card's corner instead of
   just the gap.

   mask-image radial-gradient hard-stop technique (concave/inverted-corner
   corner cut — CSS has no boolean "subtract a circle from a box" any other
   way): `transparent <r>, black <r>` with the SAME length on both stops is
   a hard edge, not a blur — everything inside radius r from the gradient's
   center point is fully masked out (invisible AND excluded from hit-
   testing, same as clip-path), everything outside is fully opaque. Center
   the gradient at each card's OWN inner corner, offset outward by
   (--gx, --gy) so the true center of the circle sits at the shared
   grid-center point, not at the card's corner — that's what makes the four
   independent per-card bites line up into one seamless circle instead of
   four separate notches. */
@media (min-width: 768px) {
  .projects-grid > article {
    --r: 9rem; /* TUNABLE — tuned against a real screenshot at md/lg/xl */
    --gx: 4rem; /* half of md:gap-32's column gap */
    --gy: 4rem; /* half of md:gap-32's row gap */
  }
  /* i=0 top-left → bite out of bottom-right (center is right+down of the card) */
  .projects-grid > article:nth-child(1) {
    -webkit-mask-image: radial-gradient(
      circle at calc(100% + var(--gx)) calc(100% + var(--gy)),
      transparent var(--r),
      black var(--r)
    );
    mask-image: radial-gradient(
      circle at calc(100% + var(--gx)) calc(100% + var(--gy)),
      transparent var(--r),
      black var(--r)
    );
  }
  /* i=1 top-right → bite out of bottom-left (center is left+down of the card) */
  .projects-grid > article:nth-child(2) {
    -webkit-mask-image: radial-gradient(
      circle at calc(0% - var(--gx)) calc(100% + var(--gy)),
      transparent var(--r),
      black var(--r)
    );
    mask-image: radial-gradient(
      circle at calc(0% - var(--gx)) calc(100% + var(--gy)),
      transparent var(--r),
      black var(--r)
    );
  }
  /* i=2 bottom-left → bite out of top-right (center is right+up of the card) */
  .projects-grid > article:nth-child(3) {
    -webkit-mask-image: radial-gradient(
      circle at calc(100% + var(--gx)) calc(0% - var(--gy)),
      transparent var(--r),
      black var(--r)
    );
    mask-image: radial-gradient(
      circle at calc(100% + var(--gx)) calc(0% - var(--gy)),
      transparent var(--r),
      black var(--r)
    );
  }
  /* i=3 bottom-right → bite out of top-left (center is left+up of the card) */
  .projects-grid > article:nth-child(4) {
    -webkit-mask-image: radial-gradient(
      circle at calc(0% - var(--gx)) calc(0% - var(--gy)),
      transparent var(--r),
      black var(--r)
    );
    mask-image: radial-gradient(
      circle at calc(0% - var(--gx)) calc(0% - var(--gy)),
      transparent var(--r),
      black var(--r)
    );
  }
}
</style>
