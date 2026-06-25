<script setup>
import { computed } from "vue";
import { Server, Database, Container, Code2 } from "lucide-vue-next";
import IconBox from "@/components/ui/IconBox.vue";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import { useI18n } from "@/i18n";

const { t } = useI18n();

// Each category carries an accent (galaxy reds + cyan/purple/amber) so the four
// cards read as distinct systems instead of one monochrome-red wall. `iconClass`
// colors the glyph; `accent` tints the IconBox; `itemHover` lights the chip edge.
const stackCategories = [
  {
    titleKey: "languages",
    icon: Code2,
    accent: "primary",
    iconClass: "text-primary",
    itemHover: "hover:border-primary/40",
    items: [
      { name: "JavaScript",          descriptionKey: "javascript" },
      { name: "Rust",                descriptionKey: "rust" },
      { name: "C#",                  descriptionKey: "csharp" },
      { name: "PHP",                 descriptionKey: "php" },
      { name: "Vue.js",              descriptionKey: "vue" },
      { name: "Cursor & Claude Code", descriptionKey: "cursorAi" },
    ],
  },
  {
    titleKey: "databases",
    icon: Database,
    accent: "cyan",
    iconClass: "text-chart-2",
    itemHover: "hover:border-chart-2/40",
    items: [
      { name: "MySQL",      descriptionKey: "mysql" },
      { name: "MongoDB",    descriptionKey: "mongodb" },
      { name: "Redis",      descriptionKey: "redis" },
      { name: "PostgreSQL", descriptionKey: "postgresql" },
      { name: "Valkey",     descriptionKey: "valkey" },
      { name: "SQLite",     descriptionKey: "sqlite" },
    ],
  },
  {
    titleKey: "devops",
    icon: Container,
    accent: "purple",
    iconClass: "text-chart-3",
    itemHover: "hover:border-chart-3/40",
    items: [
      { name: "Docker",   descriptionKey: "docker" },
      { name: "CI/CD",    descriptionKey: "cicd" },
      { name: "Linux",    descriptionKey: "linux" },
      { name: "Nginx",    descriptionKey: "nginx" },
      { name: "Git",      descriptionKey: "git" },
      { name: "RabbitMQ", descriptionKey: "rabbitmq" },
    ],
  },
  {
    titleKey: "selfhosting",
    icon: Server,
    accent: "amber",
    iconClass: "text-chart-4",
    itemHover: "hover:border-chart-4/40",
    items: [
      { name: "Proxmox VE",        descriptionKey: "proxmox" },
      { name: "LXC Containers",    descriptionKey: "lxc" },
      { name: "Tailscale",         descriptionKey: "tailscale" },
      { name: "Pi-hole",           descriptionKey: "pihole" },
      { name: "Immich",            descriptionKey: "immich" },
      { name: "Cloudflare Tunnel", descriptionKey: "cloudflare" },
    ],
  },
];

/** Resolves i18n keys into display-ready objects on locale change */
const resolvedCategories = computed(() =>
  stackCategories.map((cat) => ({
    title: t.value.stack.categories[cat.titleKey],
    icon: cat.icon,
    accent: cat.accent,
    iconClass: cat.iconClass,
    itemHover: cat.itemHover,
    items: cat.items.map((item) => ({
      name: item.name,
      description: t.value.stack.items[item.descriptionKey],
    })),
  }))
);
</script>

<template>
  <SectionLayout
    id="stack"
    :title="t.stack.title"
    :subtitle="t.stack.subtitle"
  >
    <template #default>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="(category, i) in resolvedCategories"
          :key="category.title"
          class="present-step group glass-panel rounded-lg p-6 card-glow"
          :style="{ '--step': i }"
        >
          <div class="flex items-center gap-3 mb-6">
            <IconBox :accent="category.accent">
              <component :is="category.icon" :class="['h-5 w-5', category.iconClass]" />
            </IconBox>
            <h3 class="font-semibold text-lg">{{ category.title }}</h3>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="item in category.items"
              :key="item.name"
              class="flex flex-col p-3 rounded-md bg-muted/40 border border-border/50 transition-colors"
              :class="category.itemHover"
            >
              <span class="font-mono text-sm font-medium text-foreground">
                {{ item.name }}
              </span>
              <span class="text-xs text-muted-foreground mt-1">
                {{ item.description }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </SectionLayout>
</template>
