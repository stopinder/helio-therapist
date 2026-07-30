<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div class="p-inline-lg py-stack-lg border-b border-border-muted bg-surface">
      <div class="max-w-6xl mx-auto">
        <h1 class="text-h1 font-semibold text-ink">Supervision & Reflections</h1>
        <p class="mt-2 text-body text-ink-muted">Your private professional reflections and supervision items.</p>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-inline-lg py-stack-lg">
      <div class="max-w-3xl mx-auto">
        <div v-if="loading" class="py-stack-xl text-center">
          <span class="inline-block w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
          <p class="mt-2 text-ink-muted">Loading reflections…</p>
        </div>
        
        <div v-else-if="reflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel">
          <p class="text-body text-ink-subtle">No private reflections recorded yet.</p>
          <p class="text-caption text-ink-muted mt-2">Reflections you save in the Session Workspace will appear here.</p>
        </div>

        <div v-else class="space-y-0">
          <TimelineItem 
            v-for="(reflection, index) in reflections" 
            :key="reflection.id"
            event-type="private_reflection"
            :date="formatDate(reflection.created_at)"
            :description="getReflectionDescription(reflection)"
            :client-id="reflection.client_id"
            :session-id="reflection.session_ref"
            :is-last="index === reflections.length - 1"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAllPrivateReflections } from '../lib/reflections.js';
import TimelineItem from '../components/workspace/TimelineItem.vue';

const reflections = ref([]);
const loading = ref(true);

async function loadReflections() {
  loading.value = true;
  try {
    reflections.value = await getAllPrivateReflections({});
  } catch (e) {
    console.error('Failed to load reflections:', e);
  } finally {
    loading.value = false;
  }
}

function getReflectionDescription(reflection) {
  let desc = reflection.body || 'No content';
  
  const clientName = reflection.clients?.full_name;
  if (clientName) {
    desc = `[Client: ${clientName}] ${desc}`;
  }

  if (reflection.included_in_supervision) {
    desc = `(Included in Supervision) ${desc}`;
  }
  
  return desc;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(loadReflections);
</script>
