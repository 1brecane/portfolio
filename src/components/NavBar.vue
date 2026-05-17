<script setup>
import { ref, computed } from "vue";
import { Menu, X } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import LocaleToggle from "@/components/ui/LocaleToggle.vue";
import { useI18n } from "@/i18n";
import { useWindowScroll } from "@/composables/useWindowScroll";

const { t } = useI18n();

const navLinks = computed(() => [
  { href: "#hero", label: t.value.nav.home },
  { href: "#about", label: t.value.nav.about },
  { href: "#stack", label: t.value.nav.stack },
  { href: "#projects", label: t.value.nav.projects },
  { href: "#homelab", label: t.value.nav.homelab },
]);

const { scrollY } = useWindowScroll();
const isScrolled = computed(() => scrollY.value > 50);
const isMobileMenuOpen = ref(false);

const contactBtnClass = "font-mono text-sm border-primary text-primary hover:bg-primary hover:text-primary-foreground";
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
        <a href="#hero" class="flex-1 font-mono text-sm font-semibold tracking-tight group">
          <span class="text-primary group-hover:neon-text transition-all">SR</span>
          <span class="text-muted-foreground">.</span>
        </a>

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

        <div class="hidden md:flex flex-1 items-center justify-end gap-3">
          <LocaleToggle />
          <AppButton
            as="a"
            href="#contact"
            variant="outline"
            :class="contactBtnClass"
          >
            {{ t.nav.contact }}
          </AppButton>
        </div>

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
          <div class="flex flex-wrap items-center gap-3">
            <LocaleToggle />
            <AppButton
              as="a"
              href="#contact"
              variant="outline"
              :class="contactBtnClass"
              @click="isMobileMenuOpen = false"
            >
              {{ t.nav.contact }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
