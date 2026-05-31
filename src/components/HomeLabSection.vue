<script setup>
import { Construction } from "lucide-vue-next";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import IconBox from "@/components/ui/IconBox.vue";
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
    <template #default>
      <div class="present-step max-w-2xl mx-auto" :style="{ '--step': 0 }">
        <div class="bg-card border border-border rounded-lg p-10 card-glow">
          <div class="flex flex-col items-center gap-5 text-center">
            <IconBox size="lg">
              <Construction class="h-8 w-8 text-primary" />
            </IconBox>
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
