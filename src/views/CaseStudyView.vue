<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { ArrowLeft, Github } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import LocaleToggle from "@/components/ui/LocaleToggle.vue";
import { useI18n } from "@/i18n";
import { caseStudies } from "@/data/caseStudies";
import { projectDefs } from "@/data/projects";
import { scrollToZone } from "@/composables/useJourneyScroll";

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const slug = computed(() => route.params.slug);
const cs = computed(() => caseStudies[slug.value]);
const defIndex = computed(() => projectDefs.findIndex((d) => d.id === cs.value?.projectId));
const def = computed(() => projectDefs[defIndex.value]);
// i18n items are aligned to projectDefs ORDER (see src/data/projects.js).
const meta = computed(() => t.value.projects.items[defIndex.value]);

// ── markdown loading ──────────────────────────────────────────────────────────
// Every case-study md is its own lazy chunk; only the opened one downloads.
const mdModules = import.meta.glob("../content/case-studies/*.md", {
  query: "?raw",
  import: "default",
});

const html = ref("");
const state = ref("loading"); // loading | ready | error

async function load() {
  // Capture the requested pair — if slug/locale change again before this
  // resolves, we're stale and must not clobber a newer load()'s result.
  const reqSlug = slug.value;
  const reqLocale = locale.value;
  state.value = "loading";
  const key = (lang) => `../content/case-studies/${reqSlug}.${lang}.md`;
  // Missing translation falls back to EN.
  const loader = mdModules[key(reqLocale)] || mdModules[key("en")];
  if (!loader) {
    state.value = "error";
    return;
  }
  try {
    const [{ marked }, raw] = await Promise.all([import("marked"), loader()]);
    if (reqSlug !== slug.value || reqLocale !== locale.value) return; // stale response — a newer load() owns the UI
    html.value = marked.parse(raw);
    state.value = "ready";
  } catch {
    if (reqSlug !== slug.value || reqLocale !== locale.value) return;
    state.value = "error";
  }
}

watch([slug, locale], load, { immediate: true });

// ── document title ────────────────────────────────────────────────────────────
const prevTitle = document.title;
watch(
  meta,
  (m) => {
    if (m) document.title = `${m.title} — Samuele Ruaro`;
  },
  { immediate: true },
);
onUnmounted(() => {
  document.title = prevTitle;
});

// Back: land on the REVEALED projects slide, not the top of its pinned track.
function backToProjects() {
  router.push("/").then(() => {
    let done = false;
    const tryScroll = () => {
      if (done) return;
      if (document.querySelector('.present-track[data-journey="projects"]')) {
        done = true;
        scrollToZone("projects");
      }
    };
    [300, 700, 1300, 2000].forEach((ms) => setTimeout(tryScroll, ms));
  });
}
</script>

<template>
  <!-- --card-accent: the project's tech color drives its buttons here too,
       matching the card in ProjectsSection (the back button stays site-red). -->
  <main class="relative z-[2] min-h-screen" :style="def ? { '--card-accent': def.accent } : null">
    <div class="max-w-4xl mx-auto px-6 py-8">
      <!-- top bar -->
      <div class="flex items-center justify-between mb-12">
        <RouterLink v-slot="{ href }" to="/" custom>
          <AppButton
            as="a"
            variant="outline"
            size="sm"
            class="font-mono text-xs gap-2 border-border hover:border-primary hover:text-primary"
            :href="href"
            @click.prevent="backToProjects"
          >
            <ArrowLeft class="h-4 w-4" />
            {{ t.caseStudy.back }}
          </AppButton>
        </RouterLink>
        <LocaleToggle />
      </div>

      <!-- header -->
      <header v-if="def" class="mb-10">
        <h1 class="text-3xl md:text-4xl font-bold mb-3">{{ meta.title }}</h1>
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <AppBadge variant="outline" :class="`text-xs ${def.badgeClass}`">
            {{ t.projects.types[def.type] }}
          </AppBadge>
          <AppBadge v-for="tag in def.tags" :key="tag" variant="outline" class="text-xs font-mono">
            {{ tag }}
          </AppBadge>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <AppButton
            as="a"
            variant="outline"
            size="sm"
            class="font-mono text-xs gap-2 border-border hover:border-[var(--card-accent)] hover:text-[var(--card-accent)]"
            :href="def.github"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github class="h-4 w-4" />
            {{ def.githubFe ? t.projects.sourceBe : t.projects.source }}
          </AppButton>
          <AppButton
            v-if="def.githubFe"
            as="a"
            variant="outline"
            size="sm"
            class="font-mono text-xs gap-2 border-border hover:border-[var(--card-accent)] hover:text-[var(--card-accent)]"
            :href="def.githubFe"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github class="h-4 w-4" />
            {{ t.projects.sourceFe }}
          </AppButton>
        </div>
      </header>

      <!-- body -->
      <p v-if="state === 'loading'" class="text-muted-foreground font-mono text-sm">
        {{ t.caseStudy.loading }}
      </p>
      <div v-else-if="state === 'error'" class="glass-panel rounded-lg p-6">
        <p class="text-muted-foreground mb-4">{{ t.caseStudy.error }}</p>
        <AppButton variant="outline" size="sm" class="font-mono text-xs" @click="backToProjects">
          {{ t.caseStudy.errorCta }}
        </AppButton>
      </div>
      <!-- Self-authored markdown, not user input — safe for v-html. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <article v-else class="prose glass-panel rounded-lg p-6 md:p-10" v-html="html" />
    </div>
  </main>
</template>
