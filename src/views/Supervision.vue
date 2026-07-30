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

        <div v-else-if="error" class="py-stack-xl text-center bg-state-danger-surface border border-state-danger/20 rounded-panel">
          <p class="text-body text-state-danger">{{ error }}</p>
          <button 
            @click="loadReflections" 
            class="mt-4 px-4 py-2 bg-surface text-ink border border-border rounded-control hover:bg-surface-subtle transition-colors font-medium"
          >
            Retry
          </button>
        </div>

        <div v-else-if="reflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel shadow-sm">
          <p class="text-body text-ink-subtle italic">My private reflections will appear here.</p>
          <p class="text-caption text-ink-muted mt-2">Reflections you save in the Session Workspace will appear here.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="reflection in reflections"
            :key="reflection.id"
            class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm flex flex-col hover:border-state-selected/50 transition-colors relative"
          >
            <div class="flex justify-between items-start mb-4">
              <div class="flex flex-col gap-1">
                <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
                  {{ formatDate(reflection.created_at) }}
                </span>
                <span v-if="reflection.included_in_supervision" class="inline-flex items-center px-2 py-0.5 bg-state-success-surface text-[10px] font-bold text-state-success uppercase rounded border border-state-success/20">
                  Supervision Pack
                </span>
              </div>
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

            <p 
              @click="goToSession(reflection)"
              class="text-body-sm text-ink-secondary line-clamp-3 mb-6 flex-1 italic cursor-pointer hover:text-ink transition-colors"
            >
              "{{ reflection.body || 'No content' }}"
            </p>

            <div class="pt-4 border-t border-border-muted flex justify-end">
              <div class="relative">
                <button
                  @click="toggleMenu(reflection.id, $event)"
                  class="flex items-center gap-2 px-3 py-1.5 bg-surface-canvas border border-border text-overline font-bold text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors uppercase tracking-wider"
                  :aria-expanded="menuOpenFor === reflection.id"
                  aria-haspopup="true"
                >
                  Reflection actions
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" :class="{'rotate-180': menuOpenFor === reflection.id}">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                <div
                  v-if="menuOpenFor === reflection.id"
                  class="absolute bottom-full right-0 mb-2 w-56 bg-surface-elevated border border-border shadow-elevated rounded-panel py-2 z-10"
                  @click.stop
                >
                  <button
                    disabled
                    class="w-full text-left px-4 py-2 text-body-sm text-ink-subtle cursor-not-allowed flex justify-between items-center"
                  >
                    <span>Reflect with AI</span>
                    <span class="text-[10px] uppercase font-bold text-ink-muted">Soon</span>
                  </button>
                  <button
                    disabled
                    class="w-full text-left px-4 py-2 text-body-sm text-ink-subtle cursor-not-allowed flex justify-between items-center"
                  >
                    <span>Add to CPD</span>
                    <span class="text-[10px] uppercase font-bold text-ink-muted">Soon</span>
                  </button>
                  <button
                    @click="toggleSupervision(reflection)"
                    :disabled="actionLoading === reflection.id"
                    class="w-full text-left px-4 py-2 text-body-sm text-ink hover:bg-surface-subtle transition-colors flex justify-between items-center"
                    :class="{'opacity-50': actionLoading === reflection.id}"
                  >
                    <span>{{ reflection.included_in_supervision ? 'Remove from Supervision Pack' : 'Include in Supervision Pack' }}</span>
                    <span v-if="actionLoading === reflection.id" class="w-3 h-3 border-2 border-state-selected border-t-transparent rounded-full animate-spin"></span>
                  </button>
                  <div class="my-1 border-t border-border-muted"></div>
                  <button
                    disabled
                    class="w-full text-left px-4 py-2 text-body-sm text-ink-subtle cursor-not-allowed flex justify-between items-center"
                  >
                    <span>Export</span>
                    <span class="text-[10px] uppercase font-bold text-ink-muted">Soon</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllPrivateReflections, setReflectionSupervisionSelection } from '../lib/reflections.js';

const router = useRouter();
const reflections = ref([]);
const loading = ref(true);
const error = ref(null);
const actionLoading = ref(null); // ID of reflection currently being updated
const menuOpenFor = ref(null); // ID of reflection with open menu

onMounted(() => {
  loadReflections();
  window.addEventListener('click', closeMenuOnOutsideClick);
  window.addEventListener('keydown', closeMenuOnEscape);
});

onUnmounted(() => {
  window.removeEventListener('click', closeMenuOnOutsideClick);
  window.removeEventListener('keydown', closeMenuOnEscape);
});

async function loadReflections() {
  loading.value = true;
  error.value = null;
  try {
    reflections.value = await getAllPrivateReflections({});
  } catch (err) {
    console.error('[Supervision] Load error:', err);
    error.value = 'Could not load reflections. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function toggleSupervision(reflection) {
  if (actionLoading.value) return;
  
  const originalState = reflection.included_in_supervision;
  actionLoading.value = reflection.id;
  menuOpenFor.value = null;

  try {
    const updated = await setReflectionSupervisionSelection({
      reflectionId: reflection.id,
      included: !originalState
    });
    
    // Update local state
    const index = reflections.value.findIndex(r => r.id === reflection.id);
    if (index !== -1) {
      reflections.value[index] = { ...reflections.value[index], ...updated };
    }
  } catch (err) {
    console.error('[Supervision] Toggle error:', err);
    alert('Failed to update supervision selection. Please try again.');
  } finally {
    actionLoading.value = null;
  }
}

function toggleMenu(id, event) {
  event.stopPropagation();
  if (menuOpenFor.value === id) {
    menuOpenFor.value = null;
  } else {
    menuOpenFor.value = id;
  }
}

function closeMenuOnOutsideClick() {
  menuOpenFor.value = null;
}

function closeMenuOnEscape(e) {
  if (e.key === 'Escape') {
    menuOpenFor.value = null;
  }
}

function goToSession(reflection) {
  if (reflection.client_id && reflection.session_ref) {
    router.push(`/clients/${reflection.client_id}/sessions/${reflection.session_ref}`);
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
