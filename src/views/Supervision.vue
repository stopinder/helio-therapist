<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div class="p-inline-lg py-stack-lg border-b border-border-muted bg-surface">
      <div class="max-w-6xl mx-auto">
        <h1 class="text-h1 font-semibold text-ink">Professional Development</h1>
        <p class="mt-2 text-body text-ink-muted">Your private professional reflections and supervision items.</p>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-inline-lg py-stack-lg">
      <div class="max-w-6xl mx-auto">
        <h2 class="text-h2 font-semibold text-ink mb-6">My Reflections</h2>

        <div v-if="loading" class="py-stack-xl text-center">
          <span class="inline-block w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
          <p class="mt-2 text-ink-muted">Loading reflections…</p>
        </div>

        <div v-else-if="reflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel shadow-sm">
          <p class="text-body text-ink-subtle italic">My private reflections will appear here.</p>
          <p class="text-caption text-ink-muted mt-2">Reflections you save in the Session Workspace will appear here.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="reflection in reflections"
            :key="reflection.id"
            class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm flex flex-col hover:border-state-selected/50 transition-colors"
          >
            <div class="flex justify-between items-start mb-4">
              <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
                {{ formatDate(reflection.created_at) }}
              </span>
              <span v-if="reflection.theme" class="px-2 py-0.5 bg-state-info-surface text-overline font-bold text-state-info uppercase rounded-full border border-state-info/20">
                {{ reflection.theme }}
              </span>
            </div>

            <div class="mb-4 space-y-1">
              <div v-if="reflection.clients?.full_name" class="flex items-center gap-2 text-caption text-ink-muted font-medium">
                <span class="w-4 text-center">👤</span>
                {{ reflection.clients.full_name }}
              </div>
              <div v-if="reflection.session_ref" class="flex items-center gap-2 text-caption text-ink-muted">
                <span class="w-4 text-center">📅</span>
                Session: {{ reflection.session_ref }}
              </div>
            </div>

            <p class="text-body-sm text-ink-secondary line-clamp-3 mb-6 flex-1 italic">
              "{{ reflection.body || 'No content' }}"
            </p>

            <div class="flex flex-wrap gap-2 pt-4 border-t border-border-muted">
              <button
                disabled
                class="px-3 py-1.5 bg-surface-canvas border border-border text-overline font-bold text-ink-subtle rounded-control cursor-not-allowed uppercase tracking-wider opacity-60"
              >
                Reflect with AI
              </button>
              <button
                disabled
                class="px-3 py-1.5 bg-surface-canvas border border-border text-overline font-bold text-ink-subtle rounded-control cursor-not-allowed uppercase tracking-wider opacity-60"
              >
                CPD
              </button>
              <button
                disabled
                class="px-3 py-1.5 bg-surface-canvas border border-border text-overline font-bold text-ink-subtle rounded-control cursor-not-allowed uppercase tracking-wider opacity-60"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAllPrivateReflections } from '../lib/reflections.js';

const reflections = ref([]);
const loading = ref(true);

onMounted(loadReflections);

async function loadReflections() {
  try {
    reflections.value = await getAllPrivateReflections({});
  } catch (err) {
    console.error('[Supervision] Load error:', err);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
</script>
