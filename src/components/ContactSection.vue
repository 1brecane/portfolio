<script setup>
import { ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import SectionLayout from '@/components/ui/SectionLayout.vue';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-vue-next';
import { useI18n } from '@/i18n';

const { t } = useI18n();

const form = ref({
  name: '',
  email: '',
  message: ''
});

const status = ref('idle'); // 'idle' | 'loading' | 'success' | 'error'

const sendEmail = async () => {
  if (!form.value.name || !form.value.email || !form.value.message) return;

  status.value = 'loading';

  try {
    const { default: emailjs } = await import('@emailjs/browser');
    await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      {
        from_name: form.value.name,
        reply_to: form.value.email,
        message: form.value.message,
      },
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    );

    status.value = 'success';
    form.value = { name: '', email: '', message: '' };
    
    // Reset success message after 5 seconds
    setTimeout(() => {
      status.value = 'idle';
    }, 5000);
  } catch (error) {
    console.error('FAILED...', error);
    status.value = 'error';
  }
};
</script>

<template>
  <SectionLayout id="contact" :title="t.contact.title" :subtitle="t.contact.subtitle">
    <div class="max-w-2xl mx-auto">
      <div class="bg-card/50 border border-border rounded-xl p-6 md:p-8 backdrop-blur-sm card-glow">
        
        <div v-if="status === 'success'" class="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
          <div class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary">
            <CheckCircle class="w-8 h-8" />
          </div>
          <h3 class="text-2xl font-bold mb-2">{{ t.contact.successTitle }}</h3>
          <p class="text-muted-foreground">{{ t.contact.successMessage }}</p>
          <AppButton @click="status = 'idle'" variant="outline" class="mt-6">
            {{ t.contact.sendAnother }}
          </AppButton>
        </div>

        <form v-else @submit.prevent="sendEmail" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label for="name" class="text-sm font-medium text-foreground">{{ t.contact.nameLabel }}</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                required
                class="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                :placeholder="t.contact.namePlaceholder"
                :disabled="status === 'loading'"
              />
            </div>
            <div class="space-y-2">
              <label for="email" class="text-sm font-medium text-foreground">{{ t.contact.emailLabel }}</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                class="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                :placeholder="t.contact.emailPlaceholder"
                :disabled="status === 'loading'"
              />
            </div>
          </div>
          
          <div class="space-y-2">
            <label for="message" class="text-sm font-medium text-foreground">{{ t.contact.messageLabel }}</label>
            <textarea
              id="message"
              v-model="form.message"
              required
              rows="5"
              class="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              :placeholder="t.contact.messagePlaceholder"
              :disabled="status === 'loading'"
            ></textarea>
          </div>

          <div v-if="status === 'error'" class="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
            <AlertCircle class="w-4 h-4" />
            <p>{{ t.contact.errorMessage }}</p>
          </div>

          <AppButton
            type="submit"
            class="w-full sm:w-auto font-mono bg-primary text-primary-foreground hover:bg-primary/90"
            :disabled="status === 'loading'"
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
