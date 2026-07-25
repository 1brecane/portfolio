<script setup>
import { ref, reactive, computed } from "vue";
import VueHcaptcha from "@hcaptcha/vue3-hcaptcha";
import AppButton from "@/components/ui/AppButton.vue";
import SectionLayout from "@/components/ui/SectionLayout.vue";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-vue-next";
import { useI18n } from "@/i18n";
import { HCAPTCHA_SITE_KEY } from "@/constants/captcha.js";
import { API_BASE_URL } from "@/constants/api.js";

const { t } = useI18n();

const form = ref({
  name: "",
  email: "",
  message: "",
});

const status = ref("idle"); // 'idle' | 'loading' | 'success' | 'error'
const captchaToken = ref("");
const captchaRef = ref(null);

// ── Inline validation ────────────────────────────────────────────────────────
// A field's error only shows once it's been touched (blurred) or after a submit
// attempt, so the form doesn't shout at the user before they've typed anything.
const touched = reactive({ name: false, email: false, message: false });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const errors = computed(() => ({
  name: !form.value.name.trim() ? t.value.contact.validation.nameRequired : "",
  email: !form.value.email.trim()
    ? t.value.contact.validation.emailRequired
    : !EMAIL_RE.test(form.value.email.trim())
      ? t.value.contact.validation.emailInvalid
      : "",
  message: !form.value.message.trim() ? t.value.contact.validation.messageRequired : "",
}));

const isValid = computed(() => !errors.value.name && !errors.value.email && !errors.value.message);
const showError = (field) => touched[field] && !!errors.value[field];

const sendEmail = async () => {
  // Surface any field errors on submit, then bail if the form or captcha isn't ready.
  touched.name = touched.email = touched.message = true;
  if (!isValid.value || !captchaToken.value) return;

  status.value = "loading";

  try {
    const response = await fetch(`${API_BASE_URL}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.value.name,
        email: form.value.email,
        message: form.value.message,
        captcha_token: captchaToken.value,
      }),
    });

    if (!response.ok) {
      throw new Error(`contact request failed with status ${response.status}`);
    }

    status.value = "success";
    form.value = { name: "", email: "", message: "" };
    touched.name = touched.email = touched.message = false;
    captchaToken.value = "";
    captchaRef.value?.reset();

    setTimeout(() => {
      status.value = "idle";
    }, 5000);
  } catch (error) {
    console.error("FAILED...", error);
    status.value = "error";
    captchaToken.value = "";
    captchaRef.value?.reset();
  }
};
</script>

<template>
  <SectionLayout id="contact" :title="t.contact.title" :subtitle="t.contact.subtitle">
    <div class="present-step max-w-2xl mx-auto" :style="{ '--step': 0 }">
      <div class="glass-panel rounded-xl p-6 md:p-8 card-glow">
        <div
          v-if="status === 'success'"
          role="status"
          aria-live="polite"
          class="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300"
        >
          <div
            class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary"
          >
            <CheckCircle class="w-8 h-8" />
          </div>
          <h3 class="text-2xl font-bold mb-2">{{ t.contact.successTitle }}</h3>
          <p class="text-muted-foreground">{{ t.contact.successMessage }}</p>
          <AppButton variant="outline" class="mt-6" @click="status = 'idle'">
            {{ t.contact.sendAnother }}
          </AppButton>
        </div>

        <form v-else class="space-y-6" @submit.prevent="sendEmail">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label for="name" class="text-sm font-medium text-foreground">{{
                t.contact.nameLabel
              }}</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                required
                class="form-input"
                :class="{ 'form-input--invalid': showError('name') }"
                :placeholder="t.contact.namePlaceholder"
                :disabled="status === 'loading'"
                :aria-invalid="showError('name')"
                :aria-describedby="showError('name') ? 'name-error' : undefined"
                @blur="touched.name = true"
              />
              <p v-if="showError('name')" id="name-error" class="text-xs text-destructive">
                {{ errors.name }}
              </p>
            </div>
            <div class="space-y-2">
              <label for="email" class="text-sm font-medium text-foreground">{{
                t.contact.emailLabel
              }}</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                class="form-input"
                :class="{ 'form-input--invalid': showError('email') }"
                :placeholder="t.contact.emailPlaceholder"
                :disabled="status === 'loading'"
                :aria-invalid="showError('email')"
                :aria-describedby="showError('email') ? 'email-error' : undefined"
                @blur="touched.email = true"
              />
              <p v-if="showError('email')" id="email-error" class="text-xs text-destructive">
                {{ errors.email }}
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <label for="message" class="text-sm font-medium text-foreground">{{
              t.contact.messageLabel
            }}</label>
            <textarea
              id="message"
              v-model="form.message"
              required
              rows="5"
              class="form-input resize-none"
              :class="{ 'form-input--invalid': showError('message') }"
              :placeholder="t.contact.messagePlaceholder"
              :disabled="status === 'loading'"
              :aria-invalid="showError('message')"
              :aria-describedby="showError('message') ? 'message-error' : undefined"
              @blur="touched.message = true"
            ></textarea>
            <p v-if="showError('message')" id="message-error" class="text-xs text-destructive">
              {{ errors.message }}
            </p>
          </div>

          <div
            v-if="status === 'error'"
            role="alert"
            aria-live="assertive"
            class="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md"
          >
            <AlertCircle class="w-4 h-4" />
            <p>{{ t.contact.errorMessage }}</p>
          </div>

          <div class="space-y-2">
            <p v-if="!captchaToken" id="captcha-hint" class="text-xs text-muted-foreground">
              {{ t.contact.captchaHint }}
            </p>
            <VueHcaptcha
              ref="captchaRef"
              :sitekey="HCAPTCHA_SITE_KEY"
              theme="dark"
              @verify="(token) => (captchaToken = token)"
              @expired="captchaToken = ''"
              @error="captchaToken = ''"
            />
          </div>

          <AppButton
            type="submit"
            class="w-full sm:w-auto font-mono bg-primary text-primary-foreground hover:bg-primary/90 neon-cta"
            :disabled="status === 'loading' || !captchaToken"
            :aria-describedby="!captchaToken ? 'captcha-hint' : undefined"
          >
            <template v-if="status === 'loading'">
              <Loader2 class="w-4 h-4 mr-2 animate-spin" />
              {{ t.contact.sending }}
            </template>
            <template v-else>
              <Send class="w-4 h-4 mr-2" />
              {{ t.contact.sendButton }}
            </template>
          </AppButton>
        </form>
      </div>
    </div>
  </SectionLayout>
</template>
