import { ref, computed, watchEffect } from "vue";
import en from "./en.js";
import it from "./it.js";

const messages = { it, en };

/**
 * Persisted in localStorage so the preference survives page reloads.
 * Shared across all components via module-level ref (singleton pattern).
 */
const VALID_LOCALES = ["en", "it"];
const stored = localStorage.getItem("locale");
const currentLocale = ref(VALID_LOCALES.includes(stored) ? stored : "it");

/** Keeps <html lang> in sync with the active locale */
watchEffect(() => {
  document.documentElement.lang = currentLocale.value;
});

export function useI18n() {
  const locale = currentLocale;

  const t = computed(() => messages[locale.value]);

  function setLocale(l) {
    locale.value = l;
    localStorage.setItem("locale", l);
  }

  return { locale, t, setLocale };
}
