<template>
  <div class="p-inline-lg py-stack-lg">
    <div class="flex items-start justify-between gap-inline-lg mb-stack-lg">
      <div class="flex items-start gap-inline-md min-w-0">
        <span class="icon-surface icon-surface-accent !h-11 !w-11 mt-1" aria-hidden="true">
          <UsersRound class="workspace-icon-lg" />
        </span>
        <PageHeader title="Clients" supporting="Manage your clinical directory." />
      </div>
      <AppButton variant="primary" @click="showAddClient = true">
        <UserPlus class="workspace-icon" aria-hidden="true" />
        <span>Add Client</span>
      </AppButton>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-stack-xl"><div class="text-ink-muted flex flex-col items-center gap-2"><span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span><p class="type-body">Loading clients…</p></div></div>
    <div v-else-if="error" class="bg-surface-elevated border border-state-danger/20 p-inline-lg py-stack-lg rounded-panel text-center"><h2 class="type-section-title text-state-danger mb-stack-sm">Error loading clients</h2><p class="type-body text-ink-secondary mb-stack-lg">{{ error }}</p><AppButton variant="secondary" @click="loadClients">Try again</AppButton></div>
    <template v-else>
      <div v-if="clients.length === 0" class="mb-stack-lg rounded-panel border border-border-muted bg-surface-elevated p-inline-lg py-stack-lg" data-testid="sample-workspace-prompt">
        <div class="flex items-start gap-inline-md">
          <span class="icon-surface icon-surface-reflection" aria-hidden="true"><Sparkles class="workspace-icon" /></span>
          <div>
            <h2 class="type-section-title text-ink">Explore with sample clients</h2>
            <p class="mt-stack-sm max-w-2xl type-body text-ink-secondary">Add a fictional workspace to see sessions, Care items, appointments, documents and archived-client behaviour. Everything is clearly marked as sample content and uses no real client information.</p>
          </div>
        </div>
        <div class="mt-stack-md flex flex-wrap items-center gap-inline-md">
          <AppButton variant="secondary" :disabled="seedingSample" @click="seedSampleWorkspace">
            <Sparkles v-if="!seedingSample" class="workspace-icon" aria-hidden="true" />
            <span>{{ seedingSample ? 'Adding sample workspace…' : 'Add sample workspace' }}</span>
          </AppButton>
          <span class="type-metadata text-ink-muted">Optional — you can simply add your first real client instead.</span>
        </div>
        <p v-if="sampleError" class="mt-stack-sm type-body text-state-danger">{{ sampleError }}</p>
      </div>

      <div v-if="sampleActionError" role="alert" class="mb-stack-md rounded-control border border-state-danger/20 bg-state-danger/5 px-inline-md py-stack-sm type-body text-state-danger">{{ sampleActionError }}</div>

      <div class="grid grid-cols-1 md:grid-cols-5 gap-inline-md md:items-center mb-stack-md">
        <FormControl class="md:col-span-3">
          <template #default="{ controlClass }">
            <span class="sr-only">Search clients</span>
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 workspace-icon -translate-y-1/2 text-accent" aria-hidden="true" />
              <input v-model="searchQuery" type="search" placeholder="Search clients by name or reference…" :class="[controlClass, 'pl-10 placeholder:text-ink-muted']" data-testid="client-search" />
            </div>
          </template>
        </FormControl>
        <div class="md:col-span-2 inline-flex min-h-touch self-start rounded-control border border-border bg-surface p-1" role="group" aria-label="Client status filter">
          <button v-for="option in statusOptions" :key="option.value" type="button" class="flex-1 min-h-touch px-inline-md rounded-control type-ui transition-colors" :aria-pressed="statusFilter===option.value" :class="statusFilter===option.value?'bg-state-selected text-ink font-semibold':'text-ink-secondary hover:bg-surface-subtle'" @click="statusFilter=option.value">{{ option.label }} <span class="text-ink-muted">{{ option.count }}</span></button>
        </div>
      </div>
      <div class="flex items-center justify-between mb-stack-sm"><p class="type-metadata text-ink-muted">{{ resultLabel }}</p></div>

      <div v-if="filteredClients.length === 0" class="bg-surface-elevated border border-border-muted p-inline-lg py-stack-xl rounded-panel text-center"><p class="type-body text-ink-secondary">{{ searchQuery ? 'No clients match your search.' : emptyStatusMessage }}</p></div>
      <div v-else class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-surface-subtle border-b border-border-muted">
            <tr>
              <th class="px-inline-lg py-stack-md type-eyebrow text-ink-secondary"><span class="inline-flex items-center gap-2"><UsersRound class="workspace-icon-sm text-accent" aria-hidden="true" />Client</span></th>
              <th class="px-inline-lg py-stack-md type-eyebrow text-ink-secondary"><span class="inline-flex items-center gap-2"><CalendarClock class="workspace-icon-sm text-focus" aria-hidden="true" />Next appointment</span></th>
              <th v-if="statusFilter === 'all'" class="px-inline-lg py-stack-md type-eyebrow text-ink-secondary">Status</th>
              <th class="px-inline-lg py-stack-md type-eyebrow text-ink-secondary text-right"><span class="sr-only">Client actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-muted">
            <tr v-for="client in filteredClients" :key="client.id" tabindex="0" role="link" :aria-label="`Open ${client.display_name}`" class="group cursor-pointer hover:bg-surface-subtle/50 transition-colors" @click="openClient(client.id)" @keydown.enter.prevent="openClient(client.id)" @keydown.space.prevent="openClient(client.id)">
              <td class="px-inline-lg py-stack-md">
                <div class="flex items-center gap-3">
                  <span class="icon-surface icon-surface-accent !h-8 !w-8 !rounded-pill opacity-80 group-hover:opacity-100" aria-hidden="true"><UserRound class="workspace-icon-sm" /></span>
                  <div><div class="type-body-medium text-ink">{{ client.display_name }}</div><div v-if="client.reference" class="type-metadata text-ink-muted">{{ client.reference }}</div></div>
                </div>
              </td>
              <td class="px-inline-lg py-stack-md type-ui text-ink-secondary">
                <span class="inline-flex items-center gap-2"><CalendarClock class="workspace-icon-sm" :class="nextAppointments.has(client.id) ? 'text-accent' : 'text-ink-subtle'" aria-hidden="true" />{{ appointmentLabel(client.id) }}</span>
              </td>
              <td v-if="statusFilter === 'all'" class="px-inline-lg py-stack-md"><StatusIndicator :tone="client.archived ? 'neutral' : 'success'">{{ client.archived ? 'Archived' : 'Active' }}</StatusIndicator></td>
              <td class="px-inline-lg py-stack-md text-right">
                <button v-if="isSampleClient(client)" type="button" class="mr-inline-md inline-flex items-center gap-1.5 type-ui text-ink-muted hover:text-state-danger disabled:opacity-50" :disabled="removingSampleId===client.id" @click.stop="removeSample(client)">
                  <Trash2 v-if="removingSampleId!==client.id" class="workspace-icon" aria-hidden="true" />
                  <span>{{ removingSampleId===client.id ? 'Removing…' : 'Remove sample' }}</span>
                </button>
                <span class="icon-surface !h-8 !w-8 !rounded-pill border-transparent bg-transparent text-accent group-hover:bg-brand-sage-soft group-hover:border-accent/20" aria-hidden="true"><ChevronRight class="workspace-icon" /></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <AddClientModal v-if="showAddClient" :submitting="addingClient" :error="addError" @close="showAddClient = false" @submit="handleAddClient" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { CalendarClock, ChevronRight, Search, Sparkles, Trash2, UserPlus, UserRound, UsersRound } from '@lucide/vue';
