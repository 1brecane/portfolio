<script setup>
import { ref, computed, nextTick } from "vue";
import { X, Minus, Square, ChevronDown } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import SocialLinks from "@/components/ui/SocialLinks.vue";
import CvCaptchaModal from "@/components/ui/CvCaptchaModal.vue";
import TerminalPrompt from "@/components/ui/TerminalPrompt.vue";
import { useI18n } from "@/i18n";
import { useTypewriter } from "@/composables/useTypewriter";
import { useTerminalShell } from "@/composables/useTerminalShell";
import { useColorScheme } from "@/composables/useColorScheme";
import { useWindowScroll } from "@/composables/useWindowScroll";
import { scrollToZone } from "@/composables/useJourneyScroll";

const { t } = useI18n();

// The galaxy now renders app-level (see App.vue). The `color N` egg writes its
// hover palette through a shared singleton instead of a local prop.
const { setColorScheme } = useColorScheme();

// "Scroll to begin" cue — invites the user into the journey, fades on first scroll.
const { scrollY } = useWindowScroll();
const showScrollCue = computed(() => scrollY.value < 60);

const terminalLines = computed(() => t.value.hero.terminal);
const { displayedLines, isFinished, finish } = useTypewriter(terminalLines);

const userInput = ref("");
const isMinimized = ref(false);
const isClosed = ref(false);
const showCaptcha = ref(false);
const terminalFocused = ref(false);

// `clear` wipes the intro lines too, like a real terminal clear.
const hideIntro = ref(false);
const { entries, lastCmd, run, historyPrev, historyNext } = useTerminalShell({
  t,
  setColorScheme,
  onClear: () => {
    hideIntro.value = true;
  },
});

// Output `kind` → theme class (see useTerminalShell line constructors).
const LINE_CLASS = {
  plain: "text-foreground",
  accent: "text-chart-2",
  error: "text-destructive",
  dim: "text-muted-foreground/70 italic",
};

// Window title mirrors the last command, like a real terminal emulator.
const TITLE_MAX = 24; // TUNABLE — truncation length
const windowTitle = computed(() => {
  const c = lastCmd.value;
  const suffix = c ? (c.length > TITLE_MAX ? `${c.slice(0, TITLE_MAX - 1)}…` : c) : "~";
  return `samuele@portfolio: ${suffix}`;
});

const termBodyEl = ref(null);
async function scrollToBottom() {
  await nextTick();
  if (termBodyEl.value) termBodyEl.value.scrollTop = termBodyEl.value.scrollHeight;
}

const shownLines = computed(() =>
  isFinished.value && displayedLines.value.length > 0
    ? displayedLines.value.slice(0, -1)
    : displayedLines.value,
);

// Keydown lands on a visually-hidden <input> inside the terminal body (so a tap
// on touch screens opens the keyboard too). Tab and ctrl/meta shortcuts pass
// through untouched; everything else is ours, so the input never holds text.
function handleKey(e) {
  if (e.key === "Tab" || e.ctrlKey || e.metaKey) return;
  e.preventDefault();
  // Any key during the intro fast-forwards it (the keystroke is consumed).
  if (!isFinished.value) {
    finish();
    return;
  }
  if (e.key === "Backspace") {
    userInput.value = userInput.value.slice(0, -1);
  } else if (e.key === "ArrowUp") {
    const c = historyPrev();
    if (c !== null) userInput.value = c;
  } else if (e.key === "ArrowDown") {
    const c = historyNext();
    if (c !== null) userInput.value = c;
  } else if (e.key === "Enter") {
    run(userInput.value);
    userInput.value = "";
    scrollToBottom();
  } else if (e.key.length === 1 && !e.altKey) {
    if (userInput.value.length < 200) userInput.value += e.key;
  }
}

const cmdInputEl = ref(null);

function focusTerminal() {
  if (!isFinished.value) finish();
  cmdInputEl.value?.focus({ preventScroll: true });
}

// ── drag logic ────────────────────────────────────────────────────────────────
const terminalEl = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const position = ref({ x: null, y: null });
const dragWidth = ref(null);
const isDragging = ref(false);

function onDragStart(e) {
  const el = terminalEl.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();

  if (position.value.x === null) {
    position.value = { x: rect.left, y: rect.top };
    dragWidth.value = rect.width;
  }

  dragOffset.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y,
  };
  isDragging.value = true;

  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);
}

