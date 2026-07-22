<template>
  <section class="client-directory">
    <header><div><h1 class="type-h1">Clients</h1><p class="type-body">Find a client and open their workspace.</p></div><button class="secondary type-body-medium" @click="showAddClient = true">+ Add client</button></header>
    <label class="search-box"><span aria-hidden="true">⌕</span><input v-model="query" type="search" placeholder="Search by name or identifier" autocomplete="off" @keydown="handleSearchKeydown" /></label>

    <section v-if="showRecentClients" class="recent-section" aria-labelledby="recent-clients-heading">
      <h2 id="recent-clients-heading" class="type-overline">Recently viewed</h2>
      <div class="client-list" role="list">
        <button v-for="client in recentClients" :key="client.id" class="client-row" :class="{ selected: selectedClient?.id === client.id }" @click="selectClient(client)">
          <span class="avatar">{{ initials(client.name) }}</span>
          <span class="client-copy"><strong class="type-body-medium">{{ client.name }}</strong><small v-if="clientContext(client)" class="type-caption">{{ clientContext(client) }}</small></span>
        </button>
      </div>
    </section>

    <section class="all-clients" aria-labelledby="all-clients-heading">
      <div class="list-heading">
        <h2 id="all-clients-heading" class="type-overline">All clients <span v-if="filteredClients.length">{{ filteredClients.length }}</span></h2>
        <div class="directory-controls">
          <label class="compact-control"><span class="sr-only">Client status</span><select v-model="statusFilter"><option value="active">Active</option><option value="archived">Archived</option><option value="all">All clients</option></select></label>
          <label class="compact-control"><span class="sr-only">Sort clients</span><select v-model="sortBy"><option value="name">Sort: Name</option><option value="recent">Sort: Recently viewed</option></select></label>
        </div>
      </div>
      <div v-if="filteredClients.length" class="client-list" role="list" aria-label="Client directory">
        <button v-for="(client, index) in filteredClients" :key="client.id" class="client-row" :class="{ selected: selectedClient?.id === client.id, 'keyboard-active': keyboardIndex === index }" :aria-current="selectedClient?.id === client.id ? 'true' : undefined" @click="selectClient(client)" @mouseenter="keyboardIndex = index">
          <span class="avatar">{{ initials(client.name) }}</span>
          <span class="client-copy"><strong class="type-body-medium">{{ client.name }}</strong><small v-if="clientContext(client)" class="type-caption">{{ clientContext(client) }}</small></span>
        </button>
      </div>
    </section>
    <div v-if="!filteredClients.length" class="empty-state"><div aria-hidden="true">👤</div><h2 class="type-h2">{{ query ? 'No clients found' : `No ${statusFilter === 'all' ? '' : statusFilter} clients` }}</h2><p class="type-body">{{ query ? 'Try a different name or identifier.' : 'Change the filter or add a new client.' }}</p></div>
    <AddClientModal v-if="showAddClient" @close="showAddClient = false" @submit="addClient" />
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AddClientModal from './sidebar/AddClientModal.vue'
import { clientIdentifier, clientMatchesSearch, exactSearchMatches, sortClients } from '../lib/clientDirectory.js'
const props = defineProps({ clients: { type: Array, default: () => [] }, selectedClient: { type: Object, default: null } })
const emit = defineEmits(['select-client', 'add-client'])
const query = ref(''), showAddClient = ref(false), statusFilter = ref('active'), sortBy = ref('name'), keyboardIndex = ref(-1)
const recentClientIds = ref(JSON.parse(localStorage.getItem('helio_recent_clients') || '[]'))
const filteredClients = computed(() => {
  const results = props.clients
    .filter(client => statusFilter.value === 'all' || (statusFilter.value === 'archived' ? client.archived : !client.archived))
    .filter(client => clientMatchesSearch(client, query.value))
  return sortClients(results, sortBy.value, recentClientIds.value)
})
const recentClients = computed(() => recentClientIds.value
  .map(id => filteredClients.value.find(client => String(client.id) === String(id)))
  .filter(Boolean)
  .slice(0, 5))
