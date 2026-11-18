<template>
  <section class="max-w-3xl mx-auto px-4 py-8 md:px-8 md:py-10" data-testid="schedule-appointment-workspace">
    <header class="mb-8"><p class="type-overline text-ink-muted">Scheduling</p><h1 class="type-h1 text-ink mt-1">Schedule appointment</h1><p class="type-body text-ink-secondary mt-2">Share your public booking page with someone new, or choose a client to create a booking link connected to their Helios record.</p></header>
    <div class="rounded-xl border border-border bg-surface p-5 md:p-6">
      <section class="rounded-lg border border-border-muted bg-surface-subtle p-4" aria-labelledby="new-client-booking-heading">
        <h2 id="new-client-booking-heading" class="type-body-sm font-semibold text-ink">Booking link for a new client</h2>
        <p class="type-body-sm text-ink-secondary mt-1">Get your public Zoom Scheduler page. The client can choose a time without you creating a Helios record first.</p>
        <div v-if="!publicBookingUrl" class="mt-3"><button type="button" class="rounded-control bg-action-primary px-4 py-2 type-body-sm font-semibold text-on-action disabled:opacity-50" :disabled="publicBookingLoading" @click="loadPublicBookingLink">{{ publicBookingLoading ? 'Getting link…' : 'Get public booking link' }}</button></div>
        <div v-else class="mt-3 flex flex-wrap items-center gap-2" role="status">
          <a :href="publicBookingUrl" target="_blank" rel="noopener" class="min-w-0 flex-1 break-all type-body-sm text-action-link underline">{{ publicBookingUrl }}</a>
          <button type="button" class="rounded-control border border-border px-4 py-2 type-body-sm font-semibold text-ink-secondary" @click="copyPublicBookingLink">{{ publicBookingCopied ? 'Copied' : 'Copy link' }}</button>
          <button type="button" class="rounded-control border border-border px-4 py-2 type-body-sm font-semibold text-ink-secondary" @click="resetPublicBookingLink">Refresh link</button>
        </div>
        <p v-if="publicBookingUrl" class="type-caption text-ink-muted mt-2">This is your general Zoom booking page. Helios won’t know which client booked through it; add them to Helios after booking to link their appointments and records.</p>
        <p v-if="publicBookingError" class="type-body-sm text-state-danger mt-3" role="alert">{{ publicBookingError }}</p>
      </section>

      <div class="my-5 flex items-center gap-3" aria-hidden="true"><span class="h-px flex-1 bg-border-muted"></span><span class="type-caption text-ink-muted">or create a client-linked booking</span><span class="h-px flex-1 bg-border-muted"></span></div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label for="schedule-client" class="block min-w-0 flex-1 type-body-sm font-semibold text-ink">Existing client
          <select id="schedule-client" v-model="clientId" :disabled="clientsLoading" class="mt-2 block w-full rounded-control border border-border bg-surface-elevated px-3 py-2.5 font-normal text-ink"><option value="">{{ clientsLoading ? 'Loading clients…' : 'Choose a client' }}</option><option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option></select>
        </label>
        <button type="button" class="shrink-0 rounded-control border border-border px-3 py-2.5 type-body-sm font-semibold text-ink-secondary hover:border-action-link" :disabled="clientsLoading" @click="openAddClient">Add client</button>
      </div>
      <p v-if="!clientsLoading && !clients.length" class="type-body-sm text-ink-muted mt-3">No client records yet. Add a client here to create a booking that will be linked to their Helios record.</p><p v-if="error" class="type-body-sm text-state-danger mt-3" role="alert">{{ error }}</p>
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
    <AddClientModal v-if="showAddClient" :submitting="addingClient" :error="addClientError" @close="showAddClient=false" @submit="handleAddClient" />
  </section>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authenticatedFetch } from '../lib/api.js'
import { createClient, listClients } from '../lib/clients.js'
import AddClientModal from './sidebar/AddClientModal.vue'
const route=useRoute()
const clients=ref([]),clientsLoading=ref(true),clientId=ref(''),loading=ref(false),error=ref(''),bookingUrl=ref(''),copied=ref(false),mode=ref('client')
const publicBookingUrl=ref(''),publicBookingLoading=ref(false),publicBookingError=ref(''),publicBookingCopied=ref(false)
const showAddClient=ref(false),addingClient=ref(false),addClientError=ref('')
const selectedClient=computed(()=>clients.value.find(client=>String(client.id)===String(clientId.value))||null)
const emailBookingHref=computed(()=>{const email=selectedClient.value?.email?.trim();if(!email||!bookingUrl.value)return'';const subject='Appointment booking link';const body=`Hello ${selectedClient.value?.name || ''},\n\nPlease use this secure Helios link to choose a suitable appointment time:\n\n${bookingUrl.value}\n\nThis link expires after 72 hours.`;return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`})
onMounted(async()=>{try{clients.value=await listClients();const requestedClientId=typeof route.query.clientId==='string'?route.query.clientId:'';if(requestedClientId&&clients.value.some(client=>String(client.id)===requestedClientId))clientId.value=requestedClientId}catch(cause){error.value=cause.message||'Unable to load clients'}finally{clientsLoading.value=false}})
async function createBookingLink(nextMode){if(!clientId.value||loading.value)return;mode.value=nextMode;loading.value=true;error.value='';bookingUrl.value='';copied.value=false;try{const response=await authenticatedFetch('/api/zoom/scheduler/create-booking-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:clientId.value})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Unable to create booking link');if(nextMode==='therapist'){if(!payload.therapistBookingUrl)throw new Error('Zoom did not return a therapist scheduling link');window.location.assign(payload.therapistBookingUrl);return}bookingUrl.value=payload.bookingUrl||''}catch(cause){error.value=cause.message||'Unable to create booking link'}finally{loading.value=false}}
async function copyBookingLink(){if(!bookingUrl.value)return;try{await navigator.clipboard.writeText(bookingUrl.value);copied.value=true}catch{error.value='Unable to copy the link. Open the preview and copy the address from your browser.'}}
function reset(){bookingUrl.value='';copied.value=false;error.value=''}
async function loadPublicBookingLink(){if(publicBookingLoading.value)return;publicBookingLoading.value=true;publicBookingError.value='';publicBookingCopied.value=false;try{const response=await authenticatedFetch('/api/zoom/scheduler/public-booking-link');const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Unable to get your public booking link');publicBookingUrl.value=payload.bookingUrl||'';if(!publicBookingUrl.value)throw new Error('Zoom did not return a public booking link')}catch(cause){publicBookingError.value=cause.message||'Unable to get your public booking link'}finally{publicBookingLoading.value=false}}
async function copyPublicBookingLink(){if(!publicBookingUrl.value)return;try{await navigator.clipboard.writeText(publicBookingUrl.value);publicBookingCopied.value=true}catch{publicBookingError.value='Unable to copy the link. Select the URL and copy it from the page.'}}
function resetPublicBookingLink(){publicBookingUrl.value='';publicBookingCopied.value=false;publicBookingError.value=''}
function openAddClient(){showAddClient.value=true;addClientError.value='';error.value='';bookingUrl.value=''}
async function handleAddClient(details){if(addingClient.value)return;addingClient.value=true;addClientError.value='';try{const client=await createClient(details);clients.value=[...clients.value,client].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));clientId.value=client.id;showAddClient.value=false;bookingUrl.value='';copied.value=false;mode.value='client'}catch(cause){addClientError.value=cause.message||'Unable to add client'}finally{addingClient.value=false}}
</script>