function onDragMove(e) {
  if (!isDragging.value) return;
  // Clamp to the viewport so the window (and its title-bar controls) can never
  // be dragged out of reach — the only way back would be a reload.
  const margin = 8;
  const width = dragWidth.value ?? terminalEl.value?.offsetWidth ?? 0;
  const titleBar = 48; // keep at least the draggable title bar on screen
  position.value = {
    x: Math.min(
      Math.max(e.clientX - dragOffset.value.x, margin),
      Math.max(margin, window.innerWidth - width - margin),
    ),
    y: Math.min(
      Math.max(e.clientY - dragOffset.value.y, margin),
      Math.max(margin, window.innerHeight - titleBar),
    ),
  };
}

function onDragEnd() {
  isDragging.value = false;
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
}

const terminalStyle = computed(() => {
  if (position.value.x === null) return {};
  return {
    position: "fixed",
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
    width: dragWidth.value ? `${dragWidth.value}px` : undefined,
    zIndex: 50,
    margin: 0,
  };
});

// ── reopen: always restore to original (non-fixed) position ──────────────────
function reopenTerminal() {
  isClosed.value = false;
  position.value = { x: null, y: null };
  dragWidth.value = null;
  isMinimized.value = false;
}
</script>

<template>
  <section id="hero" class="relative min-h-screen overflow-hidden flex items-center">
    <div class="absolute inset-0 z-[1] bg-gradient-to-b from-background/10 via-background/20 to-transparent pointer-events-none" />

    <div class="relative z-10 w-full mx-auto max-w-6xl px-6 py-24 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 lg:gap-16 items-center">

      <!-- Left column: text + actions -->
      <div class="flex flex-col items-start gap-8">
        <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
          {{ t.hero.headline }}
          <span class="text-primary neon-text">{{ t.hero.headlineHighlight }}</span>
          {{ t.hero.headlineEnd }}
        </h1>

        <!-- One-line role pitch for the 5-second scanner who won't read the terminal. -->
        <p class="-mt-3 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
          {{ t.hero.subheadline }}
        </p>

        <div class="flex flex-col sm:flex-row items-start gap-4">
          <AppButton
            as="a"
            href="#projects"
            size="lg"
            class="font-mono bg-primary text-primary-foreground hover:bg-primary/90 neon-glow neon-cta"
            @click.prevent="scrollToZone('projects')"
          >
            {{ t.hero.viewProjects }}
          </AppButton>
          <AppButton
            size="lg"
            variant="outline"
            class="font-mono border-border hover:border-primary hover:text-primary bg-card/40 backdrop-blur-sm"
            @click="showCaptcha = true"
          >
            {{ t.hero.downloadCv }}
          </AppButton>
        </div>

        <div class="inline-flex items-center gap-6 px-5 py-2.5 rounded-full bg-card/30 backdrop-blur-sm border border-border/40">
          <SocialLinks icon-class="h-6 w-6" />
        </div>
      </div>

      <!-- Right column: terminal -->
      <div>
        <div
          v-if="!isClosed"
          ref="terminalEl"
          :style="terminalStyle"
          :class="['w-full', isDragging ? 'select-none' : '']"
        >
          <div class="bg-card/5 backdrop-blur-sm border border-border rounded-lg overflow-hidden shadow-2xl">
            <!-- Title bar -->
            <div
              class="flex items-center gap-2 px-4 py-3 bg-card/5 backdrop-blur-sm border-b border-border cursor-grab active:cursor-grabbing"
              @mousedown="onDragStart"
            >
              <button
                class="p-2 -m-2 rounded-full group"
                :title="t.a11y.closeTerminal"
                :aria-label="t.a11y.closeTerminal"
                @click.stop="isClosed = true"
              >
                <span class="w-3 h-3 rounded-full bg-destructive hover:brightness-90 transition-all flex items-center justify-center">
                  <X class="w-2 h-2 opacity-0 group-hover:opacity-100 text-destructive-foreground" />
                </span>
              </button>
              <button
                class="p-2 -m-2 rounded-full group"
                :title="t.a11y.minimizeTerminal"
                :aria-label="t.a11y.minimizeTerminal"
                @click.stop="isMinimized = !isMinimized"
              >
                <span class="w-3 h-3 rounded-full bg-chart-4 hover:brightness-90 transition-all flex items-center justify-center">
                  <Minus class="w-2 h-2 opacity-0 group-hover:opacity-100 text-black" />
                </span>
              </button>
              <button
                class="p-2 -m-2 rounded-full group"
                :title="t.a11y.resetTerminal"
                :aria-label="t.a11y.resetTerminal"
                @click.stop="position = { x: null, y: null }; isMinimized = false"
              >
                <span class="w-3 h-3 rounded-full bg-chart-2 hover:brightness-90 transition-all flex items-center justify-center">
                  <Square class="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 text-black" />
                </span>
              </button>
              <span class="ml-4 font-mono text-xs text-muted-foreground select-none">{{ windowTitle }}</span>
            </div>

            <!-- Terminal body -->
            <!-- Click/tap anywhere in the body focuses the hidden input below, so the
                 terminal accepts typing from touch keyboards too (a tabindex div never
                 opens one). Keyboard users tab straight to the input. -->
            <div
              v-if="!isMinimized"
              ref="termBodyEl"
              class="terminal-body relative max-h-[22rem] overflow-y-auto p-6 text-left font-mono text-sm outline-none"
              @click="focusTerminal"
            >
              <input
                ref="cmdInputEl"
                class="terminal-input"
                type="text"
                :aria-label="t.a11y.terminalInput"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                @keydown="handleKey"
                @focus="terminalFocused = true"
                @blur="terminalFocused = false"
              />
              <template v-if="!hideIntro">
                <div
                  v-for="(line, index) in shownLines"
                  :key="`line-${index}-${line}`"
                  class="text-foreground"
                >
                  <template v-if="line.startsWith('$')"><TerminalPrompt />{{ line.slice(2) }}</template>
                  <template v-else>{{ line }}</template>
                  <span
                    v-if="!isFinished && index === shownLines.length - 1"
                    class="inline-block w-2 h-4 bg-white ml-0.5 cursor-blink"
                  />
                </div>
              </template>
              <template v-for="entry in entries" :key="entry.id">
                <div class="text-foreground"><TerminalPrompt />{{ entry.cmd }}</div>
                <div
                  v-for="(l, li) in entry.output"
                  :key="`${entry.id}-${li}`"
                  class="whitespace-pre"
                  :class="LINE_CLASS[l.kind]"
                >{{ l.text }}</div>
              </template>
              <div v-if="isFinished" class="text-foreground flex items-baseline">
                <TerminalPrompt />
                <span class="text-foreground">{{ userInput }}</span>
                <span class="inline-block w-2 h-4 bg-white cursor-blink" />
              </div>
              <div
                v-if="isFinished && !userInput && entries.length === 0"
                class="mt-2 text-[0.7rem] italic select-none transition-colors"
                :class="terminalFocused ? 'text-muted-foreground/90' : 'text-muted-foreground/55'"
              >
                {{ t.hero.terminalHint }}
              </div>
            </div>
          </div>
        </div>

        <!-- Reopen button if closed -->
        <div v-else class="flex justify-start">
          <button
            class="font-mono text-xs text-muted-foreground border border-border rounded px-3 py-1 hover:border-primary hover:text-primary transition-colors"
            @click="reopenTerminal"
          >
            &gt;_ reopen terminal
          </button>
        </div>
      </div>

    </div>

    <Transition name="cue">
      <a
        v-if="showScrollCue"
        href="#about"
        class="scroll-cue absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
        @click.prevent="scrollToZone('about')"
      >
        <span>{{ t.hero.scrollCue }}</span>
        <ChevronDown class="h-4 w-4 scroll-cue__chevron" />
      </a>
    </Transition>

    <CvCaptchaModal v-if="showCaptcha" @close="showCaptcha = false" />
  </section>
</template>

<style scoped>
/* Make the terminal's keyboard focus visible — it's typeable (easter eggs,
   `color N`), but without a ring there's no hint that it accepts input.
   Focus lives on the hidden input, so key off :focus-within. */
.terminal-body:focus-within {
  outline: 1px solid var(--primary);
  outline-offset: -2px;
  border-radius: 0.375rem;
}

/* The real input behind the fake terminal: invisible but focusable. The 16px
   font-size stops iOS from zooming the page when it gains focus. */
.terminal-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  opacity: 0;
  font-size: 16px;
  caret-color: transparent;
}

.cue-enter-active,
.cue-leave-active {
  transition: opacity 0.5s ease;
}
.cue-enter-from,
.cue-leave-to {
  opacity: 0;
}

.scroll-cue__chevron {
  animation: cue-bob 1.8s ease-in-out infinite;
}

@keyframes cue-bob {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.6;
  }
  50% {
    transform: translateY(4px);
    opacity: 1;
  }
}
</style>
