<script setup>
import { computed } from "vue";
import {
  Server, Cpu, HardDrive, Network, Shield,
  Activity, Container, Globe, Lock, Image,
  CalendarDays, Route,
} from "lucide-vue-next";
import SectionHeader from "@/components/ui/SectionHeader.vue";
import StatusDot from "@/components/ui/StatusDot.vue";
import { useI18n } from "@/i18n";
import { useScrollReveal } from "@/composables/useScrollReveal";

const { t } = useI18n();
const { target: sectionRef, isVisible } = useScrollReveal();

const serviceDefs = [
  { name: "Proxmox VE", descKey: "proxmox", icon: Server },
  { name: "Pi-hole", descKey: "pihole", icon: Shield },
  { name: "Cloudflare Tunnel", descKey: "cloudflare", icon: Globe },
  { name: "Vaultwarden", descKey: "vaultwarden", icon: Lock },
  { name: "Nginx", descKey: "nginx", icon: Network },
  { name: "Docker Swarm", descKey: "docker", icon: Container },
  { name: "Immich", descKey: "immich", icon: Image },
  { name: "Baikal", descKey: "baikal", icon: CalendarDays },
  { name: "Tailscale", descKey: "tailscale", icon: Route },
];

const labServices = computed(() =>
  serviceDefs.map((s) => ({
    ...s,
    description: t.value.homelab.services[s.descKey],
  }))
);

const specDefs = [
  { labelKey: "cpus", value: "6", icon: Cpu },
  { labelKey: "threads", value: "6", icon: Cpu },
  { labelKey: "ram", value: "16GB", icon: Server },
  { labelKey: "storage", value: "1TB", icon: HardDrive },
];

const specs = computed(() =>
  specDefs.map((s) => ({
    ...s,
    label: t.value.homelab.specs[s.labelKey],
  }))
);
</script>

<template>
  <section id="homelab" ref="sectionRef" class="relative py-24 md:py-32">
    <div class="mx-auto max-w-6xl px-6">
      <SectionHeader
        :title="t.homelab.title"
        :subtitle="t.homelab.subtitle"
        :is-visible="isVisible"
      />

      <div :class="['grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children', { revealed: isVisible }]">
        <!-- Left: server card + network/security row -->
        <div class="flex flex-col gap-6">
          <div class="bg-card border border-border rounded-lg p-6 card-glow">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Server class="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 class="font-semibold text-lg">{{ t.homelab.serverTitle }}</h3>
                <p class="text-sm text-muted-foreground">{{ t.homelab.serverSubtitle }}</p>
              </div>
              <div class="ml-auto flex items-center gap-2">
                <StatusDot />
                <span class="text-xs font-mono text-chart-2">{{ t.homelab.online }}</span>
              </div>
            </div>

            <!-- CPU usage visualization -->
            <div class="bg-muted/30 rounded-lg p-4 mb-6 border border-border/50">
              <div class="grid grid-cols-6 gap-2">
                <div
                  v-for="i in 6"
                  :key="i"
                  :class="[
                    'h-3 rounded-sm transition-all hover:bg-primary',
                    i <= 4 ? 'bg-primary/60' : 'bg-muted',
                  ]"
                />
              </div>
              <p class="text-xs text-muted-foreground mt-2 font-mono">
                {{ t.homelab.cpuUsage }}
              </p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div
                v-for="spec in specs"
                :key="spec.labelKey"
                class="text-center p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <component :is="spec.icon" class="h-4 w-4 text-primary mx-auto mb-2" />
                <div class="font-mono text-lg font-bold text-foreground">{{ spec.value }}</div>
                <div class="text-xs text-muted-foreground">{{ spec.label }}</div>
              </div>
            </div>
          </div>

          <!-- Network & Security detail cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="bg-card border border-border rounded-lg p-6 card-glow">
              <div class="flex items-center gap-3 mb-4">
                <Network class="h-5 w-5 text-primary" />
                <h3 class="font-semibold">{{ t.homelab.network }}</h3>
              </div>
              <div class="space-y-3 font-mono text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ t.homelab.networkItems.dns }}</span>
                  <span>Pi-hole</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ t.homelab.networkItems.tunnel }}</span>
                  <span>Cloudflare</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ t.homelab.networkItems.vpn }}</span>
                  <span class="text-chart-2">Tailscale</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ t.homelab.networkItems.proxy }}</span>
                  <span>Nginx</span>
                </div>
              </div>
            </div>

            <div class="bg-card border border-border rounded-lg p-6 card-glow">
              <div class="flex items-center gap-3 mb-4">
                <Shield class="h-5 w-5 text-primary" />
                <h3 class="font-semibold">{{ t.homelab.security }}</h3>
              </div>
              <div class="space-y-3 font-mono text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ t.homelab.securityItems.firewall }}</span>
                  <span class="text-chart-2">{{ t.homelab.securityItems.enabled }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ t.homelab.securityItems.ssl }}</span>
                  <span>{{ t.homelab.securityItems.sslValue }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ t.homelab.securityItems.backups }}</span>
                  <span>{{ t.homelab.securityItems.backupsValue }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">{{ t.homelab.securityItems.twofa }}</span>
                  <span class="text-chart-2">{{ t.homelab.securityItems.twofaValue }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: running services + uptime -->
        <div class="flex flex-col gap-6">
          <div class="bg-card border border-border rounded-lg p-6 card-glow">
            <h3 class="font-semibold text-lg mb-4">{{ t.homelab.runningServices }}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="service in labServices"
                :key="service.name"
                class="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <component :is="service.icon" class="h-4 w-4 text-muted-foreground shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="font-mono text-sm truncate">{{ service.name }}</p>
                  <p class="text-xs text-muted-foreground truncate">{{ service.description }}</p>
                </div>
                <StatusDot />
              </div>
            </div>
          </div>

          <!-- Uptime chart (30-day bar visualization) -->
          <div class="bg-card border border-border rounded-lg p-6 card-glow">
            <div class="flex items-center gap-3 mb-4">
              <Activity class="h-5 w-5 text-primary" />
              <h3 class="font-semibold">{{ t.homelab.uptime }}</h3>
            </div>
            <div class="text-center py-4">
              <div class="font-mono text-4xl font-bold text-primary mb-2">99.9%</div>
              <p class="text-sm text-muted-foreground">{{ t.homelab.uptimePeriod }}</p>
            </div>
            <div class="flex gap-1 mt-4">
              <div
                v-for="i in 30"
                :key="i"
                :class="['flex-1 h-6 rounded-sm', i === 16 ? 'bg-chart-4' : 'bg-chart-2']"
                :title="i === 16 ? t.homelab.maintenance : t.homelab.operational"
              />
            </div>
            <p class="text-xs text-muted-foreground mt-2 text-center">{{ t.homelab.uptimeBar }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
