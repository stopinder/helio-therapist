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
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 class="text-h2 font-semibold text-ink">My Reflections</h2>
            
            <div v-if="reflections.length > 0" class="flex flex-wrap gap-2 mt-4">
              <button 
                v-for="theme in themes" 
                :key="theme.name"
                @click="selectedTheme = theme.name"
                class="px-3 py-1 text-overline font-bold rounded-full border transition-colors flex items-center gap-2"
                :class="selectedTheme === theme.name 
                  ? 'bg-state-selected text-white border-state-selected' 
                  : 'bg-surface border-border text-ink-secondary hover:bg-surface-subtle'"
                :aria-pressed="selectedTheme === theme.name"
              >
                {{ theme.name }}
                <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10">
                  {{ theme.count }}
                </span>
              </button>
            </div>
          </div>

          <div class="w-full md:w-64">
            <label for="reflection-search" class="sr-only">Search reflections</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">🔍</span>
              <input 
                id="reflection-search"
                type="text" 
                v-model="searchQuery" 
                placeholder="Search reflections..."
                class="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-control text-body-sm focus:ring-2 focus:ring-state-selected/20 focus:border-state-selected outline-none transition-all"
              />
            </div>
          </div>
        </div>

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

        <div v-else-if="filteredReflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel shadow-sm">
          <p class="text-body text-ink-subtle italic">No reflections match this filter.</p>
          <button 
            @click="clearFilters" 
            class="mt-4 text-body-sm text-state-selected font-medium hover:underline"
          >
            Clear filters
          </button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="reflection in filteredReflections"
            :key="reflection.id"
            class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm flex flex-col hover:border-state-selected/50 transition-colors relative"
          >
            <div class="flex justify-between items-start mb-4">
              <div class="flex flex-col gap-1">
                <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
                  {{ formatDate(reflection.created_at) }}
                </span>
                <span v-if="reflection.included_in_supervision" class="inline-flex items-center px-2 py-0.5 bg-state-success-surface text-overline font-bold text-state-success uppercase rounded border border-state-success/20">
                  Supervision Pack
                </span>
              </div>
              <span v-if="reflection.theme" class="px-2 py-0.5 bg-state-info-surface text-overline font-bold text-state-info uppercase rounded-full border border-state-info/20">
                {{ reflection.theme }}
              </span>
            </div>

            <div class="mb-4 space-y-1">
              <div v-if="reflection.clients?.display_name" class="flex items-center gap-2 text-caption text-ink-muted font-medium">
                <span class="w-4 text-center">👤</span>
                {{ reflection.clients.display_name }}
              </div>
              <div v-if="reflection.session_ref" class="flex items-center gap-2 text-caption text-ink-muted">
                <span class="w-4 text-center">📅</span>
                Session: {{ reflection.session_ref }}
              </div>
            </div>

            <p 
              @click="openDetail(reflection)"
              class="text-body-sm text-ink-secondary line-clamp-3 mb-6 flex-1 italic cursor-pointer hover:text-ink transition-colors"
            >
              "{{ reflection.body || 'No content' }}"
            </p>

            <div class="pt-4 border-t border-border-muted flex justify-between items-center">
              <div v-if="updateError[reflection.id]" role="alert" class="text-overline text-state-danger font-medium animate-in fade-in slide-in-from-left-1">
                Could not update the Supervision Pack selection. Please try again.
              </div>
              <div v-else></div>
              <div class="relative">
                <button
                  @click="toggleMenu(reflection.id, $event)"
                  class="flex items-center gap-2 px-3 py-1.5 bg-surface-canvas border border-border text-overline font-bold text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors uppercase tracking-wider"
                  :aria-expanded="menuOpenFor === reflection.id"
                  aria-haspopup="menu"
                  aria-label="Reflection actions"
                >
                  Reflection actions
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" :class="{'rotate-180': menuOpenFor === reflection.id}">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                <div
                  v-if="menuOpenFor === reflection.id"
                  class="absolute bottom-full right-0 mb-2 w-56 bg-surface-elevated border border-border shadow-elevated rounded-panel py-2 z-10"
                  role="menu"
                  @click.stop
                >
                  <button
                    @click="openDetail(reflection)"
                    role="menuitem"
                    class="w-full text-left px-4 py-2 text-body-sm text-ink hover:bg-surface-subtle transition-colors flex justify-between items-center"
                  >
                    View Details
                  </button>
                  <div class="my-1 border-t border-border-muted"></div>
                  <button
                    disabled
                    role="menuitem"
                    class="w-full text-left px-4 py-2 text-body-sm text-ink-subtle cursor-not-allowed flex justify-between items-center"
                  >
                    <span>Reflect with AI</span>
                    <span class="text-overline uppercase font-bold text-ink-muted">Soon</span>
                  </button>
                  <button
                    disabled
                    role="menuitem"
                    class="w-full text-left px-4 py-2 text-body-sm text-ink-subtle cursor-not-allowed flex justify-between items-center"
                  >
                    <span>Add to CPD</span>
                    <span class="text-overline uppercase font-bold text-ink-muted">Soon</span>
                  </button>
                  <button
                    @click="toggleSupervision(reflection)"
                    :disabled="actionLoading === reflection.id"
                    role="menuitem"
                    class="w-full text-left px-4 py-2 text-body-sm text-ink hover:bg-surface-subtle transition-colors flex justify-between items-center"
                    :class="{'opacity-50': actionLoading === reflection.id}"
                  >
                    <span>{{ reflection.included_in_supervision ? 'Remove from Supervision Pack' : 'Include in Supervision Pack' }}</span>
                    <span v-if="actionLoading === reflection.id" class="w-3 h-3 border-2 border-state-selected border-t-transparent rounded-full animate-spin"></span>
                  </button>
                  <div class="my-1 border-t border-border-muted"></div>
                  <button
                    disabled
                    role="menuitem"
                    class="w-full text-left px-4 py-2 text-body-sm text-ink-subtle cursor-not-allowed flex justify-between items-center"
                  >
                    <span>Export</span>
                    <span class="text-overline uppercase font-bold text-ink-muted">Soon</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Reflection Detail Modal -->
  <div
    v-if="selectedReflection"
    class="fixed inset-0 bg-backdrop/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="closeDetail"
    role="dialog"
    aria-modal="true"
    aria-labelledby="detail-modal-title"
  >
    <div class="w-full max-w-2xl bg-surface-elevated rounded-panel shadow-overlay max-h-[90vh] flex flex-col overflow-hidden border border-border">
      <div class="p-6 border-b border-border-muted flex justify-between items-start">
        <div>
          <h2 id="detail-modal-title" class="text-h2 font-semibold text-ink">Reflection Details</h2>
          <div class="mt-2 flex flex-wrap gap-2">
            <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
              {{ formatDate(selectedReflection.created_at) }}
            </span>
            <span v-if="selectedReflection.theme" class="px-2 py-0.5 bg-state-info-surface text-overline font-bold text-state-info uppercase rounded-full border border-state-info/20">
              {{ selectedReflection.theme }}
            </span>
            <span v-if="selectedReflection.included_in_supervision" class="inline-flex items-center px-2 py-0.5 bg-state-success-surface text-overline font-bold text-state-success uppercase rounded border border-state-success/20">
              Supervision Pack
            </span>
          </div>
        </div>
        <button 
          @click="closeDetail"
          class="p-2 text-ink-muted hover:text-ink transition-colors rounded-control hover:bg-surface-subtle"
          aria-label="Close detail view"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-8 overflow-y-auto flex-1">
        <div class="mb-8 space-y-2 bg-surface-subtle p-4 rounded-panel border border-border-muted">
          <div v-if="selectedReflection.clients?.display_name" class="flex items-center gap-3 text-body-sm text-ink-secondary">
            <span class="w-5 text-center grayscale">👤</span>
            <span class="font-medium">Client:</span> {{ selectedReflection.clients.display_name }}
          </div>
          <div v-if="selectedReflection.session_ref" class="flex items-center gap-3 text-body-sm text-ink-secondary">
            <span class="w-5 text-center grayscale">📅</span>
            <span class="font-medium">Session:</span> 
            <button 
              @click="goToSession(selectedReflection)"
              class="text-state-selected hover:underline font-medium text-left"
            >
              {{ selectedReflection.session_ref }}
            </button>
          </div>
        </div>

        <div class="prose prose-sm max-w-none">
          <p class="text-body text-ink italic whitespace-pre-wrap leading-relaxed">
            "{{ selectedReflection.body || 'No content' }}"
          </p>
        </div>
      </div>

      <div class="p-6 border-t border-border-muted bg-surface flex justify-between items-center">
        <div v-if="updateError[selectedReflection.id]" role="alert" class="text-overline text-state-danger font-medium">
          Could not update selection.
        </div>
        <div v-else></div>

        <div class="flex gap-3">
          <button
            @click="toggleSupervision(selectedReflection)"
            :disabled="actionLoading === selectedReflection.id"
            class="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-body-sm font-semibold text-ink rounded-control hover:bg-surface-subtle transition-all disabled:opacity-50 shadow-sm"
          >
            <span v-if="actionLoading === selectedReflection.id" class="w-4 h-4 border-2 border-state-selected border-t-transparent rounded-full animate-spin"></span>
            {{ selectedReflection.included_in_supervision ? 'Remove from Supervision Pack' : 'Include in Supervision Pack' }}
          </button>
          
          <div class="relative group">
            <button
              disabled
              class="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-body-sm font-semibold text-ink-subtle rounded-control cursor-not-allowed opacity-60"
            >
              More actions
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllPrivateReflections, setReflectionSupervisionSelection } from '../lib/reflections.js';

