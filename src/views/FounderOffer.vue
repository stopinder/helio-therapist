<template>
  <main class="min-h-screen bg-surface px-4 py-12">
    <section class="mx-auto max-w-2xl rounded-panel border border-border-muted bg-surface-elevated p-6 sm:p-8">
      <p class="text-overline uppercase tracking-wider text-ink-muted">Founding subscriber</p>
      <h1 class="mt-2 text-h2 font-semibold text-ink">Stay with Helios from here</h1>
      <p class="mt-3 text-body text-ink-secondary">
        If you already know Helios is useful to your practice, you can end your free trial and become a founding subscriber today.
      </p>

      <div class="mt-6 rounded-panel bg-surface-subtle p-5">
        <h2 class="text-body font-semibold text-ink">What founding subscribers get</h2>
        <ul class="mt-3 space-y-2 text-body-sm text-ink-secondary">
          <li>• Updates on new features, improvements and where Helios is heading.</li>
          <li>• Opportunities to give direct feedback and help shape what gets built next.</li>
          <li>• Early access to selected improvements as Helios develops.</li>
          <li>• Price protection on the £29 monthly rate for 24 months.</li>
        </ul>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <div class="rounded-panel border border-border-muted p-5">
          <p class="text-body-sm font-medium text-ink-muted">Monthly</p>
          <p class="mt-2 text-h2 font-semibold text-ink">£29<span class="text-body font-normal text-ink-muted">/month</span></p>
          <p class="mt-2 text-body-sm text-ink-secondary">Your free trial ends and your first £29 payment is taken today.</p>
          <button
            type="button"
            :disabled="busy"
            class="mt-5 min-h-touch w-full rounded-control bg-action-link px-4 py-2 font-medium text-on-action disabled:opacity-50"
            @click="acceptOffer('monthly')"
          >
            {{ busyPlan === 'monthly' ? 'Starting…' : 'Subscribe monthly — £29' }}
          </button>
        </div>

        <div class="rounded-panel border border-border-muted p-5">
          <p class="text-body-sm font-medium text-ink-muted">Annual</p>
          <p class="mt-2 text-h2 font-semibold text-ink">£290<span class="text-body font-normal text-ink-muted">/year</span></p>
          <p class="mt-2 text-body-sm text-ink-secondary">Pay a year upfront and save £58 compared with twelve monthly payments.</p>
          <button
            type="button"
            :disabled="busy"
            class="mt-5 min-h-touch w-full rounded-control bg-action-link px-4 py-2 font-medium text-on-action disabled:opacity-50"
            @click="acceptOffer('annual')"
          >
            {{ busyPlan === 'annual' ? 'Starting…' : 'Pay annually — £290' }}
          </button>
        </div>
      </div>

      <p class="mt-5 text-body-sm text-ink-muted">
        You can also keep using the remainder of your 7-day free trial. If you do nothing, your existing subscription continues at £29/month when the trial ends.
      </p>

      <p v-if="message" role="status" class="mt-4 text-body-sm text-state-success">{{ message }}</p>
      <p v-if="errorMessage" role="alert" class="mt-4 text-body-sm text-state-danger">{{ errorMessage }}</p>

      <router-link to="/overview" class="mt-6 inline-block text-body-sm font-medium text-action-link">
        Back to Helios
      </router-link>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

const busy = ref(false)
const busyPlan = ref('')
const message = ref('')
const errorMessage = ref('')

async function acceptOffer(plan) {
  busy.value = true
  busyPlan.value = plan
  message.value = ''
  errorMessage.value = ''

  try {
    const response = await authenticatedFetch('/api/billing/founder-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    })
    const data = await response.json()
    if (!response.ok || !data.accepted) throw new Error(data.error || 'Unable to start the subscription')

    if (data.paymentUrl) {
      window.location.assign(data.paymentUrl)
      return
    }

    message.value = plan === 'annual'
      ? 'You’re now a founding subscriber on the £290 annual plan.'
      : 'You’re now a founding subscriber at £29/month, with the £29 monthly price protected for 24 months.'
  } catch (error) {
    errorMessage.value = error.message || 'Unable to start the subscription.'
  } finally {
    busy.value = false
    busyPlan.value = ''
  }
}
</script>
