<script setup>
import { ref, computed, defineAsyncComponent } from "vue";
import { X, Minus, Square } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import SocialLinks from "@/components/ui/SocialLinks.vue";
import { useI18n } from "@/i18n";
import { useTypewriter } from "@/composables/useTypewriter";

const HeroGalaxyBackground = defineAsyncComponent(
  () => import("@/components/HeroGalaxyBackground.vue"),
);

const { t } = useI18n();

const terminalLines = computed(() => t.value.hero.terminal);
const { displayedLines, isFinished } = useTypewriter(terminalLines);

const userInput = ref("");
const isMinimized = ref(false);
const isClosed = ref(false);

const shownLines = computed(() =>
  isFinished.value && displayedLines.value.length > 0
    ? displayedLines.value.slice(0, -1)
    : displayedLines.value,
);

function handleKey(e) {
  if (!isFinished.value) return;
  e.preventDefault();
  if (e.key === "Backspace") {
    userInput.value = userInput.value.slice(0, -1);
  } else if (e.key === "Enter") {
    userInput.value = "";
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    userInput.value += e.key;
  }
}

// ── drag logic ────────────────────────────────────────────────────────────────
const terminalEl = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const position = ref({ x: null, y: null });
const isDragging = ref(false);

function onDragStart(e) {
  if (isMinimized.value) return;
  const el = terminalEl.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();

  if (position.value.x === null) {
    position.value = { x: rect.left, y: rect.top };
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
  position.value = {
    x: e.clientX - dragOffset.value.x,
    y: e.clientY - dragOffset.value.y,
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
    zIndex: 50,
    margin: 0,
  };
});
</script>

<template>
  <section id="hero" class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <HeroGalaxyBackground />

    <div class="absolute inset-0 z-[1] bg-gradient-to-b from-background/25 via-background/55 to-background pointer-events-none" />

    <div class="relative z-10 mx-auto max-w-6xl px-6 py-24 text-center">
      <!-- Terminal window -->
      <div
        v-if="!isClosed"
        ref="terminalEl"
        :style="terminalStyle"
        :class="['mx-auto max-w-2xl mb-12', isDragging ? 'select-none' : '']"
      >
        <div class="bg-card border border-border rounded-lg overflow-hidden shadow-2xl">
          <!-- Title bar -->
          <div
            class="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border cursor-grab active:cursor-grabbing"
            @mousedown="onDragStart"
          >
            <!-- traffic lights -->
            <button
              class="w-3 h-3 rounded-full bg-destructive hover:brightness-90 transition-all flex items-center justify-center group"
              @click.stop="isClosed = true"
              title="Close"
            >
              <X class="w-2 h-2 opacity-0 group-hover:opacity-100 text-destructive-foreground" />
            </button>
            <button
              class="w-3 h-3 rounded-full bg-chart-4 hover:brightness-90 transition-all flex items-center justify-center group"
              @click.stop="isMinimized = !isMinimized"
              title="Minimize"
            >
              <Minus class="w-2 h-2 opacity-0 group-hover:opacity-100 text-black" />
            </button>
            <button
              class="w-3 h-3 rounded-full bg-chart-2 hover:brightness-90 transition-all flex items-center justify-center group"
              title="Reset position"
              @click.stop="position = { x: null, y: null }; isMinimized = false"
            >
              <Square class="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 text-black" />
            </button>
            <span class="ml-4 font-mono text-xs text-muted-foreground select-none">bash</span>
          </div>

          <!-- Terminal body -->
          <div
            v-if="!isMinimized"
            class="p-6 text-left font-mono text-sm outline-none"
            tabindex="0"
            @keydown="handleKey"
          >
            <div
              v-for="(line, index) in shownLines"
              :key="`line-${index}-${line}`"
              :class="line.startsWith('$') ? 'text-primary' : 'text-foreground'"
            >
              {{ line }}
              <span
                v-if="!isFinished && index === shownLines.length - 1"
                class="inline-block w-2 h-4 bg-white ml-0.5 cursor-blink"
              />
            </div>
            <!-- Interactive prompt once animation is done -->
            <div v-if="isFinished" class="text-primary flex items-baseline gap-0.5">
              <span>$&nbsp;</span>
              <span class="text-foreground">{{ userInput }}</span>
              <span class="inline-block w-2 h-4 bg-white cursor-blink" />
            </div>
          </div>
        </div>
      </div>

      <!-- Reopen button if closed -->
      <div v-else class="mx-auto max-w-2xl mb-12 flex justify-center">
        <button
          class="font-mono text-xs text-muted-foreground border border-border rounded px-3 py-1 hover:border-primary hover:text-primary transition-colors"
          @click="isClosed = false"
        >
          &gt;_ reopen terminal
        </button>
      </div>

      <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance">
        {{ t.hero.headline }}
        <span class="text-primary neon-text">{{ t.hero.headlineHighlight }}</span>
        {{ t.hero.headlineEnd }}
      </h1>

      <p class="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed text-pretty">
        {{ t.hero.subheadline }}
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <AppButton
          as="a"
          href="#projects"
          size="lg"
          class="font-mono bg-primary text-primary-foreground hover:bg-primary/90 neon-glow"
        >
          {{ t.hero.viewProjects }}
        </AppButton>
        <AppButton
          as="a"
          href="/cv.pdf"
          download="Samuele_Ruaro_CV.pdf"
          size="lg"
          variant="outline"
          class="font-mono border-border hover:border-primary hover:text-primary"
        >
          {{ t.hero.downloadCv }}
        </AppButton>
      </div>

      <SocialLinks icon-class="h-6 w-6" class="justify-center" />
    </div>
  </section>
</template>
