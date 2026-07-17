<template>
  <section class="client-directory">
    <header><div><h1>Clients</h1><p>Find a client and open their workspace.</p></div><button class="primary" @click="showAddClient = true">+ Add client</button></header>
    <label class="search-box"><span aria-hidden="true">⌕</span><input v-model="query" type="search" placeholder="Search by name or identifier" autocomplete="off" /></label>
    <div class="directory-controls">
      <div class="status-tabs" aria-label="Client status">
        <button v-for="option in statusOptions" :key="option.id" :class="{ active: statusFilter === option.id }" @click="statusFilter = option.id">{{ option.label }} <span>{{ statusCount(option.id) }}</span></button>
      </div>
      <label class="sort-control"><span>Sort</span><select v-model="sortBy"><option value="recent">Recently viewed</option><option value="name">Name A–Z</option></select></label>
    </div>
    <div v-if="filteredClients.length" class="result-summary">{{ resultStart }}–{{ resultEnd }} of {{ filteredClients.length }} clients</div>
    <div v-if="visibleClients.length" class="client-grid">
      <button v-for="client in visibleClients" :key="client.id" class="client-card" :class="{ selected: selectedClient?.id === client.id }" @click="selectClient(client)">
        <span class="avatar">{{ initials(client.name) }}</span>
        <span class="client-copy"><strong>{{ client.name }}</strong><small>{{ client.email || client.reference || (client.archived ? 'Archived client' : 'Active client') }}</small></span>
        <span class="open-label">Open <span aria-hidden="true">›</span></span>
      </button>
    </div>
    <nav v-if="filteredClients.length > desktopPageSize && !isMobile" class="pagination" aria-label="Client results pages">
      <button :disabled="page === 1" @click="page--">Previous</button><span>Page {{ page }} of {{ totalPages }}</span><button :disabled="page === totalPages" @click="page++">Next</button>
    </nav>
    <div v-if="isMobile && visibleClients.length < filteredClients.length" class="load-more"><button @click="mobileLimit += mobilePageSize">Load more clients</button></div>
    <div v-if="!filteredClients.length" class="empty-state"><div aria-hidden="true">👤</div><h2>{{ query ? 'No clients found' : `No ${statusFilter === 'all' ? '' : statusFilter} clients` }}</h2><p>{{ query ? 'Try a different name or identifier.' : 'Change the filter or add a new client.' }}</p></div>
    <AddClientModal v-if="showAddClient" @close="showAddClient = false" @submit="addClient" />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AddClientModal from './sidebar/AddClientModal.vue'