const showRecentClients = computed(() => props.clients.filter(client => !client.archived).length > 8 && recentClients.value.length > 0 && !query.value)
function initials(name = '') { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?' }
function addClient(data) { emit('add-client', data); showAddClient.value = false }
function selectClient(client) { recentClientIds.value = [client.id, ...recentClientIds.value.filter(id => id !== client.id)].slice(0, 10); localStorage.setItem('helio_recent_clients', JSON.stringify(recentClientIds.value)); emit('select-client', client) }
function identifierFor(client) { return clientIdentifier(client, filteredClients.value) }
function clientContext(client) {
  if (client.next_appointment_at) return `Next appointment ${formatRelativeDate(client.next_appointment_at)}`
  if (client.last_session_at) return `Last session ${formatRelativeDate(client.last_session_at)}`
  return identifierFor(client) || 'Nothing outstanding'
}
function formatRelativeDate(value) {
  const target = new Date(value); const today = new Date()
  target.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0)
  const days = Math.round((target - today) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function handleSearchKeydown(event) {
  if (event.key === 'ArrowDown' && filteredClients.value.length) { event.preventDefault(); keyboardIndex.value = Math.min(keyboardIndex.value + 1, filteredClients.value.length - 1); return }
  if (event.key === 'ArrowUp' && filteredClients.value.length) { event.preventDefault(); keyboardIndex.value = Math.max(keyboardIndex.value - 1, 0); return }
  if (event.key !== 'Enter') return
  const selected = keyboardIndex.value >= 0 ? filteredClients.value[keyboardIndex.value] : exactSearchMatches(filteredClients.value, query.value)[0]
  if (selected && (keyboardIndex.value >= 0 || exactSearchMatches(filteredClients.value, query.value).length === 1)) { event.preventDefault(); selectClient(selected) }
}
watch([query, statusFilter, sortBy], () => { keyboardIndex.value = -1 })
</script>

<style scoped>
.client-directory{max-width:52rem;margin:0 auto;color:#2c3e50}.client-directory header{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-inline-lg);margin-bottom:var(--space-stack-xl)}.client-directory h1{margin:0}.client-directory header p{color:#64748b;margin:var(--space-stack-xs) 0 0}.primary{border:0;border-radius:.55rem;background:#2563eb;color:white;padding:.65rem .9rem;white-space:nowrap}.search-box{display:flex;align-items:center;gap:var(--space-inline-md);background:var(--surface-elevated);border:1px solid var(--border);border-radius:.6rem;padding:0 var(--space-inline-lg);margin-bottom:var(--space-stack-xl);color:#64748b}.search-box:focus-within{border-color:var(--border-strong);box-shadow:0 0 0 3px #dbeafe}.search-box input{width:100%;border:0;outline:0;background:transparent;padding:.72rem 0}.recent-section{margin-bottom:var(--space-stack-xl)}.recent-section h2,.list-heading h2{color:#526074;margin:0}.client-list{border-top:1px solid var(--border-muted);border-bottom:1px solid var(--border-muted);background:var(--surface)}.client-row{display:grid;grid-template-columns:2rem minmax(0,1fr);align-items:center;gap:var(--space-inline-md);width:100%;min-height:52px;padding:var(--space-stack-sm) var(--space-inline-md);text-align:left;border:0;border-bottom:1px solid var(--border-muted);background:var(--surface);color:#2c3e50;transition:background .14s}.client-row:last-child{border-bottom:0}.client-row:hover,.client-row.keyboard-active{background:var(--surface-subtle);outline:none}.client-row:focus-visible{background:var(--surface-subtle);outline:2px solid #2563eb;outline-offset:-2px}.client-row.selected{background:var(--surface-subtle);box-shadow:inset 3px 0 0 #2563eb}.avatar{display:flex;width:2rem;height:2rem;align-items:center;justify-content:center;border-radius:50%;background:var(--surface-muted);color:#334155}.client-copy{display:flex;align-items:baseline;gap:var(--space-inline-sm);min-width:0}.client-copy strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.client-copy small{color:#708096;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.all-clients{margin-top:var(--space-stack-xs)}.list-heading{display:flex;align-items:center;justify-content:space-between;gap:var(--space-inline-lg);margin-bottom:var(--space-stack-sm)}.list-heading h2 span{font-weight:500;color:#8793a5;margin-left:var(--space-inline-xs)}.directory-controls{display:flex;gap:var(--space-inline-xs)}.compact-control select{appearance:auto;border:0;background:transparent;color:#64748b;padding:.28rem .15rem}.compact-control select:hover{color:#334155}.empty-state{min-height:12rem;border:1px dashed var(--border);border-radius:.7rem;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#64748b;padding:var(--space-stack-xl)}.empty-state div{font-size:1.5rem;opacity:.4}.empty-state h2{color:#475569;margin:var(--space-stack-sm) 0 var(--space-stack-xs)}.empty-state p{margin:0}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:700px){.client-directory header{align-items:center}.client-copy{gap:var(--space-inline-xs)}.list-heading{align-items:center}.directory-controls{gap:var(--space-inline-xs)}.client-row{min-height:50px}}
.secondary{border:1px solid #cbd5e1;border-radius:.55rem;background:white;color:#334155;font-weight:600;padding:.6rem .8rem;white-space:nowrap}
</style>
