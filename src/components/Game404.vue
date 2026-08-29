<script setup>
import { ref, shallowRef, computed, watch, onUnmounted, nextTick } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import { useI18n } from "@/i18n";

// Deliberately NOT a static import from useGame404.js: this file also
// dynamically `import()`s that module on first Play (see loadEngine below),
// and a static + dynamic import of the same module from the same file makes
// Rollup fold the engine into the main chunk, defeating lazy-loading it.
const MILESTONE_STEP = 100; // must match nothing in the engine — it's a pure HUD-flash cadence

// ════════════════════════════════════════════════════════════════════════════
// Game404 — DOM/a11y shell for the 404-page "LOST PACKET" runner.
//
// Owns state (idle → running → over) and everything meaningful in the DOM:
// the idle poster, Play/Retry, the live HUD, instructions, and the aria-live
// announcement. The actual engine (physics/spawner/canvas drawing) lives in
// useGame404.js and is loaded on demand — the FIRST Play press does the
// `await import()`, so the ~95% of visitors who never play download none of
// it. See feature-404-game.md §② for the split rationale.
// ════════════════════════════════════════════════════════════════════════════

const { t } = useI18n();

const state = ref("idle"); // idle | running | over
const panelRef = ref(null);
const canvasRef = ref(null);

// The engine instance itself, once loaded — a shallowRef so assigning it (on
// first Play) is what the template reactively picks up; score/best are Vue
// refs owned by the engine, read straight through via the computeds below.
const engine = shallowRef(null);
let loadEnginePromise = null;

const liveScore = computed(() => engine.value?.score?.value ?? 0);
const liveBest = computed(() => engine.value?.best?.value ?? 0);

const flashScore = ref(false);
let flashTimer = null;
watch(liveScore, (v, prev) => {
  if (Math.floor(v / MILESTONE_STEP) > Math.floor(prev / MILESTONE_STEP)) {
    flashScore.value = true;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      flashScore.value = false;
    }, 200);
  }
});

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const reducedMotion = ref(reducedMotionQuery.matches);
function onReducedMotionChange(e) {
  reducedMotion.value = e.matches;
}
reducedMotionQuery.addEventListener("change", onReducedMotionChange);

// reduced-data gets identical treatment to reduced-motion (spec §③, decision
// ③): same note, same no-blink. Mirrors StarfieldBackground.vue/AsciiPlanets.vue's
// dataQuery pattern — this file just doesn't gate Play behind it (opt-in stays opt-in).
const reducedDataQuery = window.matchMedia("(prefers-reduced-data: reduce)");
const reducedData = ref(reducedDataQuery.matches);
function onReducedDataChange(e) {
  reducedData.value = e.matches;
}
reducedDataQuery.addEventListener("change", onReducedDataChange);

const motionSuppressed = computed(() => reducedMotion.value || reducedData.value);

// (pointer: coarse), not viewport width — a narrow desktop window still has a keyboard.
const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
const coarsePointer = ref(coarsePointerQuery.matches);
function onPointerChange(e) {
  coarsePointer.value = e.matches;
}
coarsePointerQuery.addEventListener("change", onPointerChange);

const instructions = computed(() =>
  coarsePointer.value
    ? t.value.notFound.game.instructionsTouch
    : t.value.notFound.game.instructions,
);

const announce = computed(() =>
  t.value.notFound.game.announce
    .replace("{score}", String(liveScore.value))
    .replace("{best}", String(liveBest.value)),
);

function pad4(n) {
  return String(Math.max(0, n)).padStart(4, "0");
}

async function loadEngine() {
  if (!loadEnginePromise) loadEnginePromise = import("@/composables/useGame404.js");
  return loadEnginePromise;
}

function handleGameOver() {
  state.value = "over";
}

// Guards against a second Play/Retry firing while the first is still awaiting
// the dynamic import (e.g. a fast double keypress before the chunk resolves)
// — without it, the second call's engine.start() would silently reset an
// already-running game a few frames in.
let starting = false;

async function play() {
  if (state.value === "running" || starting) return;
  starting = true;
  try {
    const { useGame404 } = await loadEngine();
    state.value = "running";
    await nextTick(); // the canvas only mounts once state !== "idle"
    if (!engine.value) {
      engine.value = useGame404({ canvasRef, onGameOver: handleGameOver });
    }
    engine.value.start();
    panelRef.value?.focus();
  } finally {
    starting = false;
  }
}

function retry() {
  play();
}

function quit() {
  engine.value?.stop();
  state.value = "idle";
  panelRef.value?.focus();
}

// ── keyboard — bound to the panel, never to window, so Space still scrolls
// the page for anyone who hasn't focused the game (spec §③, "the trap to avoid").
const JUMP_CODES = ["Space", "Enter", "ArrowUp", "KeyW"];
const DUCK_CODES = ["ArrowDown", "KeyS"];

