<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div class="p-inline-lg py-stack-lg border-b border-border-muted bg-surface no-print">
      <div class="max-w-6xl mx-auto">
        <h1 class="text-h1 font-semibold text-ink">Professional Development</h1>
        <p class="mt-2 text-body text-ink-muted">Review your private reflections, learning themes and professional development over time.</p>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-inline-lg py-stack-lg no-print">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div class="flex items-center gap-4">
            <h2 class="text-h2 font-semibold text-ink">
              <span v-if="activeView === 'timeline'">Timeline</span>
              <span v-else-if="activeView === 'insights'">Insights</span>
              <span v-else-if="activeView === 'pack'">Supervision Pack</span>
            </h2>
            <div class="flex bg-surface-subtle p-1 rounded-pill border border-border-muted shadow-inner">
              <button 
                @click="activeView = 'timeline'"
                class="px-5 py-1.5 text-overline font-bold rounded-pill transition-all"
                :class="activeView === 'timeline' ? 'bg-white text-action-primary shadow-sm' : 'text-ink-muted hover:text-ink'"
              >
                Timeline
              </button>
              <button 
                @click="activeView = 'insights'"
                class="px-5 py-1.5 text-overline font-bold rounded-pill transition-all"
                :class="activeView === 'insights' ? 'bg-white text-action-primary shadow-sm' : 'text-ink-muted hover:text-ink'"
              >
                Insights
              </button>
              <button 
                @click="activeView = 'pack'"
                class="px-5 py-1.5 text-overline font-bold rounded-pill transition-all"
                :class="activeView === 'pack' ? 'bg-white text-action-primary shadow-sm' : 'text-ink-muted hover:text-ink'"
              >
                Pack
              </button>
            </div>
          </div>

          <div v-if="activeView === 'timeline'" class="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div class="relative w-full md:w-64 order-first md:order-none">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">🔍</span>
              <input 
                id="reflection-search"
                type="text" 
                v-model="searchQuery" 
                placeholder="Search reflections..."
                class="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-control text-body-sm focus:ring-2 focus:ring-state-selected/20 focus:border-state-selected outline-none transition-all"
              />
            </div>
            
            <div class="relative w-full md:w-48">
              <select 
                v-model="selectedTheme"
                class="w-full px-3 py-2 bg-surface border border-border rounded-control text-body-sm focus:ring-2 focus:ring-state-selected/20 focus:border-state-selected outline-none appearance-none cursor-pointer"
              >
                <option v-for="theme in themes" :key="theme.name" :value="theme.name">
                  {{ theme.name }} ({{ theme.count }})
                </option>
              </select>
              <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">▼</span>
            </div>
          </div>
        </div>

        <!-- Main Views -->
        <div v-if="loading && reflections.length === 0" class="py-stack-xl text-center">
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

        <template v-else>
          <ProfessionalDevelopmentTimeline
            v-if="activeView === 'timeline'"
            :reflections="filteredReflections"
            :menu-open-for="menuOpenFor"
            :has-more="hasMore"
            :loading-more="loading"
            @open-reflection="openDetail"
            @go-to-session="goToSession"
            @toggle-menu="toggleMenu"
            @close-menu="closeMenuOnOutsideClick"
            @toggle-supervision="toggleSupervision"
            @load-more="loadReflections(true)"
            @clear-filters="clearFilters"
          />

          <SupervisionPackView
            v-else-if="activeView === 'pack'"
            :reflections="supervisionPackReflections"
            :selected-reflections="reportSelectedReflections"
            :report-selected-ids="reportSelectedIds"
            :expanded-preparation-id="expandedPreparationId"
            :pack-item-options="packItemOptions"
            :client-aliases="clientAliases"
            :action-loading="actionLoading"
            @create-report="openExportPreview"
            @toggle-report-selection="toggleReportSelection"
            @go-to-session="goToSession"
            @open-reflection="openDetail"
            @toggle-preparation="togglePreparation"
            @remove-from-pack="toggleSupervision"
          />

          <!-- Insights View -->
          <div v-else-if="activeView === 'insights'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="bg-surface-elevated p-6 rounded-panel border border-border-muted shadow-sm transition-all hover:shadow-md">
                <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-1">Total Reflections</div>
                <div class="text-h2 font-semibold text-ink">{{ insights.total }}</div>
              </div>
              <div class="bg-surface-elevated p-6 rounded-panel border border-border-muted shadow-sm transition-all hover:shadow-md">
                <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-1">Supervision Pack</div>
                <div class="text-h2 font-semibold text-action-primary">{{ insights.inSupervision }}</div>
              </div>
              <div class="bg-surface-elevated p-6 rounded-panel border border-border-muted shadow-sm transition-all hover:shadow-md">
                <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-1">Unthemed</div>
                <div class="text-h2 font-semibold text-ink-subtle">{{ insights.noTheme }}</div>
              </div>
              <div class="bg-surface-elevated p-6 rounded-panel border border-border-muted shadow-sm transition-all hover:shadow-md">
                <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-1">Top Theme</div>
                <div class="text-h2 font-semibold text-action-link truncate" :title="insights.topTheme">
                  {{ insights.topTheme }}
                </div>
              </div>
            </div>

            <div class="text-caption text-ink-muted italic bg-surface-subtle p-3 rounded-control border border-border-muted inline-block">
              Based on loaded reflections
            </div>

            <div class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden shadow-sm">
              <div class="p-6 border-b border-border-muted bg-surface">
                <h3 class="text-body font-bold text-ink uppercase tracking-wider">Theme Distribution</h3>
              </div>
              <div class="p-6">
                <div v-if="insights.themeCounts.length === 0" class="text-center py-8 text-ink-subtle italic">
                  No themes identified yet.
                </div>
                <div v-else class="space-y-4">
                  <div v-for="theme in insights.themeCounts" :key="theme.name" class="space-y-2">
                    <div class="flex justify-between text-body-sm font-medium">
                      <span class="text-ink">{{ theme.name }}</span>
                      <span class="text-ink-muted">{{ theme.count }} ({{ Math.round(theme.count / insights.total * 100) }}%)</span>
                    </div>
                    <div class="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                      <div 
                        class="bg-state-selected h-full rounded-full" 
                        :style="{ width: (theme.count / insights.total * 100) + '%' }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Modals -->
    <PrivateReflectionModal
      v-if="selectedReflection"
      :reflection="selectedReflection"
      :loading="actionLoading === selectedReflection.id"
      :error="updateError[selectedReflection.id]"
      @close="closeDetail"
      @toggle-supervision="toggleSupervision"
      @go-to-session="goToSession"
    />

    <SupervisionReportPreview
      v-if="exportPreviewOpen"
      :reflections="reportSelectedReflections"
      :options="exportOptions"
      :pack-item-options="packItemOptions"
      :client-aliases="clientAliases"
      :introduction="therapistIntroduction"
      :copying="copying"
      @close="closeExportPreview"
      @update-option="(key, val) => exportOptions[key] = val"
      @update-introduction="val => therapistIntroduction = val"
      @copy="copyExportText"
      @print="printPack"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getAllPrivateReflections, setReflectionSupervisionSelection } from '../lib/reflections.js';

