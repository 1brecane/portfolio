<script setup>
import { computed, inject, ref } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
});

// Slide progress from the enclosing JourneyPresentation. Defaults to 1 when
// absent (flat view fallback still provides it, but a header outside any journey
// track — or reduced motion forcing progress=1 — shows the plain title).
const progress = inject("presentProgress", ref(1));

// Same glyph language as the galaxy field (" .·+*" plus denser HUD noise).
const GLYPHS = ".·+*#@%&";

// Deterministic per-(char, frame) glyph — no rAF, no timers: the flicker comes
// from scroll itself (progress changes between frames) and costs zero at rest.
function glyphFor(i, frame) {
  const h = Math.imul(i + 1, 374761393) ^ Math.imul(frame + 1, 668265263);
  return GLYPHS[Math.abs(h) % GLYPHS.length];
}

const decoded = computed(() => {
  const text = props.title;
  // --reveal finishes at present 0.62 (globals.css); the title fully resolves by
  // half the reveal, before the content cards finish staging in.
  const reveal = Math.min(1, Math.max(0, progress.value / 0.62));
  const titleReveal = Math.min(1, reveal / 0.5);
  if (titleReveal >= 1) return text;
  const solved = Math.floor(titleReveal * text.length);
  const frame = Math.round(progress.value * 120); // quantized → stable per frame
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += i < solved || ch === " " ? ch : glyphFor(i, frame);
  }
  return out;
});
</script>

<template>
  <!-- The header is a `present-step` (step 0) like the section's content, so the
       title reveals and RECEDES with the journey. While the slide reveals, the
       title "decodes" from galaxy glyphs (decoded ≡ title once revealed; the real
       title stays in the sr-only span for SEO/screen readers). -->
  <div
    class="section-header-legible present-step text-center mb-16"
    :style="{ '--step': 0 }"
  >
    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
      <span class="sr-only">{{ title }}</span>
      <span aria-hidden="true">{{ decoded }}</span>
    </h2>
    <p class="text-foreground/75 max-w-xl mx-auto leading-relaxed">
      {{ subtitle }}
    </p>
  </div>
</template>
