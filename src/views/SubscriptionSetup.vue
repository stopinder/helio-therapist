<template>
  <main class="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-8 sm:p-6">
    <section class="w-full max-w-md rounded-panel bg-surface-elevated border border-border-muted p-6 sm:p-8">
      <h1 class="text-h1 font-semibold text-ink">Start your Helios trial</h1>
      <p class="mt-3 text-body text-ink-muted">30 days free, then £29/month. Cancel anytime.</p>
      <p class="mt-2 text-body-sm text-ink-subtle">Add your payment method with Stripe to activate your therapist workspace. You won’t be charged until the 30-day trial ends.</p>
      <button type="button" :disabled="busy" class="mt-6 min-h-12 w-full rounded-panel bg-action-link px-4 font-medium text-on-action disabled:opacity-50" @click="startTrial">
        {{ busy ? 'Opening secure checkout…' : 'Start 30-day free trial' }}
      </button>
      <p v-if="errorMessage" role="alert" class="mt-4 rounded-panel bg-state-danger-surface p-3 text-body text-state-danger">{{ errorMessage }}</p>
      <button type="button" class="mt-4 min-h-11 w-full text-body font-medium text-action-link" @click="signOut">Sign out</button>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

const busy = ref(false)
const errorMessage = ref('')

async function startTrial() {
  busy.value = true
  errorMessage.value = ''
  try {
    const response = await authenticatedFetch('/api/billing/checkout', { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.url) throw new Error(data.error || 'Unable to start checkout')
    window.location.href = data.url
  } catch (error) {
    errorMessage.value = error.message || 'Unable to start checkout.'
    busy.value = false
  }
}

async function signOut() {
  await supabase.auth.signOut()
  window.location.href = '/sign-in'
}
</script>
