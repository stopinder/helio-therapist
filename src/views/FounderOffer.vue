<template>
  <main class="min-h-screen bg-surface px-4 py-12">
    <section class="mx-auto max-w-xl rounded-panel border border-border-muted bg-surface-elevated p-6 sm:p-8">
      <p class="text-overline uppercase tracking-wider text-ink-muted">Founder offer</p>
      <h1 class="mt-2 text-h2 font-semibold text-ink">Become a founding subscriber</h1>
      <p class="mt-3 text-body text-ink-secondary">
        Subscribe today for £24/month for your first 12 paid months. Your free trial ends when you subscribe,
        and your first £24 payment is taken today. After 12 paid months, Helios returns to the standard £29/month.
      </p>

      <div class="mt-6 rounded-panel bg-surface-subtle p-4 text-body-sm text-ink-secondary">
        You will be charged £24 today. This becomes month 1 of your 12-month founder rate.
      </div>

      <button
        type="button"
        :disabled="busy || accepted"
        class="mt-6 min-h-touch w-full rounded-control bg-action-link px-4 py-2 font-medium text-on-action disabled:opacity-50"
        @click="acceptOffer"
      >
        {{ accepted ? 'Founder rate locked in' : busy ? 'Applying offer…' : 'Subscribe today — £24' }}
      </button>

      <p v-if="message" role="status" class="mt-4 text-body-sm text-state-success">{{ message }}</p>
      <p v-if="errorMessage" role="alert" class="mt-4 text-body-sm text-state-danger">{{ errorMessage }}</p>

      <router-link to="/settings" class="mt-6 inline-block text-body-sm font-medium text-action-link">
        Back to Settings
      </router-link>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

const busy = ref(false)
const accepted = ref(false)
const message = ref('')
const errorMessage = ref('')

async function acceptOffer() {
  busy.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await authenticatedFetch('/api/billing/founder-offer', { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.accepted) throw new Error(data.error || 'Unable to apply the founder offer')

    accepted.value = true
    message.value = 'You’re now a founding subscriber. £24 has been charged today, with £24/month for your first 12 paid months, then £29/month.'
  } catch (error) {
    errorMessage.value = error.message || 'Unable to apply the founder offer.'
  } finally {
    busy.value = false
  }
}
</script>
