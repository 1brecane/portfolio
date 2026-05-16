<script setup>
import { Construction } from "lucide-vue-next";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import { useI18n } from "@/i18n";

const { t } = useI18n();
</script>

<template>
  <SectionLayout
    id="homelab"
    :title="t.homelab.title"
    :subtitle="t.homelab.subtitle"
    grid-bg
  >
    <template #default="{ isVisible }">
      <div
        :class="[
          'max-w-2xl mx-auto transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        ]"
      >
        <div class="bg-card border border-border rounded-lg p-10 card-glow">
          <div class="flex flex-col items-center gap-5 text-center">
            <div class="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <Construction class="h-8 w-8 text-primary" />
            </div>
            <AppBadge variant="outline" class="font-mono border-primary/30 text-primary">
              {{ t.homelab.comingSoon.badge }}
            </AppBadge>
            <div class="space-y-2 max-w-lg">
              <h3 class="font-semibold text-xl">{{ t.homelab.comingSoon.title }}</h3>
              <p class="font-mono text-sm text-muted-foreground leading-relaxed">
                {{ t.homelab.comingSoon.message }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </SectionLayout>
</template>