import { listClients, createClient, listUpcomingClientAppointments } from '../lib/clients.js';
import { createSampleWorkspace, deleteSampleClient, isSampleClient } from '../lib/sampleWorkspace.js';
import AddClientModal from '../components/sidebar/AddClientModal.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import AppButton from '../components/ui/AppButton.vue';
import FormControl from '../components/ui/FormControl.vue';
import StatusIndicator from '../components/ui/StatusIndicator.vue';

const router = useRouter();
const clients = ref([]); const appointments = ref([]); const loading = ref(true); const error = ref(''); const showAddClient = ref(false); const addingClient = ref(false); const addError = ref('');
const seedingSample = ref(false); const sampleError = ref(''); const sampleActionError = ref(''); const removingSampleId = ref('');
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
async function seedSampleWorkspace(){if(seedingSample.value)return;seedingSample.value=true;sampleError.value='';try{await createSampleWorkspace();statusFilter.value='active';await loadClients();}catch(e){console.error('Error adding sample workspace:',e);sampleError.value=e.message||'The sample workspace could not be added.';}finally{seedingSample.value=false;}}
async function removeSample(client){if(removingSampleId.value)return;sampleActionError.value='';if(!window.confirm(`Remove ${client.display_name}? Draft-only sample records will be permanently deleted. Sample clients with completed clinical records must be archived instead.`))return;removingSampleId.value=client.id;try{await deleteSampleClient(client.id);clients.value=clients.value.filter(c=>c.id!==client.id);appointments.value=appointments.value.filter(a=>a.client_id!==client.id);}catch(e){sampleActionError.value=e.message?.includes('must be archived')?'This sample client has completed clinical records, so it cannot be deleted. Open the client and choose Archive client instead.':(e.message||'Could not remove this sample client.');}finally{removingSampleId.value='';}}
async function handleAddClient(clientData){if(addingClient.value)return;addingClient.value=true;addError.value='';try{const newClient=await createClient(clientData);clients.value.push(newClient);clients.value.sort((a,b)=>a.display_name.localeCompare(b.display_name));statusFilter.value='active';showAddClient.value=false;}catch(e){console.error('Error creating client:',e);addError.value=e.message||'Failed to create client.';}finally{addingClient.value=false;}}
onMounted(loadClients);
</script>