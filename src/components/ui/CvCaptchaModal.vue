<script setup>
import { ref } from "vue";
import VueHcaptcha from "@hcaptcha/vue3-hcaptcha";
import { X } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import { useI18n } from "@/i18n";
import { HCAPTCHA_SITE_KEY } from "@/constants/captcha.js";

const { t } = useI18n();

const emit = defineEmits(["close"]);

const captchaRef = ref(null);
const captchaToken = ref("");
const verified = ref(false);
const downloading = ref(false);
const error = ref(false);

function onVerify(token) {
  captchaToken.value = token;
  verified.value = true;
  error.value = false;
}

function onExpired() {
  captchaToken.value = "";
  verified.value = false;
}

function onError() {
  captchaToken.value = "";
  verified.value = false;
  error.value = true;
}

async function download() {
  if (!captchaToken.value) return;
  downloading.value = true;
  error.value = false;

  try {
    const response = await fetch("/cv.pdf", {
      headers: { "X-Captcha-Token": captchaToken.value },
    });

    if (!response.ok) {
      error.value = true;
      captchaToken.value = "";
      verified.value = false;
      captchaRef.value?.reset();
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Samuele_Ruaro_CV.pdf";
    link.click();
    URL.revokeObjectURL(url);
    emit("close");
  } catch {
    error.value = true;
    captchaToken.value = "";
    verified.value = false;
    captchaRef.value?.reset();
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div class="relative w-full max-w-sm mx-4 bg-card border border-border rounded-xl shadow-2xl p-6 flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-mono text-xs text-muted-foreground mb-1">$ verify --human</p>
            <h2 class="text-base font-semibold text-foreground">{{ t.captcha.title }}</h2>
            <p class="text-sm text-muted-foreground mt-1">{{ t.captcha.subtitle }}</p>
          </div>
          <button
            class="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            @click="$emit('close')"
            :aria-label="t.captcha.close"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- hCaptcha widget -->
        <div class="flex justify-center">
          <VueHcaptcha
            ref="captchaRef"
            :sitekey="HCAPTCHA_SITE_KEY"
            theme="dark"
            @verify="onVerify"
            @expired="onExpired"
            @error="onError"
          />
        </div>

        <p v-if="error" class="text-xs text-destructive text-center">
          {{ t.captcha.error }}
        </p>

        <!-- Actions -->
        <AppButton
          :disabled="!verified || downloading"
          class="w-full font-mono"
          :class="verified && !downloading ? 'bg-primary text-primary-foreground hover:bg-primary/90 neon-glow' : 'opacity-50 cursor-not-allowed'"
          @click="verified && !downloading && download()"
        >
          {{ downloading ? t.captcha.downloading : t.captcha.confirm }}
        </AppButton>
      </div>
    </div>
  </Teleport>
</template>
