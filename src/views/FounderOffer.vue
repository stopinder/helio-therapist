<template>
  <main class="min-h-screen bg-surface px-4 py-12">
    <section class="mx-auto max-w-xl rounded-panel border border-border-muted bg-surface-elevated p-6 sm:p-8">
      <p class="text-overline uppercase tracking-wider text-ink-muted">Founder offer</p>
      <h1 class="mt-2 text-h2 font-semibold text-ink">Lock in £24.99/month</h1>
      <p class="mt-3 text-body text-ink-secondary">
        Keep your 30-day free trial. After the trial, pay £24.99/month for your first 12 paid months.
        After that, Helios returns to the standard £29/month.
      </p>

      <div class="mt-6 rounded-panel bg-surface-subtle p-4 text-body-sm text-ink-secondary">
        Nothing is charged today. Your existing trial end date stays exactly as it is.
      </div>

      <button
        type="button"
        :disabled="busy || accepted"
        class="mt-6 min-h-touch w-full rounded-control bg-action-link px-4 py-2 font-medium text-on-action disabled:opacity-50"
        @click="acceptOffer"
      >
        {{ accepted ? 'Founder rate locked in' : busy ? 'Applying offer…' : 'Lock in £24.99/month' }}
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
    message.value = 'Your founder rate is locked in: £24.99/month for your first 12 paid months after the free trial, then £29/month.'
  } catch (error) {
    errorMessage.value = error.message || 'Unable to apply the founder offer.'
  } finally {
    busy.value = false
  }
}
</script>
