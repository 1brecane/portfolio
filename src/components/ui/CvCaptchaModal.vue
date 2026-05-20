<script setup>
import { ref } from "vue";
import VueHcaptcha from "@hcaptcha/vue3-hcaptcha";
import { X } from "lucide-vue-next";
import AppButton from "@/components/ui/AppButton.vue";
import { useI18n } from "@/i18n";

const { t } = useI18n();

const emit = defineEmits(["close"]);

const sitekey =
  import.meta.env.VITE_HCAPTCHA_SITE_KEY ||
  "10000000-ffff-ffff-ffff-000000000001";

const captchaRef = ref(null);
const verified = ref(false);
const error = ref(false);

function onVerify() {
  verified.value = true;
  error.value = false;
}

function onExpired() {
  verified.value = false;
}

function onError() {
  verified.value = false;
  error.value = true;
}

function download() {
  const link = document.createElement("a");
  link.href = "/cv.pdf";
  link.download = "Samuele_Ruaro_CV.pdf";
  link.click();
  emit("close");
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
            :sitekey="sitekey"
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
          :disabled="!verified"
          class="w-full font-mono"
          :class="verified ? 'bg-primary text-primary-foreground hover:bg-primary/90 neon-glow' : 'opacity-50 cursor-not-allowed'"
          @click="verified && download()"
        >
          {{ t.captcha.confirm }}
        </AppButton>
      </div>
    </div>
  </Teleport>
</template>
