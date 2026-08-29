import { ref } from "vue";

// ════════════════════════════════════════════════════════════════════════════
// useGame404 — "LOST PACKET", the 404-page endless runner engine.
//
// A Chrome-dino-style ASCII runner rendered on a bounded Canvas 2D panel (NOT
// the fullscreen z-0 backgrounds — see Game404.vue for the DOM/a11y shell).
// Mirrors StarfieldBackground's canvas idiom: DPR-capped backing store,
// ResizeObserver re-sync, a single rAF loop, dt clamped to 0.05s, alpha baked
// per-glyph into rgba() (never a CSS opacity). Unlike the backgrounds, this
// loop runs ONLY while the game is actually playing — it is entirely opt-in,
// never autostarts, and this whole module is only imported on first Play.
//
// Continuous-float physics, cell-snapped RENDERING: the simulation runs in px
// so jump arcs stay smooth, but glyphs are drawn against a GRID_COLS×GRID_ROWS
// logical grid so it reads as ASCII. Collision runs in the same continuous px
// space the physics does (not the render grid).
// ════════════════════════════════════════════════════════════════════════════

// ── TUNABLE KNOBS ─────────────────────────────────────────────────────────────
const GRID_COLS = 64;
const GRID_COLS_SMALL = 40; // panels under this CSS width use the coarser grid
const SMALL_GRID_BREAKPOINT = 480;
const GRID_ROWS = 14;

const SPEED_START = 240; // px/s, world scroll speed
const SPEED_RAMP = 7; // px/s gained per second survived
const SPEED_MAX = 620; // px/s hard cap so it stays clearable

const GRAVITY = 2200; // px/s²
const JUMP_V0 = -760; // px/s, upward — ≈0.69s airtime
const DUCK_FASTFALL_MULT = 2.2; // gravity multiplier while ducking + airborne
const COYOTE_MS = 90; // jump forgiveness after leaving the ground
const BUFFER_MS = 120; // a jump pressed just before landing still fires

const MIN_GAP_FACTOR = 1.55; // spawn floor = jump air-distance × this — never an unwinnable pair
const AIR_UNLOCK_SCORE = 300;
const CLUSTER_UNLOCK_SCORE = 550;
const AIR_CHANCE = 0.32; // once unlocked, chance a spawn is a drone instead of a pillar
const CLUSTER_CHANCE = 0.35; // once unlocked, chance a ground spawn is a 2-pillar cluster

const RUN_FRAME_MS = 110; // run-cycle glyph swap
const DRONE_FRAME_MS = 220; // drone wing-flap swap
const SCORE_DISTANCE_DIVISOR = 10; // score = floor(distanceTravelled / this)
// NOTE: the "flash the HUD every 100 points" milestone step is owned by
// Game404.vue (MILESTONE_STEP there), not here — this module must have no
// static export consumed by a static import in Game404.vue, only the dynamic
// `await import()` on first Play. A static+dynamic import of the same module
// from the same file makes Rollup merge this chunk into the main bundle,
// defeating the whole "engine loads on demand" point of the split (verified
// via the build's chunk warning). Keep this module's public surface limited
// to the useGame404() function itself.

const BEST_KEY = "portfolio:404-best";

const PLAYER_X_CELLS = 5; // fixed horizontal position, left edge, in cells
const STAND_W_CELLS = 3;
const STAND_H_CELLS = 2;
const DUCK_W_CELLS = 2;
const DUCK_H_CELLS = 1;
const GROUND_MARGIN_CELLS = 1.25; // gap between the feet baseline and the panel's bottom edge

const DRONE_W_CELLS = 5;
const DRONE_H_CELLS = 1;
const DRONE_SAFETY_PX = 4; // clearance above the duck box so a timed duck never false-collides

const FONT_STACK = `ui-monospace, 'Courier New', monospace`; // matches StarfieldBackground

