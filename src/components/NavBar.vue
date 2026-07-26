<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { Menu, X } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import LocaleToggle from "@/components/ui/LocaleToggle.vue";
import JourneyModeToggle from "@/components/ui/JourneyModeToggle.vue";
import { useI18n } from "@/i18n";
import { useWindowScroll } from "@/composables/useWindowScroll";
import { scrollToZone } from "@/composables/useJourneyScroll";
import { vScramble } from "@/directives/scramble";

const { t } = useI18n();

// Index of the section currently held by the journey camera (from useGalaxyJourney,
// same ZONES order). Used to light up the matching nav link. Contact is the last
// zone (index = navLinks.length) and is the CTA button rather than a nav link.
const props = defineProps({
  activeIndex: { type: Number, default: 0 },
});

// Anchor jumps must land on a *revealed* slide, not the un-revealed top of the
// pinned track — scrollToZone() computes the right offset (see useJourneyScroll).
function go(href) {
  scrollToZone(href.replace("#", ""));
}
function onMobileLink(href) {
  closeMobileMenu();
  go(href);
}

// nav links map 1:1 onto journey zones 0..4 (hero, about, stack, projects, homelab);
// Contact is zone 5 (the CTA button).
const navLinks = computed(() => [
  { href: "#hero", label: t.value.nav.home },
  { href: "#about", label: t.value.nav.about },
  { href: "#stack", label: t.value.nav.stack },
  { href: "#projects", label: t.value.nav.projects },
  { href: "#homelab", label: t.value.nav.homelab },
]);
const contactActive = computed(() => props.activeIndex >= navLinks.value.length);

const { scrollY } = useWindowScroll();
const isScrolled = computed(() => scrollY.value > 50);

// ── Mobile menu (Escape to close, click-outside backdrop, focus management) ──────
const isMobileMenuOpen = ref(false);
const toggleBtnRef = ref(null);
const mobileMenuRef = ref(null);

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

function onKeydown(e) {
  if (e.key === "Escape") closeMobileMenu();
}

watch(isMobileMenuOpen, async (open) => {
  if (open) {
    window.addEventListener("keydown", onKeydown);
    await nextTick();
    // Move focus into the panel so keyboard users land on the menu, not behind it.
    mobileMenuRef.value?.querySelector("a, button")?.focus();
  } else {
    window.removeEventListener("keydown", onKeydown);
    // Return focus to the toggle that opened it.
    (toggleBtnRef.value?.$el ?? toggleBtnRef.value)?.focus?.();
  }
});

onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

const contactBtnClass =
  "font-mono text-sm border-primary text-primary hover:bg-primary hover:text-primary-foreground neon-cta";
</script>

<template>
  <nav
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-auto',
      isScrolled || isMobileMenuOpen ? 'glass border-b border-border' : 'bg-transparent',
    ]"
  >
    <div class="mx-auto max-w-6xl px-6 py-4">
      <div class="flex items-center justify-between">
        <a
          href="#hero"
          class="flex-1 font-mono text-sm font-semibold tracking-tight group"
          @click.prevent="go('#hero')"
        >
          <span class="text-primary group-hover:neon-text transition-all">
            <span class="md:hidden">SR</span>
            <span class="hidden md:inline">Samuele Ruaro</span>
          </span>
          <span class="text-muted-foreground">.</span>
        </a>

        <div class="hidden md:flex items-center gap-8">
          <a
            v-for="(link, i) in navLinks"
            :key="link.href"
            :href="link.href"
            class="font-mono text-sm transition-colors relative group"
            :class="i === activeIndex ? 'text-primary' : 'text-muted-foreground hover:text-primary'"
            :aria-current="i === activeIndex ? 'page' : undefined"
            @click.prevent="go(link.href)"
          >
            <span v-scramble>{{ link.label }}</span>
            <span
              class="absolute -bottom-1 left-0 h-0.5 bg-primary transition-all"
              :class="i === activeIndex ? 'w-full' : 'w-0 group-hover:w-full'"
            />
          </a>
        </div>

        <div class="hidden md:flex flex-1 items-center justify-end gap-3">
          <JourneyModeToggle />
          <LocaleToggle />
          <AppButton
            as="a"
            href="#contact"
            variant="outline"
            :class="contactBtnClass"
            :aria-current="contactActive ? 'page' : undefined"
            @click.prevent="go('#contact')"
          >
            {{ t.nav.contact }}
          </AppButton>
        </div>

        <AppButton
          ref="toggleBtnRef"
          variant="ghost"
          size="icon"
          class="md:hidden"
          :aria-label="t.a11y.toggleMenu"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="mobile-menu"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <X v-if="isMobileMenuOpen" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </AppButton>
      </div>

      <div
        v-if="isMobileMenuOpen"
        id="mobile-menu"
        ref="mobileMenuRef"
        class="md:hidden mt-4 pb-4 border-t border-border pt-4"
      >
        <div class="flex flex-col gap-4">
          <a
            v-for="(link, i) in navLinks"
            :key="link.href"
            :href="link.href"
            class="font-mono text-sm transition-colors"
            :class="i === activeIndex ? 'text-primary' : 'text-muted-foreground hover:text-primary'"
            :aria-current="i === activeIndex ? 'page' : undefined"
            @click.prevent="onMobileLink(link.href)"
          >
            {{ link.label }}
          </a>
          <!-- No JourneyModeToggle here: below 768px the journey is already
               flattened by the responsive CSS, so the toggle would be a no-op. -->
          <div class="flex flex-wrap items-center gap-3">
            <LocaleToggle />
            <AppButton
              as="a"
              href="#contact"
              variant="outline"
              :class="contactBtnClass"
              @click.prevent="onMobileLink('#contact')"
            >
              {{ t.nav.contact }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- Click-outside backdrop: transparent, below the nav (z-40 < z-50) so the open
       panel stays clickable while a tap anywhere else closes the menu. -->
  <div
    v-if="isMobileMenuOpen"
    class="fixed inset-0 z-40 md:hidden pointer-events-auto"
    aria-hidden="true"
    @click="closeMobileMenu"
  />
</template>
