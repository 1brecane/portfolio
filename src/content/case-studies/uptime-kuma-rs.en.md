# Building uptime-kuma-rs

## Context

[Uptime Kuma](https://github.com/louislam/uptime-kuma) is the monitoring tool
behind this site's own Home Lab section — it watches every self-hosted
service and reports status, latency and uptime. It's a great dashboard, but
it was never built to be an API: its UI talks to its backend over an
undocumented, version-unstable socket.io interface, so anything that wants
the same data has nothing stable to depend on. `uptime-kuma-rs` is a small
**Rust** service that closes that gap — it polls Uptime Kuma's public
status-page endpoints and re-exposes everything as a clean, read-only REST
API that other services can build on without breaking on the next Uptime
Kuma upgrade.

## Challenges

- **No real API to call.** The only public surface is the JSON a status page
  uses to render its own widgets — never meant to be a general-purpose data
  source, and it only carries a rolling 24 hours of history.
- **7-day and 30-day uptime need more history than Uptime Kuma keeps.** If the
  API only forwards what Uptime Kuma exposes, weekly and monthly uptime are
  simply impossible to compute.
- **Honesty about partial data.** A freshly deployed instance hasn't been
  running for a week yet — reporting a 7-day uptime percentage as if it were
  complete would be quietly lying with a number.

## Technical solutions

The service follows a **poll → cache → serve** pipeline, and each stage owns
exactly one responsibility:

1. A background task (`poller/`) fetches the status page's monitor list and
   recent heartbeats on a timer — no authentication required, since this is
   the same JSON the public status page itself uses.
2. Every new heartbeat is persisted to **SQLite** (`store/`), deduplicated on
   `(monitor_id, time)`. This is the actual source of truth: since the
   status-page API only returns 24h of history, 7-day and 30-day uptime —
   and incident history — have to be accumulated locally over time, not
   fetched on demand.
3. Uptime and incidents are computed from that stored history: 24h comes
   straight from the status page, while 7d/30d and incident periods are
   aggregated from SQLite with a SQL window-function query that detects
   up/down transitions across the stored heartbeats — not live in-process
   diffing, so incident history survives a restart intact.
4. The results are assembled into one snapshot and atomically swapped into
   an in-memory cache (`arc-swap`), lock-free on the read side.
5. HTTP handlers (`api/`, built on **Axum**) do nothing but read the current
   snapshot and serve the relevant slice as JSON — they never touch the
   poller or the database directly.

The "honesty about partial data" problem gets a specific answer: every
7-day/30-day uptime figure ships with a paired `coverage` value (0.0–1.0)
showing how much of that window is actually backed by stored history, so a
service consuming the API can tell a complete number from a partial one
instead of being quietly misled by an instance that's only been running for
a day.

The rest of the stack is **Tokio** for async, **SQLx** for compile-time
checked SQL against SQLite, **reqwest** for polling, and **tower-http** for
CORS/tracing/timeout middleware — a deliberately small dependency set for a
service meant to run as one more lightweight container next to the thing it
monitors.

## Outcome

The three endpoints the project set out to ship are implemented and running:
`GET /api/monitors` (current status and latency), `GET /api/uptime` (24h/7d/30d
ratios with coverage), and `GET /api/incidents` (reconstructed downtime
periods). It ships as a **Docker** image with a minimal footprint — in-memory
hot path, SQLite for durability, nothing else required for a single-instance
deployment. `X-Api-Key` auth enforcement, configurable CORS, and a Redis
cache tier for multi-replica setups are designed for but not yet wired in —
an honest gap, not a hidden one. The full source is on
[GitHub](https://github.com/1brecane/uptime-kuma-rs).