// Components
import ProfessionalDevelopmentTimeline from '../components/professional-development/ProfessionalDevelopmentTimeline.vue';
import PrivateReflectionModal from '../components/professional-development/PrivateReflectionModal.vue';
import SupervisionPackView from '../components/professional-development/SupervisionPackView.vue';
import SupervisionReportPreview from '../components/professional-development/SupervisionReportPreview.vue';

const router = useRouter();
const reflections = ref([]);
const loading = ref(true);
const error = ref(null);
const actionLoading = ref(null); // ID of reflection currently being updated
const menuOpenFor = ref(null); // ID of reflection with open menu
const updateError = ref({}); // Map of reflection ID to error status
const selectedReflection = ref(null);
const reportSelectedIds = ref(new Set());
const expandedPreparationId = ref(null);
const packItemOptions = ref({}); // { reflectionId: { includeText: bool, includeDate: bool, includeTheme: bool } }

const searchQuery = ref('');
const selectedTheme = ref('All');
const activeView = ref('timeline'); // 'timeline', 'insights' or 'pack'
const exportPreviewOpen = ref(false);
const exportOptions = ref({
  includeText: true,
  includeThemes: true,
  includeDates: true,
  includeClientReferences: false
});

// Update all items when global options change
watch(() => exportOptions.value.includeText, (val) => {
  Object.values(packItemOptions.value).forEach(opt => opt.includeText = val);
});
watch(() => exportOptions.value.includeThemes, (val) => {
  Object.values(packItemOptions.value).forEach(opt => opt.includeTheme = val);
});
watch(() => exportOptions.value.includeDates, (val) => {
  Object.values(packItemOptions.value).forEach(opt => opt.includeDate = val);
});
const therapistIntroduction = ref('');
const copying = ref(false);

const supervisionPackReflections = computed(() => {
  return reflections.value.filter(r => r.included_in_supervision);
});

const reportSelectedReflections = computed(() => {
  return supervisionPackReflections.value.filter(r => reportSelectedIds.value.has(r.id));
});