const props = defineProps({ clients: { type: Array, default: () => [] }, selectedClient: { type: Object, default: null } })
const emit = defineEmits(['select-client', 'add-client'])
const query = ref(''), showAddClient = ref(false), statusFilter = ref('active'), sortBy = ref('recent'), page = ref(1)
const desktopPageSize = 20, mobilePageSize = 15, mobileLimit = ref(mobilePageSize), isMobile = ref(false)
const statusOptions = [{ id: 'active', label: 'Active' }, { id: 'archived', label: 'Archived' }, { id: 'all', label: 'All' }]
const recentClientIds = ref(JSON.parse(localStorage.getItem('helio_recent_clients') || '[]'))
const filteredClients = computed(() => {
  const term = query.value.trim().toLowerCase()
  const results = props.clients.filter(client => statusFilter.value === 'all' || (statusFilter.value === 'archived' ? client.archived : !client.archived)).filter(client => !term || `${client.name} ${client.email || ''} ${client.reference || ''}`.toLowerCase().includes(term))
  return [...results].sort((a, b) => {
    if (sortBy.value === 'name') return a.name.localeCompare(b.name)
    const ai = recentClientIds.value.indexOf(a.id), bi = recentClientIds.value.indexOf(b.id)
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi)
    return a.name.localeCompare(b.name)
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredClients.value.length / desktopPageSize)))
const visibleClients = computed(() => isMobile.value ? filteredClients.value.slice(0, mobileLimit.value) : filteredClients.value.slice((page.value - 1) * desktopPageSize, page.value * desktopPageSize))
const resultStart = computed(() => filteredClients.value.length ? (isMobile.value ? 1 : (page.value - 1) * desktopPageSize + 1) : 0)
const resultEnd = computed(() => isMobile.value ? visibleClients.value.length : Math.min(page.value * desktopPageSize, filteredClients.value.length))
function initials(name = '') { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?' }
function addClient(data) { emit('add-client', data); showAddClient.value = false }
function statusCount(status) { return status === 'all' ? props.clients.length : props.clients.filter(client => status === 'archived' ? client.archived : !client.archived).length }
function selectClient(client) { recentClientIds.value = [client.id, ...recentClientIds.value.filter(id => id !== client.id)].slice(0, 10); localStorage.setItem('helio_recent_clients', JSON.stringify(recentClientIds.value)); emit('select-client', client) }
function updateViewport() { isMobile.value = window.innerWidth <= 700 }
watch([query, statusFilter, sortBy], () => { page.value = 1; mobileLimit.value = mobilePageSize })
watch(totalPages, value => { if (page.value > value) page.value = value })
onMounted(() => { updateViewport(); window.addEventListener('resize', updateViewport) })
onBeforeUnmount(() => window.removeEventListener('resize', updateViewport))
</script>

<style scoped>
.client-directory{max-width:64rem;margin:0 auto;color:#2c3e50}.client-directory header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}.client-directory h1{font-size:1.65rem;font-weight:750;margin:0}.client-directory header p{color:#64748b;margin:.25rem 0 0}.primary{border:0;border-radius:.6rem;background:#2563eb;color:white;font-weight:650;padding:.7rem 1rem;white-space:nowrap}.search-box{display:flex;align-items:center;gap:.65rem;background:white;border:1px solid #d9dfe8;border-radius:.7rem;padding:0 .9rem;margin-bottom:1rem;color:#64748b}.search-box:focus-within{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.search-box input{width:100%;border:0;outline:0;background:transparent;padding:.8rem 0;font-size:1rem}.directory-controls{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.65rem}.status-tabs{display:flex;gap:.25rem;padding:.2rem;background:#e9eef5;border-radius:.6rem}.status-tabs button{border:0;background:transparent;color:#526074;border-radius:.45rem;padding:.45rem .7rem;font-weight:600}.status-tabs button.active{background:white;color:#1d4ed8;box-shadow:0 1px 3px #0002}.status-tabs span{font-size:.72rem;color:#8491a3;margin-left:.2rem}.sort-control{display:flex;align-items:center;gap:.45rem;color:#64748b;font-size:.8rem}.sort-control select{border:1px solid #d9dfe8;border-radius:.5rem;background:white;padding:.45rem .6rem;color:#334155}.result-summary{font-size:.78rem;color:#7b8797;margin-bottom:.65rem}.client-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}.client-card{display:grid;grid-template-columns:3rem minmax(0,1fr) auto;align-items:center;gap:.9rem;width:100%;text-align:left;background:white;border:1px solid #e1e6ed;border-radius:.8rem;padding:1rem;transition:.18s}.client-card:hover{border-color:#93c5fd;box-shadow:0 4px 14px #1e3a8a12;transform:translateY(-1px)}.client-card.selected{border-color:#60a5fa;background:#f7fbff}.avatar{display:flex;width:3rem;height:3rem;align-items:center;justify-content:center;border-radius:50%;background:#e7edf5;color:#334155;font-weight:750}.client-copy{display:flex;flex-direction:column;min-width:0}.client-copy strong{font-size:.95rem}.client-copy small{color:#64748b;margin-top:.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.open-label{font-size:.8rem;color:#2563eb;font-weight:650}.pagination{display:flex;align-items:center;justify-content:center;gap:1rem;margin-top:1.25rem;color:#64748b;font-size:.85rem}.pagination button,.load-more button{border:1px solid #d9dfe8;background:white;border-radius:.55rem;padding:.55rem .85rem;color:#334155;font-weight:600}.pagination button:disabled{opacity:.4}.load-more{text-align:center;margin-top:1rem}.empty-state{min-height:20rem;border:2px dashed #d9dfe8;border-radius:1rem;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#64748b}.empty-state div{font-size:2rem;opacity:.4}.empty-state h2{color:#475569;margin:.5rem 0 .2rem}.empty-state p{margin:0}@media(max-width:700px){.client-directory header{align-items:center}.client-directory h1{font-size:1.45rem}.client-directory header p{font-size:.85rem}.directory-controls{align-items:stretch;flex-direction:column}.status-tabs{width:100%}.status-tabs button{flex:1;padding:.45rem .25rem}.sort-control{justify-content:space-between}.client-grid{grid-template-columns:1fr}.client-card{grid-template-columns:2.7rem minmax(0,1fr) auto;padding:.85rem}.avatar{width:2.7rem;height:2.7rem}.open-label{font-size:0}.open-label span{font-size:1.3rem}}
</style>