// Approximate sRGB stand-ins for the design tokens (Canvas 2D fillStyle needs a
// concrete color; StarfieldBackground does the same thing for --primary via NEON_RGB).
const FOREGROUND_RGB = [235, 235, 235]; // ≈ oklch(0.95 0 0), --foreground — obstacles
const PRIMARY_RGB = [255, 90, 54]; // ≈ oklch(0.65 0.25 25), --primary — the player
const GROUND_RGB = [140, 140, 140]; // ≈ oklch(0.71 0 0), --muted-foreground — decorative only

const BG_DIM_ALPHA = 0.45; // game-over freeze-frame dim, painted (never CSS opacity)

const PLAYER_RUN_FRAMES = [
  ["[@]", "/ \\"],
  ["[@]", " /\\"],
];
const PLAYER_JUMP_FRAME = ["[@]", "==="];
const PLAYER_DUCK_FRAME = ["<@>"];

// width/height in cells, plus the glyph rows drawn inside that box.
const PILLAR_VARIANTS = [
  { w: 3, h: 3, rows: ["404", "%#%", "%#%"] },
  { w: 3, h: 2, rows: ["500", "%#%"] },
  { w: 4, h: 1, rows: ["NULL"] },
  { w: 3, h: 4, rows: ["</>", "%#%", "%#%", "%#%"] },
];
const DRONE_FRAMES = [["<504>"], ["-504-"]];

