<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Menu, X, Languages } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import { useI18n } from "@/i18n";

const { t, locale, toggleLocale } = useI18n();

// Dynamically compute navigation links based on current locale
const navLinks = computed(() => [
  { href: "#hero", label: t.value.nav.home },
  { href: "#about", label: t.value.nav.about },
  { href: "#stack", label: t.value.nav.stack },
  { href: "#projects", label: t.value.nav.projects },
  { href: "#homelab", label: t.value.nav.homelab },
  { href: "#contact", label: t.value.nav.contact },
]);

/** Applies glass background once the user scrolls past the hero fold */
const isScrolled = ref(false);
const isMobileMenuOpen = ref(false);

// Updates navigation bar styling based on scroll position
function handleScroll() {
  isScrolled.value = window.scrollY > 50;
}

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <nav
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isScrolled || isMobileMenuOpen ? 'glass border-b border-border' : 'bg-transparent',
    ]"
  >
    <div class="mx-auto max-w-6xl px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <a href="#hero" class="flex-1 font-mono text-sm font-semibold tracking-tight group">
          <span class="text-primary group-hover:neon-text transition-all">SR</span>
          <span class="text-muted-foreground">.</span>
        </a>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center gap-8">
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            class="font-mono text-sm text-muted-foreground hover:text-primary transition-colors relative group"
          >
            {{ link.label }}
            <span class="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
          </a>
        </div>

        <!-- Right side: lang toggle + contact -->
        <div class="hidden md:flex flex-1 items-center justify-end gap-3">
          <AppButton
            variant="ghost"
            size="icon"
            class="text-muted-foreground hover:text-primary"
            aria-label="Toggle language"
            @click="toggleLocale"
          >
            <Languages class="h-4 w-4" />
          </AppButton>
          <span class="font-mono text-xs text-muted-foreground uppercase">{{ locale }}</span>
          <AppButton
            as="a"
            href="#contact"
            variant="outline"
            class="font-mono text-sm border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {{ t.nav.contact }}
          </AppButton>
        </div>

        <!-- Mobile Menu Button -->
        <AppButton
          variant="ghost"
          size="icon"
          class="md:hidden"
          aria-label="Toggle menu"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <X v-if="isMobileMenuOpen" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </AppButton>
      </div>

      <!-- Mobile Menu -->
      <div v-if="isMobileMenuOpen" class="md:hidden mt-4 pb-4 border-t border-border pt-4">
        <div class="flex flex-col gap-4">
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            class="font-mono text-sm text-muted-foreground hover:text-primary transition-colors"
            @click="isMobileMenuOpen = false"
          >
            {{ link.label }}
          </a>
          <div class="flex items-center gap-3">
            <AppButton
              variant="ghost"
              size="icon"
              class="text-muted-foreground hover:text-primary"
              aria-label="Toggle language"
              @click="toggleLocale"
            >
              <Languages class="h-4 w-4" />
            </AppButton>
            <span class="font-mono text-xs text-muted-foreground uppercase">{{ locale }}</span>
          </div>
          <AppButton
            as="a"
            href="#contact"
            variant="outline"
            class="font-mono text-sm border-primary text-primary hover:bg-primary hover:text-primary-foreground w-fit"
          >
            {{ t.nav.contact }}
          </AppButton>
        </div>
      </div>
    </div>
  </nav>
</template>
