<template>
  <section class="border-t border-border-muted bg-surface-elevated">
    <div class="mx-auto grid w-full max-w-[1200px] gap-6 px-5 py-12 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
      <div>
        <p class="type-eyebrow text-action-link">Helios updates</p>
        <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Follow the product as it develops.</h2>
        <p class="mt-3 max-w-xl text-sm leading-6 text-ink-secondary">Get occasional Helios product updates, practical tips and news for therapists.</p>
      </div>

      <form class="space-y-3" @submit.prevent="subscribe">
        <div class="flex flex-col gap-3 sm:flex-row">
          <label class="sr-only" for="marketing-email">Email address</label>
          <input
            id="marketing-email"
            v-model.trim="email"
            type="email"
            name="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
            class="min-h-12 flex-1 rounded-panel border border-border bg-surface px-3 text-ink outline-none focus:border-action-link focus:ring-2 focus:ring-state-selected"
          />
          <button
            type="submit"
            :disabled="submitting"
            class="min-h-12 rounded-control bg-action-primary px-5 text-sm font-semibold text-on-action hover:bg-action-primary-hover disabled:opacity-50"
          >
            {{ submitting ? 'Joining…' : 'Keep me updated' }}
          </button>
        </div>

        <label class="flex items-start gap-3 text-xs leading-5 text-ink-muted">
          <input v-model="consent" type="checkbox" required class="mt-0.5 h-4 w-4 rounded border-border text-action-link focus:ring-action-link" />
          <span>I agree to receive occasional Helios marketing emails. I can unsubscribe at any time. See the <router-link to="/privacy" class="font-medium text-action-link underline underline-offset-2">Privacy Notice</router-link>.</span>
        </label>

        <p v-if="message" class="text-sm text-state-success" role="status">{{ message }}</p>
        <p v-if="errorMessage" class="text-sm text-state-danger" role="alert">{{ errorMessage }}</p>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const consent = ref(false)
const submitting = ref(false)
const message = ref('')
const errorMessage = ref('')

async function subscribe() {
  message.value = ''
  errorMessage.value = ''
  if (!consent.value) {
    errorMessage.value = 'Please confirm that you want to receive Helios marketing emails.'
    return
  }

  submitting.value = true
  try {
    const response = await fetch('/api/marketing/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, consent: true, source: 'landing' })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Unable to subscribe right now.')

    message.value = 'Thanks — you’re on the Helios updates list.'
    email.value = ''
    consent.value = false
  } catch (error) {
    errorMessage.value = error.message || 'Unable to subscribe right now.'
  } finally {
    submitting.value = false
  }
}
</script>
