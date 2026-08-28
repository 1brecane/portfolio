<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  WifiOff,
  ServerCrash,
  Clock,
  CircleCheck,
  CircleX,
  Server,
  Cpu,
} from "lucide-vue-next";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppBadge from "@/components/ui/AppBadge.vue";
import IconBox from "@/components/ui/IconBox.vue";
import { useI18n } from "@/i18n";
import { useHomelabDashboard } from "@/composables/useHomelabDashboard";

const { t } = useI18n();
const { status, data, error, degraded, lastUpdated, refresh } = useHomelabDashboard();

// Reduced-data / metered: don't auto-fetch, show an opt-in "Load metrics"
// button instead (mirrors the starfield's reduced-data ethos). Mobile still
// auto-fetches — this is content, not animation.
const reducedData = ref(false);
onMounted(() => {
  reducedData.value = window.matchMedia("(prefers-reduced-data: reduce)").matches;
  if (!reducedData.value) refresh();
});

// Rate-limit countdown: disable Retry until `retryAfter` elapses.
const retryCountdown = ref(0);
let countdownTimer = null;

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function startCountdown(seconds) {
  clearCountdown();
  retryCountdown.value = seconds;
  countdownTimer = setInterval(() => {
    retryCountdown.value -= 1;
    if (retryCountdown.value <= 0) clearCountdown();
  }, 1000);
}

async function handleRefresh() {
  clearCountdown();
  await refresh();
  if (error.value?.kind === "rate-limit") startCountdown(error.value.retryAfter);
}