export function useGame404({ canvasRef, onGameOver }) {
  const score = ref(0);
  const best = ref(loadBest());

  let ctx2d = null;
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let cols = GRID_COLS;
  let cs = 1; // cell size, px — derived from panel size, see syncSize()

  let resizeObserver = null;
  let intersectionObserver = null;
  let inView = true;
  let animationId = null;
  let lastTs = null;
  let running = false; // rAF loop guard — true only while actually playing
  let observersReady = false;

  // ── simulation state ────────────────────────────────────────────────────
  let speed = SPEED_START;
  let distance = 0;
  let elapsedS = 0;
  let feetY = 0; // player feet, px from panel top
  let vy = 0;
  let grounded = true;
  let ducking = false;
  let lastGroundedAt = 0; // elapsedS at last touchdown
  let jumpQueuedAt = -Infinity; // elapsedS a buffered jump was requested
  let obstacles = []; // { kind: 'pillar'|'drone', x, y, w, h, rows? }
  let distanceSinceSpawn = 0;
  let nextGapPx = 0;
  let crashed = false;

  // ── best-score persistence ──────────────────────────────────────────────
  function loadBest() {
    try {
      const n = parseInt(localStorage.getItem(BEST_KEY), 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0; // private mode etc — game still runs, best just shows 0000
    }
  }

  function saveBest(v) {
    try {
      localStorage.setItem(BEST_KEY, String(v));
    } catch {
      /* ignore persistence failures */
    }
  }

  // ── sizing ───────────────────────────────────────────────────────────────
  function syncSize() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const bw = Math.max(1, Math.round(w * ratio));
    const bh = Math.max(1, Math.round(h * ratio));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    cssW = w;
    cssH = h;
    dpr = ratio;
    cols = w < SMALL_GRID_BREAKPOINT ? GRID_COLS_SMALL : GRID_COLS;
    // Square-ish cells, floored so the full logical row count fits vertically.
    cs = Math.max(1, Math.min(w / cols, h / GRID_ROWS));
  }

  function groundY() {
    return cssH - GROUND_MARGIN_CELLS * cs;
  }

  function nominalJumpAirtime() {
    return (2 * Math.abs(JUMP_V0)) / GRAVITY;
  }

  function minGapPx() {
    return speed * nominalJumpAirtime() * MIN_GAP_FACTOR;
  }

  // ── reset / spawn ────────────────────────────────────────────────────────
  function reset() {
    speed = SPEED_START;
    distance = 0;
    elapsedS = 0;
    feetY = groundY();
    vy = 0;
    grounded = true;
    ducking = false;
    lastGroundedAt = 0;
    jumpQueuedAt = -Infinity;
    obstacles = [];
    distanceSinceSpawn = 0;
    nextGapPx = minGapPx();
    crashed = false;
    score.value = 0;
  }

  function spawnObstacles() {
    const spawnAir = score.value >= AIR_UNLOCK_SCORE && Math.random() < AIR_CHANCE;
    if (spawnAir) {
      const h = DRONE_H_CELLS * cs;
      const bottom = groundY() - DUCK_H_CELLS * cs - DRONE_SAFETY_PX;
      obstacles.push({ kind: "drone", x: cssW + cs, y: bottom - h, w: DRONE_W_CELLS * cs, h });
      return;
    }

    const clusterSize =
      score.value >= CLUSTER_UNLOCK_SCORE && Math.random() < CLUSTER_CHANCE ? 2 : 1;
    let x = cssW + cs;
    for (let i = 0; i < clusterSize; i++) {
      const v = PILLAR_VARIANTS[(Math.random() * PILLAR_VARIANTS.length) | 0];
      const w = v.w * cs;
      const h = v.h * cs;
      obstacles.push({ kind: "pillar", x, y: groundY() - h, w, h, rows: v.rows });
      x += w + cs * 0.8; // small fixed gap inside a cluster — always jumpable, see spec
    }
  }

  // ── input ────────────────────────────────────────────────────────────────
  function doJump() {
    vy = JUMP_V0;
    grounded = false;
  }

  function jump() {
    if (!running) return;
    if (grounded || elapsedS - lastGroundedAt < COYOTE_MS / 1000) {
      doJump();
    } else {
      jumpQueuedAt = elapsedS; // fires on landing if within BUFFER_MS
    }
  }

  function setDuck(v) {
    ducking = !!v;
  }

  // ── player hitbox ────────────────────────────────────────────────────────
  function playerBox() {
    const w = (ducking ? DUCK_W_CELLS : STAND_W_CELLS) * cs;
    const h = (ducking ? DUCK_H_CELLS : STAND_H_CELLS) * cs;
    return { x: PLAYER_X_CELLS * cs, y: feetY - h, w, h };
  }

  // ── physics tick ─────────────────────────────────────────────────────────
  function update(dt) {
    elapsedS += dt;
    speed = Math.min(SPEED_MAX, speed + SPEED_RAMP * dt);
    distance += speed * dt;
    distanceSinceSpawn += speed * dt;

    const newScore = Math.floor(distance / SCORE_DISTANCE_DIVISOR);
    if (newScore !== score.value) score.value = newScore;

    const g = ducking && !grounded ? GRAVITY * DUCK_FASTFALL_MULT : GRAVITY;
    vy += g * dt;
    feetY += vy * dt;
    if (feetY >= groundY()) {
      feetY = groundY();
      if (!grounded) {
        grounded = true;
        vy = 0;
        if (elapsedS - jumpQueuedAt < BUFFER_MS / 1000) doJump();
      }
      lastGroundedAt = elapsedS;
    }

    for (const o of obstacles) o.x -= speed * dt;
    obstacles = obstacles.filter((o) => o.x + o.w > -cs);

    if (distanceSinceSpawn >= nextGapPx) {
      distanceSinceSpawn = 0;
      nextGapPx = minGapPx() + Math.random() * minGapPx() * 0.6;
      spawnObstacles();
    }

    const box = playerBox();
    for (const o of obstacles) {
      if (box.x < o.x + o.w && box.x + box.w > o.x && box.y < o.y + o.h && box.y + box.h > o.y) {
        crash();
        break;
      }
    }
  }

  function crash() {
    crashed = true;
    running = false;
    if (score.value > best.value) {
      best.value = score.value;
      saveBest(best.value);
    }
    onGameOver?.({ score: score.value, best: best.value });
  }

  // ── drawing ──────────────────────────────────────────────────────────────
  function drawGlyphRows(rows, x, y, w, h, rgb, alpha) {
    const rowH = h / rows.length;
    const size = Math.max(9, Math.min(rowH * 0.85, cs * 1.3));
    ctx2d.font = `${size}px ${FONT_STACK}`;
    ctx2d.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
    rows.forEach((r, i) => {
      ctx2d.fillText(r, x + w / 2, y + rowH * (i + 0.5));
    });
  }

  function drawGround() {
    const y = groundY() + Math.min(4, cs * 0.3);
    ctx2d.font = `${Math.max(9, cs * 0.9)}px ${FONT_STACK}`;
    ctx2d.fillStyle = `rgba(${GROUND_RGB[0]},${GROUND_RGB[1]},${GROUND_RGB[2]},0.35)`;
    for (let x = 0; x < cssW; x += cs) {
      ctx2d.fillText(".", x + cs / 2, y);
    }
  }

  function drawObstacles() {
    const frameIdx = Math.floor((elapsedS * 1000) / DRONE_FRAME_MS) % DRONE_FRAMES.length;
    for (const o of obstacles) {
      const rows = o.kind === "pillar" ? o.rows : DRONE_FRAMES[frameIdx];
      drawGlyphRows(rows, o.x, o.y, o.w, o.h, FOREGROUND_RGB, 0.9);
    }
  }

  function drawPlayer() {
    const box = playerBox();
    let rows;
    if (ducking) rows = PLAYER_DUCK_FRAME;
    else if (!grounded) rows = PLAYER_JUMP_FRAME;
    else rows = PLAYER_RUN_FRAMES[Math.floor((elapsedS * 1000) / RUN_FRAME_MS) % PLAYER_RUN_FRAMES.length];
    drawGlyphRows(rows, box.x, box.y, box.w, box.h, PRIMARY_RGB, 0.95);
  }

  function drawCrashOverlay() {
    ctx2d.fillStyle = `rgba(0,0,0,${BG_DIM_ALPHA})`;
    ctx2d.fillRect(0, 0, cssW, cssH);
  }

  function draw() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    ctx2d = ctx2d || canvas.getContext("2d");
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.clearRect(0, 0, cssW, cssH);
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    drawGround();
    drawObstacles();
    drawPlayer();
    if (crashed) drawCrashOverlay();
  }

  // ── animation loop ───────────────────────────────────────────────────────
  function tick(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!crashed) update(dt);
    draw();
    if (running) animationId = requestAnimationFrame(tick);
  }

  function scheduleIfNeeded() {
    if (running && inView && animationId === null) {
      lastTs = null;
      animationId = requestAnimationFrame(tick);
    }
  }

  function cancelIfScheduled() {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  // ── lifecycle: visibility + intersection pause ──────────────────────────
  function onVisibility() {
    if (document.hidden) cancelIfScheduled();
    else scheduleIfNeeded();
  }

  function setupObservers() {
    observersReady = true;
    const canvas = canvasRef.value;

    resizeObserver = new ResizeObserver(() => {
      syncSize();
      // The rAF loop is stopped in the "over" state, so nothing else would
      // repaint the frozen frame at the new size until Retry — redraw once.
      if (crashed) draw();
    });
    if (canvas) resizeObserver.observe(canvas);

    intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (!inView) cancelIfScheduled();
        else scheduleIfNeeded();
      },
      { threshold: 0.05 },
    );
    if (canvas) intersectionObserver.observe(canvas);

    document.addEventListener("visibilitychange", onVisibility);
  }

  // ── public API ───────────────────────────────────────────────────────────
  function start() {
    if (!observersReady) setupObservers();
    syncSize();
    reset();
    running = true;
    lastTs = null;
    scheduleIfNeeded();
  }

  function stop() {
    running = false;
    cancelIfScheduled();
  }

  function destroy() {
    stop();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    ctx2d = null;
  }

  return { start, stop, jump, setDuck, destroy, score, best };
}
