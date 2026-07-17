<template>
  <section class="client-directory">
    <header>
      <div>
        <h1>Clients</h1>
        <p>Find a client and open their workspace.</p>
      </div>
      <button class="primary" @click="showAddClient = true">+ Add client</button>
    </header>

    <label class="search-box">
      <span aria-hidden="true">⌕</span>
      <input v-model="query" type="search" placeholder="Search clients" autocomplete="off" />
    </label>

    <div v-if="filteredClients.length" class="client-grid">
      <button
        v-for="client in filteredClients"
        :key="client.id"
        class="client-card"
        :class="{ selected: selectedClient?.id === client.id }"
        @click="$emit('select-client', client)"
      >
        <span class="avatar">{{ initials(client.name) }}</span>
        <span class="client-copy">
          <strong>{{ client.name }}</strong>
          <small>{{ client.note || 'No current focus recorded' }}</small>
        </span>
        <span class="open-label">Open <span aria-hidden="true">›</span></span>
      </button>
    </div>

    <div v-else class="empty-state">
      <div aria-hidden="true">👤</div>
      <h2>{{ query ? 'No clients found' : 'No clients yet' }}</h2>
      <p>{{ query ? 'Try a different name or note.' : 'Add your first client to begin.' }}</p>
    </div>

    <AddClientModal
      v-if="showAddClient"
      @close="showAddClient = false"
      @submit="addClient"
    />
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import AddClientModal from './sidebar/AddClientModal.vue'

const props = defineProps({
  clients: { type: Array, default: () => [] },
  selectedClient: { type: Object, default: null }
})
const emit = defineEmits(['select-client', 'add-client'])
const query = ref('')
const showAddClient = ref(false)
const filteredClients = computed(() => {
  const term = query.value.trim().toLowerCase()
  return props.clients
    .filter(client => !client.archived)
    .filter(client => !term || `${client.name} ${client.note || ''}`.toLowerCase().includes(term))
    .sort((a, b) => a.name.localeCompare(b.name))
})
function initials(name = '') { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?' }
function addClient(data) { emit('add-client', data); showAddClient.value = false }
</script>

<style scoped>
.client-directory{max-width:64rem;margin:0 auto;color:#2c3e50}.client-directory header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}.client-directory h1{font-size:1.65rem;font-weight:750;margin:0}.client-directory header p{color:#64748b;margin:.25rem 0 0}.primary{border:0;border-radius:.6rem;background:#2563eb;color:white;font-weight:650;padding:.7rem 1rem;white-space:nowrap}.search-box{display:flex;align-items:center;gap:.65rem;background:white;border:1px solid #d9dfe8;border-radius:.7rem;padding:0 .9rem;margin-bottom:1rem;color:#64748b}.search-box:focus-within{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.search-box input{width:100%;border:0;outline:0;background:transparent;padding:.8rem 0;font-size:1rem}.client-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}.client-card{display:grid;grid-template-columns:3rem minmax(0,1fr) auto;align-items:center;gap:.9rem;width:100%;text-align:left;background:white;border:1px solid #e1e6ed;border-radius:.8rem;padding:1rem;transition:.18s}.client-card:hover{border-color:#93c5fd;box-shadow:0 4px 14px #1e3a8a12;transform:translateY(-1px)}.client-card.selected{border-color:#60a5fa;background:#f7fbff}.avatar{display:flex;width:3rem;height:3rem;align-items:center;justify-content:center;border-radius:50%;background:#e7edf5;color:#334155;font-weight:750}.client-copy{display:flex;flex-direction:column;min-width:0}.client-copy strong{font-size:.95rem}.client-copy small{color:#64748b;margin-top:.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.open-label{font-size:.8rem;color:#2563eb;font-weight:650}.empty-state{min-height:20rem;border:2px dashed #d9dfe8;border-radius:1rem;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#64748b}.empty-state div{font-size:2rem;opacity:.4}.empty-state h2{color:#475569;margin:.5rem 0 .2rem}.empty-state p{margin:0}@media(max-width:700px){.client-directory header{align-items:center}.client-directory h1{font-size:1.45rem}.client-directory header p{font-size:.85rem}.client-grid{grid-template-columns:1fr}.client-card{grid-template-columns:2.7rem minmax(0,1fr) auto;padding:.85rem}.avatar{width:2.7rem;height:2.7rem}.open-label{font-size:0}.open-label span{font-size:1.3rem}}
</style>