const insights = computed(() => {
  const total = reflections.value.length;
  if (total === 0) {
    return {
      total: 0,
      inSupervision: 0,
      noTheme: 0,
      topTheme: 'None',
      themeCounts: []
    };
  }

  const inSupervision = reflections.value.filter(r => r.included_in_supervision).length;
  const noTheme = reflections.value.filter(r => !r.theme).length;
  
  const themeCountsMap = {};
  reflections.value.forEach(r => {
    const t = r.theme || 'No theme';
    themeCountsMap[t] = (themeCountsMap[t] || 0) + 1;
  });

  const themeCounts = Object.entries(themeCountsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topTheme = themeCounts.find(t => t.name !== 'No theme')?.name || 'No theme';

  return {
    total,
    inSupervision,
    noTheme,
    topTheme,
    themeCounts
  };
});

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

const clientAliases = computed(() => {
  const aliases = {};
  let count = 0;
  const clientNames = [...new Set(reportSelectedReflections.value.map(r => r.clients?.display_name).filter(Boolean))];
  clientNames.forEach(name => {
    aliases[name] = `Case ${String.fromCharCode(65 + count)}`; // Case A, Case B...
    count++;
  });
  return aliases;
});

const hasMore = ref(true);
const limit = 20;

function clearFilters() {
  searchQuery.value = '';
  selectedTheme.value = 'All';
}

onMounted(() => {
  loadReflections();
  window.addEventListener('keydown', closeMenuOnEscape);
});

onUnmounted(() => {
  window.removeEventListener('keydown', closeMenuOnEscape);
});

async function loadReflections(append = false) {
  if (!append) {
    loading.value = true;
    // Do not clear reflections if we are just switching views to avoid flicker
    if (activeView.value !== 'pack' && activeView.value !== 'insights') {
      reflections.value = [];
    }
  }
  error.value = null;
  try {
    const offset = append ? reflections.value.length : 0;
    const data = await getAllPrivateReflections({ offset, limit });
    if (append) {
      reflections.value = [...reflections.value, ...data];
    } else {
      reflections.value = data;
    }
    hasMore.value = data.length === limit;

    // Default new reflections to be selected for report if in pack
    data.forEach(r => {
      if (r.included_in_supervision) {
        reportSelectedIds.value.add(r.id);
        if (!packItemOptions.value[r.id]) {
          packItemOptions.value[r.id] = {
            includeText: true,
            includeDate: true,
            includeTheme: true,
            notes: ''
          };
        }
      }
    });
  } catch (err) {
    console.error('[Supervision] Load error:', err);
    error.value = 'Could not load reflections. Please try again.';
  } finally {
    loading.value = false;
  }
}

function openExportPreview() {
  exportPreviewOpen.value = true;
  document.body.style.overflow = 'hidden';
}

function closeExportPreview() {
  exportPreviewOpen.value = false;
  document.body.style.overflow = '';
}

async function copyExportText() {
  if (copying.value) return;
  copying.value = true;
  
  try {
    let text = "SUPERVISION REPORT\n";
    text += `Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
    
    if (therapistIntroduction.value) {
      text += `${therapistIntroduction.value}\n\n`;
    }
    
    reportSelectedReflections.value.forEach(r => {
      const opts = packItemOptions.value[r.id] || { includeText: true, includeDate: true, includeTheme: true };

      if (opts.includeDate) {
        text += `DATE: ${formatDate(r.created_at)}\n`;
      }
      
      if (opts.includeTheme && r.theme) {
        text += `THEME: ${r.theme}\n`;
      }
      
      const clientRef = exportOptions.value.includeClientReferences && r.clients?.display_name 
        ? r.clients.display_name 
        : (r.clients?.display_name ? clientAliases.value[r.clients.display_name] : 'Anonymous');
      text += `CASE: ${clientRef}\n`;
      
      if (opts.includeText) {
        text += `\n"${r.body}"\n\n`;
      } else {
        text += `\n`;
      }
      text += `-------------------\n\n`;
    });
    
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy:', err);
  } finally {
    setTimeout(() => {
      copying.value = false;
    }, 1000);
  }
}

function toggleReportSelection(id) {
  if (reportSelectedIds.value.has(id)) {
    reportSelectedIds.value.delete(id);
  } else {
    reportSelectedIds.value.add(id);
    if (!packItemOptions.value[id]) {
      packItemOptions.value[id] = {
        includeText: true,
        includeDate: true,
        includeTheme: true,
        notes: ''
      };
    }
  }
}

function togglePreparation(id) {
  if (expandedPreparationId.value === id) {
    expandedPreparationId.value = null;
  } else {
    expandedPreparationId.value = id;
  }
}

function printPack() {
  window.print();
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
      
      // Update report selection state
      if (updated.included_in_supervision) {
        reportSelectedIds.value.add(reflection.id);
        if (!packItemOptions.value[reflection.id]) {
          packItemOptions.value[reflection.id] = {
            includeText: true,
            includeDate: true,
            includeTheme: true,
            notes: ''
          };
        }
      } else {
        reportSelectedIds.value.delete(reflection.id);
        delete packItemOptions.value[reflection.id];
        if (expandedPreparationId.value === reflection.id) {
          expandedPreparationId.value = null;
        }
      }

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
    exportPreviewOpen.value = false;
    document.body.style.overflow = '';
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
