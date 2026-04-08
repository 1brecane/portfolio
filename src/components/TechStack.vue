<script setup>
import { computed } from "vue";
import { Server, Database, Container, Code2 } from "lucide-vue-next";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import { useI18n } from "@/i18n";

const { t } = useI18n();

const stackCategories = [
  {
    titleKey: "languages",
    icon: Code2,
    items: [
      { name: "JavaScript", descriptionKey: "javascript" },
      { name: "Python", descriptionKey: "python" },
      { name: "C#", descriptionKey: "csharp" },
      { name: "PHP", descriptionKey: "php" },
      { name: "Vue.js", descriptionKey: "vue" },
      { name: "RabbitMQ", descriptionKey: "rabbitmq" },
    ],
  },
  {
    titleKey: "databases",
    icon: Database,
    items: [
      { name: "MySQL", descriptionKey: "mysql" },
      { name: "MongoDB", descriptionKey: "mongodb" },
      { name: "Redis", descriptionKey: "redis" },
      { name: "PostgreSQL", descriptionKey: "postgresql" },
      { name: "SQLite", descriptionKey: "sqlite" },
      { name: "Elasticsearch", descriptionKey: "elasticsearch" },
    ],
  },
  {
    titleKey: "devops",
    icon: Container,
    items: [
      { name: "Docker", descriptionKey: "docker" },
      { name: "Git", descriptionKey: "git" },
      { name: "CI/CD", descriptionKey: "cicd" },
      { name: "Linux", descriptionKey: "linux" },
      { name: "Nginx", descriptionKey: "nginx" },
      { name: "Portainer", descriptionKey: "portainer" },
    ],
  },
  {
    titleKey: "selfhosting",
    icon: Server,
    items: [
      { name: "Proxmox", descriptionKey: "proxmox" },
      { name: "LXC Containers", descriptionKey: "lxc" },
      { name: "Networking", descriptionKey: "networking" },
      { name: "Monitoring", descriptionKey: "monitoring" },
      { name: "Tailscale", descriptionKey: "tailscale" },
      { name: "Pi-hole", descriptionKey: "pihole" },
    ],
  },
];

/** Resolves i18n keys into display-ready objects on locale change */
const resolvedCategories = computed(() =>
  stackCategories.map((cat) => ({
    title: t.value.stack.categories[cat.titleKey],
    icon: cat.icon,
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
    <template #default="{ isVisible }">
      <div :class="['grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children', { revealed: isVisible }]">
        <div
          v-for="category in resolvedCategories"
          :key="category.title"
          class="group bg-card border border-border rounded-lg p-6 card-glow"
        >
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <component :is="category.icon" class="h-5 w-5 text-primary" />
            </div>
            <h3 class="font-semibold text-lg">{{ category.title }}</h3>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="item in category.items"
              :key="item.name"
              class="flex flex-col p-3 rounded-md bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
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