// Live "updated Ns/Nm ago" caption.
const now = ref(Date.now());
let tickTimer = null;
onMounted(() => {
  tickTimer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  clearCountdown();
  clearInterval(tickTimer);
});

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return "";
  const secs = Math.max(0, Math.floor((now.value - lastUpdated.value.getTime()) / 1000));
  const rel = secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m`;
  return t.value.homelab.dashboard.lastUpdated.replace("{n}", rel);
});

const errorMessage = computed(() => {
  const d = t.value.homelab.dashboard;
  switch (error.value?.kind) {
    case "rate-limit":
      return d.errorRateLimit.replace("{n}", String(Math.max(0, retryCountdown.value)));
    case "upstream":
      return d.errorUpstream;
    case "network":
      return d.errorNetwork;
    default:
      return d.errorUpstream;
  }
});

const errorIcon = computed(() => {
  switch (error.value?.kind) {
    case "rate-limit":
      return Clock;
    case "network":
      return WifiOff;
    default:
      return ServerCrash;
  }
});

const retryDisabled = computed(
  () => status.value === "loading" || (error.value?.kind === "rate-limit" && retryCountdown.value > 0)
);

function formatPercent(fraction) {
  return `${Math.round(fraction * 100)}%`;
}

// uptime_24h arrives already scaled 0-100 (guide example: 99.98), unlike
// cpu_usage which is a 0-1 fraction — do not reuse formatPercent() here.
function formatUptime(percent) {
  return `${Number(percent).toFixed(2)}%`;
}

function formatGb(mb) {
  return `${(mb / 1024).toFixed(1)} GB`;
}

function hasActiveIncident(monitor) {
  return (monitor.incidents ?? []).some((incident) => incident.resolved_at === null);
}

// One-line health summary above the monitor grid — answers "is everything
// fine?" before the eye has to scan every row (real infra runs 10 monitors;
// a tall list of them was mostly repeated "Up" badges saying very little at
// a glance — see #25).
const monitorsSummary = computed(() => {
  if (status.value !== "success") return "";
  const monitors = data.value.uptime.monitors;
  const up = monitors.filter((m) => m.status === "up").length;
  return t.value.homelab.dashboard.monitorsSummary
    .replace("{up}", String(up))
    .replace("{total}", String(monitors.length));
});
</script>

<template>
  <SectionLayout id="homelab" :title="t.homelab.title" :subtitle="t.homelab.subtitle" grid-bg>
    <template #default>
      <!-- Step 0: refresh control + last-updated caption -->
      <div class="present-step max-w-4xl mx-auto mb-8" :style="{ '--step': 0 }">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <span class="font-mono text-xs text-muted-foreground">
            {{ lastUpdatedLabel }}
          </span>
          <AppButton
            variant="outline"
            size="sm"
            class="font-mono"
            :disabled="retryDisabled"
            @click="handleRefresh"
          >
            <Loader2 v-if="status === 'loading'" class="w-4 h-4 mr-2 animate-spin" />
            <RefreshCw v-else class="w-4 h-4 mr-2" />
            {{ t.homelab.dashboard.refresh }}
          </AppButton>
        </div>
      </div>

      <!-- Step 1: primary status panel (idle/loading/error) or Uptime monitors -->
      <div class="present-step max-w-4xl mx-auto" :style="{ '--step': 1 }">
        <div
          v-if="status !== 'success'"
          class="glass-panel rounded-lg p-10 card-glow text-center"
          :role="status === 'error' ? 'alert' : 'status'"
          :aria-live="status === 'error' ? 'assertive' : 'polite'"
          :aria-busy="status === 'loading'"
        >
          <div class="flex flex-col items-center gap-4">
            <template v-if="status === 'idle'">
              <IconBox size="lg">
                <Server class="h-8 w-8 text-primary" />
              </IconBox>
              <p class="font-mono text-sm text-muted-foreground max-w-sm">
                {{ t.homelab.dashboard.loading }}
              </p>
              <AppButton class="font-mono" @click="handleRefresh">
                {{ t.homelab.dashboard.loadMetrics }}
              </AppButton>
            </template>

            <template v-else-if="status === 'loading'">
              <IconBox size="lg">
                <Loader2 class="h-8 w-8 text-primary animate-spin" />
              </IconBox>
              <p class="font-mono text-sm text-muted-foreground">
                {{ t.homelab.dashboard.loading }}
              </p>
            </template>

            <template v-else>
              <IconBox size="lg" accent="amber">
                <component :is="errorIcon" class="h-8 w-8 text-destructive" />
              </IconBox>
              <p class="font-mono text-sm text-destructive max-w-sm flex items-center gap-2 justify-center">
                <AlertCircle class="h-4 w-4 shrink-0" />
                {{ errorMessage }}
              </p>
              <AppButton variant="outline" class="font-mono" :disabled="retryDisabled" @click="handleRefresh">
                {{ t.homelab.dashboard.retry }}
              </AppButton>
            </template>
          </div>
        </div>

        <div v-else class="glass-panel rounded-lg p-6 md:p-8 card-glow" role="status" aria-live="polite">
          <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h3 class="font-semibold text-lg">{{ t.homelab.dashboard.monitorsHeading }}</h3>
            <span v-if="monitorsSummary" class="font-mono text-xs text-muted-foreground">
              {{ monitorsSummary }}
            </span>
          </div>

          <p v-if="degraded && data.uptime.monitors.length === 0" class="font-mono text-sm text-muted-foreground">
            {{ t.homelab.dashboard.degradedMonitors }}
          </p>
          <p v-else-if="data.uptime.monitors.length === 0" class="font-mono text-sm text-muted-foreground">
            {{ t.homelab.dashboard.empty }}
          </p>
          <!-- Compact grid instead of a tall single-column list: real infra runs
               ~10 monitors, and a full-width row each made the card taller than
               the viewport (pinned sections only get one screen) while saying
               very little per row (see #25). Uptime/latency drop to a footer
               line inside each card instead of stretching the row full-width. -->
          <ul v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <li
              v-for="monitor in data.uptime.monitors"
              :key="monitor.name"
              class="rounded-md border border-border/50 p-3 space-y-2"
            >
              <div class="flex items-center gap-2 min-w-0">
                <component
                  :is="monitor.status === 'up' ? CircleCheck : CircleX"
                  :class="['h-4 w-4 shrink-0', monitor.status === 'up' ? 'text-chart-2' : 'text-destructive']"
                />
                <span class="font-medium text-sm truncate flex-1">{{ monitor.name }}</span>
                <AppBadge
                  variant="outline"
                  :class="[
                    'font-mono text-[0.65rem] shrink-0',
                    monitor.status === 'up'
                      ? 'border-chart-2/40 text-chart-2'
                      : 'border-destructive/40 text-destructive',
                  ]"
                >
                  {{ monitor.status === "up" ? t.homelab.dashboard.statusUp : t.homelab.dashboard.statusDown }}
                </AppBadge>
              </div>
              <div class="flex items-center gap-3 font-mono text-[0.7rem] text-muted-foreground">
                <span>{{ t.homelab.dashboard.uptime24h }}: {{ formatUptime(monitor.uptime_24h) }}</span>
                <span>{{ t.homelab.dashboard.latency }}: {{ monitor.latency_ms }} ms</span>
              </div>
              <p v-if="hasActiveIncident(monitor)" class="font-mono text-[0.7rem] text-destructive">
                {{ t.homelab.dashboard.incidentActive }}
              </p>
            </li>
          </ul>
        </div>
      </div>

      <!-- Step 2: Proxmox nodes (only meaningful once data has loaded) -->
      <div class="present-step max-w-4xl mx-auto mt-6" :style="{ '--step': 2 }">
        <div v-if="status === 'success'" class="glass-panel rounded-lg p-6 md:p-8 card-glow">
          <h3 class="font-semibold text-lg mb-4">{{ t.homelab.dashboard.nodesHeading }}</h3>

          <p v-if="degraded && data.proxmox.nodes.length === 0" class="font-mono text-sm text-muted-foreground">
            {{ t.homelab.dashboard.degradedNodes }}
          </p>
          <p v-else-if="data.proxmox.nodes.length === 0" class="font-mono text-sm text-muted-foreground">
            {{ t.homelab.dashboard.empty }}
          </p>
          <!-- Full-width instrument rows, not a card grid: a card-grid approach
               (even centered) still reads as "half-empty" with the one real
               Proxmox node this homelab has — a real redesign, not a
               reposition (see #25). One node = one row that legitimately
               fills the width with bigger readouts; N nodes stack the same
               row N times, so it never depends on a column-count heuristic. -->
          <div v-else class="space-y-4">
            <div
              v-for="(node, i) in data.proxmox.nodes"
              :key="node.name"
              class="rounded-lg border border-border/50 bg-background/30 p-5 md:p-6"
            >
              <div class="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
                <div class="flex items-center gap-3 md:w-52 shrink-0">
                  <IconBox accent="primary">
                    <Cpu class="h-5 w-5 text-primary" />
                  </IconBox>
                  <div class="min-w-0">
                    <span class="font-semibold truncate block">{{ node.name }}</span>
                    <span class="font-mono text-[0.65rem] text-muted-foreground tracking-wide">
                      NODE&nbsp;{{ String(i + 1).padStart(2, "0") }}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-6 flex-1">
                  <div>
                    <div class="flex items-baseline justify-between gap-2">
                      <span class="font-mono text-xs text-muted-foreground uppercase tracking-wide">{{
                        t.homelab.dashboard.cpu
                      }}</span>
                      <span class="font-mono text-2xl md:text-3xl font-bold tabular-nums">{{
                        formatPercent(node.cpu_usage)
                      }}</span>
                    </div>
                    <div class="h-2 rounded-full bg-border/40 overflow-hidden mt-2">
                      <div
                        class="h-full rounded-full bg-primary"
                        :style="{ width: formatPercent(node.cpu_usage) }"
                      />
                    </div>
                  </div>

                  <div>
                    <div class="flex items-baseline justify-between gap-2">
                      <span class="font-mono text-xs text-muted-foreground uppercase tracking-wide">{{
                        t.homelab.dashboard.ram
                      }}</span>
                      <span class="font-mono text-2xl md:text-3xl font-bold tabular-nums">
                        {{ formatGb(node.ram_used_mb) }}
                        <span class="text-sm font-normal text-muted-foreground"
                          >/ {{ formatGb(node.ram_total_mb) }}</span
                        >
                      </span>
                    </div>
                    <div class="h-2 rounded-full bg-border/40 overflow-hidden mt-2">
                      <div
                        class="h-full rounded-full bg-chart-2"
                        :style="{ width: formatPercent(node.ram_used_mb / node.ram_total_mb) }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </SectionLayout>
</template>