const router = useRouter();
const reflections = ref([]);
const loading = ref(true);
const error = ref(null);
const actionLoading = ref(null); // ID of reflection currently being updated
const menuOpenFor = ref(null); // ID of reflection with open menu
const updateError = ref({}); // Map of reflection ID to error status
const selectedReflection = ref(null);

const searchQuery = ref('');
const selectedTheme = ref('All');

const themes = computed(() => {
  const counts = { All: reflections.value.length };
  const themeList = ['All'];
  
  reflections.value.forEach(r => {
    const t = r.theme || 'No theme';
    counts[t] = (counts[t] || 0) + 1;
    if (!themeList.includes(t)) themeList.push(t);
  });

  // Sort themes: All first, then alphabetically, then 'No theme' last if it exists
  const sortedThemes = themeList.filter(t => t !== 'All' && t !== 'No theme').sort();
  if (themeList.includes('No theme')) sortedThemes.push('No theme');
  
  return ['All', ...sortedThemes].map(t => ({
    name: t,
    count: counts[t]
  }));
});

const filteredReflections = computed(() => {
  return reflections.value.filter(r => {
    const matchesTheme = selectedTheme.value === 'All' || 
                         (selectedTheme.value === 'No theme' ? !r.theme : r.theme === selectedTheme.value);
    
    const query = searchQuery.value.toLowerCase().trim();
    const matchesSearch = !query || 
                          (r.body && r.body.toLowerCase().includes(query)) ||
                          (r.theme && r.theme.toLowerCase().includes(query)) ||
                          (r.clients?.display_name && r.clients.display_name.toLowerCase().includes(query)) ||
                          (r.session_ref && r.session_ref.toLowerCase().includes(query));
                          
    return matchesTheme && matchesSearch;
  });
});

function clearFilters() {
  searchQuery.value = '';
  selectedTheme.value = 'All';
}

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
  updateError.value[reflection.id] = false;
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
      
      // Keep selected reflection in sync if open
      if (selectedReflection.value?.id === reflection.id) {
        selectedReflection.value = { ...selectedReflection.value, ...updated };
      }
    }
  } catch (err) {
    console.error('[Supervision] Toggle error:', err);
    updateError.value[reflection.id] = true;
  } finally {
    actionLoading.value = null;
  }
}

function openDetail(reflection) {
  selectedReflection.value = { ...reflection };
  menuOpenFor.value = null;
}

function closeDetail() {
  selectedReflection.value = null;
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
    selectedReflection.value = null;
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
