<template>
  <div class="p-inline-lg py-stack-lg">
    <div class="flex items-center justify-between gap-4 mb-stack-lg">
      <div><h1 class="text-h1 font-semibold text-ink">Clients</h1><p class="mt-2 text-body text-ink-muted">Manage your clinical directory.</p></div>
      <button class="px-inline-md py-stack-sm bg-action-link text-body-sm font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors shrink-0" @click="showAddClient = true">+ Add Client</button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-stack-xl"><div class="text-ink-muted flex flex-col items-center gap-2"><span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span><p>Loading clients…</p></div></div>
    <div v-else-if="error" class="bg-surface-elevated border border-state-danger/20 p-inline-lg py-stack-lg rounded-panel text-center"><h2 class="text-h2 font-semibold text-state-danger mb-2">Error Loading Clients</h2><p class="text-ink-secondary mb-6">{{ error }}</p><button @click="loadClients" class="px-inline-md py-stack-sm bg-state-selected text-white rounded-control hover:opacity-90 transition-opacity">Try Again</button></div>
    <template v-else>
      <div class="flex flex-col md:flex-row md:items-center gap-3 mb-stack-md">
        <label class="relative flex-1 max-w-xl"><span class="sr-only">Search clients</span><input v-model="searchQuery" type="search" placeholder="Search clients by name or reference…" class="w-full px-inline-md py-stack-sm border border-border rounded-control bg-surface text-body-sm text-ink" data-testid="client-search" /></label>
        <div class="inline-flex self-start rounded-control border border-border bg-surface p-1" aria-label="Client status filter">
          <button v-for="option in statusOptions" :key="option.value" type="button" class="px-inline-md py-stack-xs rounded-control text-body-sm font-medium transition-colors" :class="statusFilter===option.value?'bg-state-selected text-white':'text-ink-secondary hover:bg-surface-subtle'" @click="statusFilter=option.value">{{ option.label }} <span class="opacity-75">{{ option.count }}</span></button>
        </div>
      </div>
      <div class="flex items-center justify-between mb-stack-sm"><p class="text-caption text-ink-muted">{{ resultLabel }}</p></div>

      <div v-if="filteredClients.length === 0" class="bg-surface-elevated border border-border-muted p-inline-lg py-stack-xl rounded-panel text-center"><p class="text-ink-secondary">{{ searchQuery ? 'No clients match your search.' : emptyStatusMessage }}</p></div>
      <div v-else class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden">
        <table class="w-full text-left border-collapse"><thead class="bg-surface-subtle border-b border-border-muted"><tr><th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider">Client</th><th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider">Next Appointment</th><th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider">Status</th><th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider text-right"><span class="sr-only">Open</span></th></tr></thead>
          <tbody class="divide-y divide-border-muted"><tr v-for="client in filteredClients" :key="client.id" tabindex="0" role="link" :aria-label="`Open ${client.display_name}`" class="group cursor-pointer hover:bg-surface-subtle/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-state-selected transition-colors" @click="openClient(client.id)" @keydown.enter.prevent="openClient(client.id)" @keydown.space.prevent="openClient(client.id)">
            <td class="px-inline-lg py-stack-md"><div class="font-medium text-ink">{{ client.display_name }}</div><div v-if="client.reference" class="text-caption text-ink-muted">{{ client.reference }}</div></td>
            <td class="px-inline-lg py-stack-md text-body-sm text-ink-secondary">{{ appointmentLabel(client.id) }}</td>
            <td class="px-inline-lg py-stack-md"><StatusBadge :status="client.archived ? 'archived' : 'active'" /></td>
            <td class="px-inline-lg py-stack-md text-right"><router-link :to="`/clients/${client.id}`" data-testid="open-client-button" class="text-body-sm font-medium text-action-link group-hover:underline" @click.stop>Open</router-link></td>
          </tr></tbody></table>
      </div>
    </template>

    <AddClientModal v-if="showAddClient" :submitting="addingClient" :error="addError" @close="showAddClient = false" @submit="handleAddClient" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { listClients, createClient, listUpcomingClientAppointments } from '../lib/clients.js';
import StatusBadge from '../components/workspace/StatusBadge.vue';
import AddClientModal from '../components/sidebar/AddClientModal.vue';

const router = useRouter();
const clients = ref([]); const appointments = ref([]); const loading = ref(true); const error = ref(''); const showAddClient = ref(false); const addingClient = ref(false); const addError = ref('');
const searchQuery = ref(''); const statusFilter = ref('active');
const activeCount = computed(()=>clients.value.filter(c=>!c.archived).length); const archivedCount = computed(()=>clients.value.filter(c=>c.archived).length);
const statusOptions = computed(()=>[{value:'active',label:'Active',count:activeCount.value},{value:'archived',label:'Archived',count:archivedCount.value},{value:'all',label:'All',count:clients.value.length}]);
const filteredClients = computed(()=>{const q=searchQuery.value.trim().toLowerCase();return clients.value.filter(c=>statusFilter.value==='all'||(statusFilter.value==='archived'?c.archived:!c.archived)).filter(c=>!q||c.display_name?.toLowerCase().includes(q)||c.reference?.toLowerCase().includes(q));});
const resultLabel = computed(()=>`${filteredClients.value.length} ${statusFilter.value==='all'?'client':statusFilter.value+' client'}${filteredClients.value.length===1?'':'s'}`);
const emptyStatusMessage = computed(()=>statusFilter.value==='archived'?'No archived clients.':statusFilter.value==='all'?'No clients yet.':'You don’t have any active clients yet.');
const nextAppointments = computed(()=>{const map=new Map();for(const appointment of appointments.value){if(appointment.client_id&&!map.has(appointment.client_id))map.set(appointment.client_id,appointment)}return map;});
function appointmentLabel(clientId){const appointment=nextAppointments.value.get(clientId);if(!appointment?.starts_at)return 'Not scheduled';return new Date(appointment.starts_at).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
function openClient(clientId){router.push(`/clients/${clientId}`);}
async function loadClients(){loading.value=true;error.value='';try{[clients.value,appointments.value]=await Promise.all([listClients({includeArchived:true}),listUpcomingClientAppointments()]);}catch(e){console.error('Error loading clients:',e);error.value='The clinical directory could not be loaded.';}finally{loading.value=false;}}
async function handleAddClient(clientData){if(addingClient.value)return;addingClient.value=true;addError.value='';try{const newClient=await createClient(clientData);clients.value.push(newClient);clients.value.sort((a,b)=>a.display_name.localeCompare(b.display_name));statusFilter.value='active';showAddClient.value=false;}catch(e){console.error('Error creating client:',e);addError.value=e.message||'Failed to create client.';}finally{addingClient.value=false;}}
onMounted(loadClients);
</script>