function onKeyDown(e) {
  if (state.value === "idle") {
    if (JUMP_CODES.includes(e.code)) {
      e.preventDefault();
      play();
    }
    return;
  }
  if (state.value === "over") {
    if (JUMP_CODES.includes(e.code)) {
      e.preventDefault();
      retry();
    }
    return;
  }
  // running
  if (JUMP_CODES.includes(e.code)) {
    e.preventDefault();
    engine.value?.jump();
  } else if (DUCK_CODES.includes(e.code)) {
    e.preventDefault();
    engine.value?.setDuck(true);
  } else if (e.code === "Escape") {
    e.preventDefault();
    quit();
  }
}

function onKeyUp(e) {
  if (state.value === "running" && DUCK_CODES.includes(e.code)) {
    engine.value?.setDuck(false);
  }
}

// Touch: jump-only (decision ②) — preventDefault here only, so page scroll
// outside the panel is never affected.
function onTouchStart(e) {
  e.preventDefault();
  if (state.value === "idle") play();
  else if (state.value === "over") retry();
  else engine.value?.jump();
}

onUnmounted(() => {
  engine.value?.destroy();
  reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
  reducedDataQuery.removeEventListener("change", onReducedDataChange);
  coarsePointerQuery.removeEventListener("change", onPointerChange);
  clearTimeout(flashTimer);
});
</script>

<template>
  <section
    ref="panelRef"
    tabindex="-1"
    aria-labelledby="notfound-game-heading"
    class="mt-12 w-full min-w-0 max-w-2xl mx-auto text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
    @keydown="onKeyDown"
    @keyup="onKeyUp"
  >
    <h2 id="notfound-game-heading" class="font-mono text-sm text-muted-foreground mb-2">
      {{ t.notFound.game.heading }}
    </h2>
    <p class="text-sm text-muted-foreground mb-4">{{ t.notFound.game.intro }}</p>

    <div
      class="relative w-full min-w-0 min-h-[160px] border border-border rounded-md bg-card/40 overflow-hidden touch-manipulation"
      @touchstart="onTouchStart"
    >
      <!-- 16:6 aspect ratio via the classic padding-top spacer, not the CSS
           `aspect-ratio` property: with this panel's width ultimately resolving
           through NotFound.vue's flex-centered (width:auto) column, an
           `aspect-ratio` box falls back to deriving WIDTH from its min-height
           floor (160px × 16/6 ≈ 427px), which is wider than a 375px phone and
           blows out the whole page's horizontal layout. Padding-percentage
           only ever depends on width, never the reverse, so it can't do that. -->
      <div class="pt-[37.5%]" aria-hidden="true" />

      <!-- Idle: pure static markup — no canvas, no engine chunk downloaded. -->
      <div
        v-if="state === 'idle'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center"
      >
        <pre
          aria-hidden="true"
          class="font-mono text-primary leading-tight text-xs sm:text-sm select-none"
        >[@]        404
/ \        %#%
           %#%</pre>
        <p v-if="motionSuppressed" class="text-xs text-muted-foreground max-w-xs">
          {{ t.notFound.game.reducedMotionNote }}
        </p>
        <p
          class="font-mono text-xs text-primary tracking-widest"
          :class="{ 'animate-pulse': !motionSuppressed }"
        >
          {{ t.notFound.game.pressSpace }}
        </p>
        <AppButton size="sm" @click="play">{{ t.notFound.game.play }}</AppButton>
      </div>

      <!-- Running / over: the canvas + DOM HUD, engine already loaded. -->
      <template v-else>
        <canvas ref="canvasRef" aria-hidden="true" class="absolute inset-0 w-full h-full" />

        <div
          class="absolute top-0 inset-x-0 flex justify-between px-3 py-2 font-mono text-xs sm:text-sm pointer-events-none"
        >
          <span class="text-foreground">{{ t.notFound.game.score }} {{ pad4(liveScore) }}</span>
          <span
            class="transition-colors duration-200"
            :class="flashScore ? 'text-primary' : 'text-muted-foreground'"
          >
            {{ t.notFound.game.best }} {{ pad4(liveBest) }}
          </span>
        </div>

        <div
          v-if="state === 'over'"
          class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center"
        >
          <p class="font-mono text-sm sm:text-base text-foreground tracking-widest">
            {{ t.notFound.game.gameOver }}
          </p>
          <p class="font-mono text-xs text-muted-foreground">
            {{ t.notFound.game.score }} {{ pad4(liveScore) }} · {{ t.notFound.game.best }}
            {{ pad4(liveBest) }}
          </p>
          <AppButton size="sm" @click="retry">{{ t.notFound.game.retry }}</AppButton>
        </div>
      </template>
    </div>

    <p class="mt-2 text-xs text-muted-foreground font-mono">{{ instructions }}</p>

    <p role="status" aria-live="polite" class="sr-only">
      {{ state === "over" ? announce : "" }}
    </p>
  </section>
</template>
