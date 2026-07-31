<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-state-info-surface p-6 rounded-panel border border-state-info/20 shadow-sm">
      <div class="flex items-start gap-4">
        <span class="text-2xl mt-0.5">🔒</span>
        <div>
          <h3 class="text-body font-bold text-ink">Supervision Pack</h3>
          <p class="text-body-sm text-ink-secondary mt-1 max-w-2xl">
            The Supervision Pack is your private collection of material selected for supervision. Review and anonymise it before creating a report.
          </p>
          <div class="mt-4 flex flex-col gap-2">
            <p class="text-caption text-state-info font-medium flex items-center gap-1.5">
              <span>⚠️</span>
              Review and remove identifying information before sharing outside Helios.
            </p>
            <p class="text-caption text-ink-muted">
              {{ selectedReflections.length }} of {{ reflections.length }} selected for report
            </p>
          </div>
        </div>
      </div>
      <button 
        v-if="reflections.length > 0"
        @click="$emit('create-report')"
        :disabled="selectedReflections.length === 0"
        class="px-6 py-2.5 bg-state-selected text-white text-body-sm font-bold rounded-pill hover:bg-state-selected-hover transition-all shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>📄</span>
        Create Supervision Report
      </button>
    </div>

    <div v-if="reflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel shadow-sm">
      <p class="text-body text-ink-subtle italic">No reflections have been added to your Supervision Pack.</p>
      <p class="text-caption text-ink-muted mt-2">Add reflections from a session or from your Professional Development timeline.</p>
    </div>

    <div v-else class="space-y-12">
      <div v-for="group in groupedReflections" :key="'pack-group-' + group.monthYear" class="space-y-4">
        <h3 class="text-overline font-bold text-ink-muted uppercase tracking-widest pl-1 border-l-2 border-border-muted">
          {{ group.monthYear }}
        </h3>
        
        <div class="space-y-4">
          <div
            v-for="reflection in group.items"
            :key="'pack-' + reflection.id"
            class="flex flex-col p-4 bg-surface-elevated border border-border-muted rounded-panel shadow-sm transition-all focus-within:ring-2 focus-within:ring-state-selected/20 focus-within:border-state-selected"
            :class="reportSelectedIds.has(reflection.id) ? 'border-state-selected/30 bg-state-selected/[0.02]' : ''"
            data-testid="supervision-pack-row"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-start gap-4 flex-1 min-w-0">
                <div class="pt-1 shrink-0">
                  <input 
                    type="checkbox" 
                    :checked="reportSelectedIds.has(reflection.id)"
                    @change="$emit('toggle-report-selection', reflection.id)"
                    class="w-5 h-5 rounded border-border text-state-selected focus:ring-state-selected/20 cursor-pointer"
                    title="Include in next report"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
                      {{ formatDate(reflection.created_at) }}
                    </span>
                    <span v-if="reflection.theme" class="px-2 py-1 bg-surface-subtle text-caption font-bold text-ink-secondary uppercase rounded-full border border-border truncate max-w-[150px]">
                      {{ reflection.theme }}
                    </span>
                    <span v-else class="text-caption text-ink-muted italic">No theme</span>
                  </div>

                  <div v-if="reflection.clients?.display_name" class="flex items-center gap-1.5 text-body-sm text-ink font-semibold mb-2">
                    <span class="text-xs">👤</span>
                    {{ reflection.clients.display_name }}
                  </div>

                  <p class="text-body-sm text-ink-secondary line-clamp-2 italic leading-relaxed">
                    "{{ reflection.body || 'No content' }}"
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  v-if="reflection.client_id && reflection.session_ref"
                  @click="$emit('go-to-session', reflection)"
                  class="p-2 text-ink-muted hover:text-state-selected hover:bg-surface-subtle rounded-control transition-all"
                  title="Open session"
                >
                  <span>📅</span>
                </button>
                <button
                  @click="$emit('open-reflection', reflection)"
                  class="px-3 py-1.5 text-body-sm text-ink-muted font-bold hover:bg-surface-subtle rounded-control transition-colors"
                  data-testid="open-original-reflection"
                >
                  Open original reflection
                </button>
                <button
                  @click="$emit('toggle-preparation', reflection.id)"
                  class="px-3 py-1.5 text-body-sm text-state-selected font-bold hover:bg-state-selected/10 rounded-control transition-colors flex items-center gap-1"
                  data-testid="supervision-pack-expand"
                >
                  <span>{{ expandedPreparationId === reflection.id ? 'Collapse' : 'Expand' }} preparation</span>
                  <span class="text-xs transition-transform duration-200" :class="expandedPreparationId === reflection.id ? 'rotate-180' : ''">▼</span>
                </button>
                <button
                  @click="$emit('remove-from-pack', reflection)"
                  :disabled="actionLoading === reflection.id"
                  class="p-2 text-ink-muted hover:text-state-danger hover:bg-state-danger-surface rounded-control transition-all"
                  title="Remove from Pack"
                >
                  <span v-if="actionLoading === reflection.id" class="w-4 h-4 border-2 border-state-danger border-t-transparent rounded-full animate-spin"></span>
                  <span v-else>🗑️</span>
                </button>
              </div>
            </div>

            <!-- Expanded Preparation Panel -->
            <div 
              v-if="expandedPreparationId === reflection.id" 
              class="mt-4 pt-4 border-t border-border-muted animate-in slide-in-from-top-2 duration-200"
              data-testid="supervision-pack-inline-preparation"
            >
              <div class="bg-surface-subtle p-4 rounded-control border border-border">
                <div class="flex flex-col md:flex-row gap-6">
                  <div class="flex-1 space-y-4">
                    <div class="flex items-center justify-between">
                      <h4 class="text-caption font-bold text-ink-muted uppercase tracking-wider">Report Alias</h4>
                      <span class="px-2 py-0.5 bg-surface text-caption font-bold text-ink rounded border border-border">
                        {{ reflection.clients?.display_name ? clientAliases[reflection.clients.display_name] : 'Anonymous' }}
                      </span>
                    </div>
                    
                    <div>
                      <h4 class="text-caption font-bold text-ink-muted uppercase tracking-wider mb-2">Content Preview</h4>
                      <p class="text-body-sm text-ink-secondary leading-relaxed bg-surface p-3 rounded border border-border-muted italic">
                        {{ reflection.body }}
                      </p>
                    </div>

                    <div class="p-3 bg-state-info-surface/50 rounded border border-state-info/10 text-caption text-ink-secondary flex items-start gap-2">
                      <span class="mt-0.5">💡</span>
                      <span>Privacy reminder: Content should be reviewed for identifying details before sharing.</span>
                    </div>
                  </div>

                  <div class="w-full md:w-64 space-y-3">
                    <h4 class="text-caption font-bold text-ink-muted uppercase tracking-wider mb-3">Include in report:</h4>
                    
                    <label class="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        v-model="packItemOptions[reflection.id].includeText"
                        class="w-4 h-4 rounded border-border text-state-selected focus:ring-state-selected/20"
                      />
                      <span class="text-body-sm text-ink group-hover:text-state-selected transition-colors">Reflection text</span>
                    </label>

                    <label class="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        v-model="packItemOptions[reflection.id].includeDate"
                        class="w-4 h-4 rounded border-border text-state-selected focus:ring-state-selected/20"
                      />
                      <span class="text-body-sm text-ink group-hover:text-state-selected transition-colors">Reflection date</span>
                    </label>

                    <label class="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        v-model="packItemOptions[reflection.id].includeTheme"
                        class="w-4 h-4 rounded border-border text-state-selected focus:ring-state-selected/20"
                      />
                      <span class="text-body-sm text-ink group-hover:text-state-selected transition-colors">Learning theme</span>
                    </label>
                  </div>
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
import { computed } from 'vue';

const props = defineProps({
  reflections: {
    type: Array,
    required: true
  },
  selectedReflections: {
    type: Array,
    required: true
  },
  reportSelectedIds: {
    type: Object, // Set
    required: true
  },
  expandedPreparationId: {
    type: [String, Number, null],
    required: true
  },
  packItemOptions: {
    type: Object,
    required: true
  },
  clientAliases: {
    type: Object,
    required: true
  },
  actionLoading: {
    type: [String, Number, null],
    default: null
  }
});

defineEmits([
  'create-report',
  'toggle-report-selection',
  'go-to-session',
  'open-reflection',
  'toggle-preparation',
  'remove-from-pack'
]);

const groupedReflections = computed(() => {
  const groups = {};
  props.reflections.forEach(reflection => {
    const date = new Date(reflection.created_at);
    const monthYear = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(reflection);
  });
  
  return Object.entries(groups).map(([monthYear, items]) => ({
    monthYear,
    items: items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  })).sort((a, b) => {
    const dateA = new Date(a.items[0].created_at);
    const dateB = new Date(b.items[0].created_at);
    return dateB - dateA;
  });
});

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
