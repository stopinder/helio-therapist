<template>
  <div class="p-inline-lg py-stack-lg">
    <div class="flex items-center justify-between mb-stack-xl">
      <div>
        <h1 class="text-h1 font-semibold text-ink">Clients</h1>
        <p class="mt-2 text-body text-ink-muted">Manage your clinical directory.</p>
      </div>
      <button class="px-inline-md py-stack-sm bg-action-link text-body-sm font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors">
        + Add Client
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-stack-xl">
      <div class="text-ink-muted flex flex-col items-center gap-2">
        <span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
        <p>Loading clients…</p>
      </div>
    </div>

    <div v-else-if="error" class="bg-surface-elevated border border-state-danger/20 p-inline-lg py-stack-lg rounded-panel text-center">
      <h2 class="text-h2 font-semibold text-state-danger mb-2">Error Loading Clients</h2>
      <p class="text-ink-secondary mb-6">{{ error }}</p>
      <button 
        @click="loadClients"
        class="px-inline-md py-stack-sm bg-state-selected text-white rounded-control hover:opacity-90 transition-opacity"
      >
        Try Again
      </button>
    </div>

    <div v-else-if="clients.length === 0" class="bg-surface-elevated border border-border-muted p-inline-lg py-stack-xl rounded-panel text-center">
      <p class="text-ink-secondary mb-4">You don't have any active clients yet.</p>
      <button class="text-action-link font-medium hover:underline">Add your first client</button>
    </div>

    <div v-else class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead class="bg-surface-subtle border-b border-border-muted">
          <tr>
            <th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider">Client Name</th>
            <th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider">Status</th>
            <th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider">Next Appointment</th>
            <th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-muted">
          <tr v-for="client in clients" :key="client.id" class="hover:bg-surface-subtle/50 transition-colors">
            <td class="px-inline-lg py-stack-md">
              <div class="font-medium text-ink">{{ client.display_name }}</div>
              <div class="text-caption text-ink-muted">ID: {{ client.id.substring(0, 8) }}...</div>
            </td>
            <td class="px-inline-lg py-stack-md">
              <StatusBadge :status="client.status" />
            </td>
            <td class="px-inline-lg py-stack-md text-body-sm text-ink-secondary">
              {{ client.next_appointment || 'Not scheduled' }}
            </td>
            <td class="px-inline-lg py-stack-md text-right">
              <router-link
                :to="`/clients/${client.id}`"
                class="inline-flex items-center px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-action-link rounded-control hover:border-action-link transition-colors"
              >
                Open client
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { listClients } from '../lib/clients.js';
import StatusBadge from '../components/workspace/StatusBadge.vue';

const clients = ref([]);
const loading = ref(true);
const error = ref('');

async function loadClients() {
  loading.value = true;
  error.value = '';
  try {
    clients.value = await listClients();
  } catch (e) {
    console.error('Error loading clients:', e);
    error.value = 'The clinical directory could not be loaded.';
  } finally {
    loading.value = false;
  }
}

onMounted(loadClients);
</script>
