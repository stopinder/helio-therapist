<template>
  <section class="max-w-3xl mx-auto px-4 py-8 md:px-8 md:py-10" data-testid="schedule-appointment-workspace">
    <header class="mb-8"><p class="type-overline text-ink-muted">Scheduling</p><h1 class="type-h1 text-ink mt-1">Schedule appointment</h1><p class="type-body text-ink-secondary mt-2">Choose a client, then decide who should choose the appointment time.</p></header>
    <div class="rounded-xl border border-border bg-surface p-5 md:p-6">
      <label for="schedule-client" class="block type-body-sm font-semibold text-ink mb-2">Client</label>
      <select id="schedule-client" v-model="clientId" :disabled="clientsLoading" class="w-full rounded-control border border-border bg-surface-elevated px-3 py-2.5 text-ink"><option value="">{{ clientsLoading ? 'Loading clients…' : 'Choose a client' }}</option><option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option></select>
      <p v-if="!clientsLoading && !clients.length && !error" class="type-body-sm text-ink-muted mt-3">Add an active client before scheduling an appointment.</p><p v-if="error" class="type-body-sm text-state-danger mt-3" role="alert">{{ error }}</p>
      <div v-if="clientId && !bookingUrl" class="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" class="rounded-xl border border-border p-4 text-left hover:border-action-link disabled:opacity-50" :disabled="loading" @click="createBookingLink('client')"><span class="block type-body-sm font-semibold text-ink">Let client choose</span><span class="block type-body-sm text-ink-secondary mt-1">Create a private Helios link for the client to choose an available time.</span></button>
        <button type="button" class="rounded-xl border border-border p-4 text-left hover:border-action-link disabled:opacity-50" :disabled="loading" @click="createBookingLink('therapist')"><span class="block type-body-sm font-semibold text-ink">Choose time myself</span><span class="block type-body-sm text-ink-secondary mt-1">Go straight to the Zoom Scheduler time picker and choose the slot for the client.</span></button>
      </div>
      <p v-if="loading" class="type-body-sm text-ink-muted mt-4">Preparing scheduling…</p>
      <div v-if="bookingUrl && mode === 'client'" class="mt-5 rounded-lg bg-surface-subtle border border-border-muted p-4" role="status">
        <p class="type-body-sm font-semibold text-ink">Helios booking link ready for {{ selectedClient?.name }}</p>
        <p class="type-body-sm text-ink-secondary mt-1">It expires after 72 hours and stops working once the appointment is booked.</p>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a v-if="emailBookingHref" :href="emailBookingHref" class="inline-flex justify-center rounded-control bg-action-primary text-on-action px-4 py-2 type-body-sm font-semibold">Email booking link</a>
          <button type="button" class="rounded-control border border-border px-4 py-2 type-body-sm font-semibold text-ink-secondary" @click="copyBookingLink">{{ copied ? 'Copied' : 'Copy booking link' }}</button>
          <a :href="bookingUrl" target="_blank" rel="noopener" class="inline-flex justify-center rounded-control border border-border px-4 py-2 type-body-sm font-semibold text-ink-secondary">Preview client page ↗</a>
        </div>
        <p v-if="!selectedClient?.email" class="type-caption text-ink-muted mt-3">No email address is saved for this client. Copy the link and send it using your usual contact method.</p>
        <button type="button" class="mt-4 type-body-sm text-ink-secondary underline" @click="reset">Choose a different option</button>
      </div>
    </div>
  </section>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authenticatedFetch } from '../lib/api.js'
import { listClients } from '../lib/clients.js'
const route=useRoute()
const clients=ref([]),clientsLoading=ref(true),clientId=ref(''),loading=ref(false),error=ref(''),bookingUrl=ref(''),copied=ref(false),mode=ref('client')
const selectedClient=computed(()=>clients.value.find(client=>String(client.id)===String(clientId.value))||null)
const emailBookingHref=computed(()=>{const email=selectedClient.value?.email?.trim();if(!email||!bookingUrl.value)return'';const subject='Appointment booking link';const body=`Hello ${selectedClient.value?.name || ''},\n\nPlease use this secure Helios link to choose a suitable appointment time:\n\n${bookingUrl.value}\n\nThis link expires after 72 hours.`;return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`})
onMounted(async()=>{try{clients.value=await listClients();const requestedClientId=typeof route.query.clientId==='string'?route.query.clientId:'';if(requestedClientId&&clients.value.some(client=>String(client.id)===requestedClientId))clientId.value=requestedClientId}catch(cause){error.value=cause.message||'Unable to load clients'}finally{clientsLoading.value=false}})
async function createBookingLink(nextMode){if(!clientId.value||loading.value)return;mode.value=nextMode;loading.value=true;error.value='';bookingUrl.value='';copied.value=false;try{const response=await authenticatedFetch('/api/zoom/scheduler/create-booking-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:clientId.value})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Unable to create booking link');if(nextMode==='therapist'){if(!payload.therapistBookingUrl)throw new Error('Zoom did not return a therapist scheduling link');window.location.assign(payload.therapistBookingUrl);return}bookingUrl.value=payload.bookingUrl||''}catch(cause){error.value=cause.message||'Unable to create booking link'}finally{loading.value=false}}
async function copyBookingLink(){if(!bookingUrl.value)return;try{await navigator.clipboard.writeText(bookingUrl.value);copied.value=true}catch{error.value='Unable to copy the link. Open the preview and copy the address from your browser.'}}
function reset(){bookingUrl.value='';copied.value=false;error.value=''}
</script>
