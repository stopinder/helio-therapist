<template>
  <section class="max-w-3xl mx-auto px-4 py-8 md:px-8 md:py-10" data-testid="schedule-appointment-workspace">
    <header class="mb-8">
      <p class="type-overline text-ink-muted">Scheduling</p>
      <h1 class="type-h1 text-ink mt-1">Schedule appointment</h1>
      <p class="type-body text-ink-secondary mt-2">Choose a client and create a secure Helios booking link to send to them.</p>
    </header>
    <div class="rounded-xl border border-border bg-surface p-5 md:p-6">
      <label for="schedule-client" class="block type-body-sm font-semibold text-ink mb-2">Client</label>
      <select id="schedule-client" v-model="clientId" :disabled="clientsLoading" class="w-full rounded-control border border-border bg-surface-elevated px-3 py-2.5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring">
        <option value="">{{ clientsLoading ? 'Loading clients…' : 'Choose a client' }}</option>
        <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
      </select>
      <p v-if="!clientsLoading && !clients.length && !error" class="type-body-sm text-ink-muted mt-3">Add an active client before scheduling an appointment.</p>
      <p v-if="error" class="type-body-sm text-state-danger mt-3" role="alert">{{ error }}</p>
      <div v-if="bookingUrl" class="mt-5 rounded-lg bg-surface-subtle border border-border-muted p-4" role="status">
        <p class="type-body-sm font-semibold text-ink">Helios booking link ready for {{ selectedClient?.name }}</p>
        <p class="type-body-sm text-ink-secondary mt-1">Send this private link to the client. It expires after 72 hours and stops working once the appointment is booked.</p>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" class="rounded-control bg-action-primary text-on-action px-4 py-2 type-body-sm font-semibold hover:bg-action-primary-hover" @click="copyBookingLink">{{ copied ? 'Copied' : 'Copy booking link' }}</button>
          <a :href="bookingUrl" target="_blank" rel="noopener" class="inline-flex justify-center rounded-control border border-border px-4 py-2 type-body-sm font-semibold text-ink-secondary">Preview page ↗</a>
        </div>
      </div>
      <div class="mt-6 flex items-center gap-3">
        <button type="button" class="rounded-control bg-action-primary text-on-action px-4 py-2.5 type-body-sm font-semibold hover:bg-action-primary-hover disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!clientId || loading" @click="createBookingLink">{{ loading ? 'Creating link…' : 'Create booking link' }}</button>
        <button v-if="bookingUrl" type="button" class="rounded-control border border-border px-4 py-2.5 type-body-sm text-ink-secondary" @click="reset">Clear</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import { listClients } from '../lib/clients.js'

const clients = ref([])
const clientsLoading = ref(true)
const clientId = ref('')
const loading = ref(false)
const error = ref('')
const bookingUrl = ref('')
const copied = ref(false)
const selectedClient = computed(() => clients.value.find(client => String(client.id) === String(clientId.value)) || null)

onMounted(async () => {
  try { clients.value = await listClients() }
  catch (cause) { error.value = cause.message || 'Unable to load clients' }
  finally { clientsLoading.value = false }
})

async function createBookingLink() {
  if (!clientId.value || loading.value) return
  loading.value = true
  error.value = ''
  bookingUrl.value = ''
  copied.value = false
  try {
    const response = await authenticatedFetch('/api/zoom/scheduler/create-booking-link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: clientId.value })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'Unable to create booking link')
    bookingUrl.value = payload.bookingUrl || ''
  } catch (cause) { error.value = cause.message || 'Unable to create booking link' }
  finally { loading.value = false }
}

async function copyBookingLink() {
  if (!bookingUrl.value) return
  try {
    await navigator.clipboard.writeText(bookingUrl.value)
    copied.value = true
  } catch {
    error.value = 'Unable to copy the link. Open the preview and copy the address from your browser.'
  }
}

function reset() {
  bookingUrl.value = ''
  copied.value = false
  error.value = ''
}
</script>
