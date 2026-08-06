import { ref, computed } from "vue";

// Small sample payload shaped like the guide's example response — lets the
// section be built/demoed without a live homelab-api backend.
const FIXTURE = {
  uptime: {
    monitors: [
      { name: "Homepage", status: "up", uptime_24h: 99.98, latency_ms: 42, incidents: [] },
      {
        name: "API Gateway",
        status: "down",
        uptime_24h: 94.21,
        latency_ms: 210,
        incidents: [{ resolved_at: null }],
      },
      { name: "Uptime Kuma", status: "up", uptime_24h: 100, latency_ms: 18, incidents: [] },
    ],
  },
  proxmox: {
    nodes: [
      { name: "pve-01", cpu_usage: 0.32, ram_used_mb: 6144, ram_total_mb: 16384 },
      { name: "pve-02", cpu_usage: 0.58, ram_used_mb: 9216, ram_total_mb: 16384 },
    ],
  },
};

function shouldUseFixture() {
  if (typeof window === "undefined") return false;
  const mocked = new URLSearchParams(window.location.search).has("mockDashboard");
  return mocked || (import.meta.env.DEV && !navigator.onLine);
}

/**
 * useHomelabDashboard() — fetch state for the homelab-api `/api/dashboard`
 * proxy call (same-origin; the Bearer token is injected server-side, see
 * nginx.conf / vite.config.js — never referenced here).
 */
export function useHomelabDashboard() {
  const status = ref("idle"); // 'idle' | 'loading' | 'success' | 'error'
  const data = ref(null); // { uptime: { monitors }, proxmox: { nodes } } | null
  const error = ref(null); // { kind: 'network'|'rate-limit'|'upstream'|'unknown', retryAfter? }
  const lastUpdated = ref(null);

  // 200 but exactly one of the two groups came back empty.
  const degraded = computed(() => {
    if (status.value !== "success" || !data.value) return false;
    const monitorsEmpty = data.value.uptime.monitors.length === 0;
    const nodesEmpty = data.value.proxmox.nodes.length === 0;
    return monitorsEmpty !== nodesEmpty;
  });

  async function refresh() {
    status.value = "loading";
    error.value = null;

    if (shouldUseFixture()) {
      data.value = FIXTURE;
      status.value = "success";
      lastUpdated.value = new Date();
      return;
    }

    try {
      const res = await fetch("/api/dashboard");

      if (!res.ok) {
        // Guide: error bodies are plain text, not JSON — don't parse them as such.
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("Retry-After")) || 30;
          error.value = { kind: "rate-limit", retryAfter };
        } else if (res.status === 502) {
          error.value = { kind: "upstream" };
        } else {
          error.value = { kind: "unknown" };
        }
        status.value = "error";
        return;
      }

      const body = await res.json();
      data.value = {
        uptime: { monitors: body.uptime?.monitors ?? [] },
        proxmox: { nodes: body.proxmox?.nodes ?? [] },
      };
      status.value = "success";
      lastUpdated.value = new Date();
    } catch {
      error.value = { kind: "network" };
      status.value = "error";
    }
  }

  return { status, data, error, degraded, lastUpdated, refresh };
}
