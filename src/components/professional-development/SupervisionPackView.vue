<template>
  <div class="space-y-12 animate-fadeUp">
    <!-- Compact Preparation Summary -->
    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pb-8 border-b border-border-muted">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 flex-1 w-full lg:w-auto">
        <div class="space-y-1">
          <span class="type-overline text-ink-muted">Included</span>
          <div class="text-h3 font-semibold text-ink">{{ selectedReflections.length }} reflections</div>
        </div>
        <div class="space-y-1">
          <span class="type-overline text-ink-muted">Approximate length</span>
          <div class="text-h3 font-semibold text-ink">~{{ totalWordCount }} words</div>
        </div>
        <div class="space-y-1">
          <span class="type-overline text-ink-muted">Preparation notes</span>
          <div class="text-h3 font-semibold text-ink">{{ notesCount }} of {{ reflections.length }} added</div>
        </div>
        <div class="space-y-1">
          <span class="type-overline text-ink-muted">Privacy</span>
          <div class="text-h3 font-semibold text-state-success">Anonymised</div>
        </div>
      </div>

      <div class="flex flex-col items-end gap-3 w-full lg:w-auto shrink-0">
        <button 
          v-if="reflections.length > 0"
          @click="$emit('create-report')"
          :disabled="selectedReflections.length === 0"
          class="button-primary px-8 py-3 rounded-pill shadow-lg flex items-center gap-2 group whitespace-nowrap"
        >
          <span>Create Supervision Report</span>
          <span class="transition-transform group-hover:translate-x-1">→</span>
        </button>
        <p class="text-caption text-ink-muted italic">
          {{ progressMessage }}
        </p>
      </div>
    </div>

    <div v-if="reflections.length === 0" class="py-24 text-center bg-surface-subtle border border-border-muted rounded-panel">
      <div class="max-w-md mx-auto px-8">
        <div class="text-5xl mb-8 opacity-60">📁</div>
        <p class="type-body-long text-ink-muted italic leading-relaxed">
          Your Supervision Pack is empty. Add reflections from your timeline or session debriefs to begin preparing your supervision portfolio.
        </p>
      </div>
    </div>

    <div v-else class="space-y-8 md:space-y-16 px-4 md:px-0">
      <div v-for="group in groupedReflections" :key="'pack-group-' + group.monthYear" class="space-y-8">
        <h3 class="editorial-heading text-h2 text-ink border-b border-border-muted pb-4 sticky top-0 bg-surface-canvas/90 backdrop-blur-sm z-20 py-6">
          {{ group.monthYear }}
        </h3>
        
        <div class="space-y-6">
          <div
            v-for="reflection in group.items"
            :key="'pack-' + reflection.id"
            class="group relative flex flex-col p-0 bg-surface border border-border-muted rounded-panel shadow-sm transition-all duration-slow overflow-hidden"
            :class="[
              expandedPreparationId === reflection.id ? 'ring-2 ring-state-selected shadow-md z-30' : 'hover:border-border-strong z-10',
              reportSelectedIds.has(reflection.id) ? '' : 'opacity-60'
            ]"
            data-testid="supervision-pack-row"
          >
            <!-- Card Header -->
            <div 
              class="p-4 sm:p-5 cursor-pointer flex items-center gap-4"
              @click="$emit('toggle-preparation', reflection.id)"
            >
              <div class="flex items-center gap-3 shrink-0">
                <input 
                  type="checkbox" 
                  :checked="reportSelectedIds.has(reflection.id)"
                  @click.stop
                  @change="$emit('toggle-report-selection', reflection.id)"
                  class="w-5 h-5 rounded-full border-border text-action-primary focus:ring-action-primary/20 cursor-pointer transition-all"
                  aria-label="Include in report"
                />
              </div>

              <div class="flex-1 min-w-0 flex items-center gap-4">
                <div class="text-body-sm font-semibold text-ink whitespace-nowrap">
                  {{ reflection.clients?.display_name ? clientAliases[reflection.clients.display_name] : 'Anonymous' }}
                </div>
                
                <div class="text-caption text-ink-muted whitespace-nowrap">
                  {{ formatDate(reflection.created_at) }}
                </div>

                <div v-if="reflection.theme" class="px-2 py-0.5 bg-surface-subtle text-overline font-bold text-ink-muted uppercase rounded-full border border-border truncate max-w-[120px]">
                  {{ reflection.theme }}
                </div>

                <div class="text-caption text-ink-muted italic truncate flex-1">
                  {{ getReflectionPreview(reflection.body) }}
                </div>

                <div class="text-caption text-ink-muted shrink-0">
                  ~{{ getWordCount(reflection.body) }} words
                </div>
              </div>

              <div class="flex items-center shrink-0">
                <div class="text-ink-subtle transition-transform duration-standard" :class="{ 'rotate-180': expandedPreparationId === reflection.id }">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Expanded Preparation Panel (Two Column) -->
            <transition
              enter-active-class="transition-all duration-slow ease-out"
              leave-active-class="transition-all duration-standard ease-in"
              enter-from-class="max-h-0 opacity-0"
              enter-to-class="max-h-[2000px] opacity-100"
              leave-from-class="max-h-[2000px] opacity-100"
              leave-to-class="max-h-0 opacity-0"
            >
              <div v-if="expandedPreparationId === reflection.id" class="bg-surface-subtle border-t border-border-muted">
                <div class="p-6 md:p-8">
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                    <!-- Left Column: Preview & Metadata -->
                    <div class="space-y-6">
                      <div class="space-y-3">
                        <div class="flex items-center justify-between border-b border-border-muted pb-2">
                          <h5 class="type-overline text-ink-muted">Reflection Preview</h5>
                          <button @click="$emit('open-reflection', reflection)" class="text-body-sm font-semibold text-action-link hover:underline">
                            Open full detail
                          </button>
                        </div>
                        <div class="text-body text-ink-secondary italic leading-relaxed bg-white/40 p-5 rounded-panel border border-border-muted/30">
                          "{{ reflection.body || 'No content' }}"
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <span class="type-overline text-ink-muted">Client</span>
                          <div class="text-body-sm font-medium text-ink">
                            {{ reflection.clients?.display_name || 'Anonymous' }}
                          </div>
                        </div>
                        <div class="space-y-1" v-if="reflection.session_ref">
                          <span class="type-overline text-ink-muted">Related Session</span>
                          <button @click="$emit('go-to-session', reflection)" class="text-body-sm font-medium text-action-link hover:underline block text-left">
                            View Session Detail
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Right Column: Preparation & Controls -->
                    <div class="space-y-6">
                      <div class="space-y-3">
                        <h5 class="type-overline text-ink-muted border-b border-border-muted pb-2">Preparation Notes</h5>
                        <textarea 
                          v-model="packItemOptions[reflection.id].notes"
                          placeholder="Add any specific questions or points you want to raise in supervision..."
                          class="w-full h-32 p-4 bg-white/60 border border-border-muted rounded-panel text-body focus:ring-2 focus:ring-action-primary/20 outline-none transition-all resize-none"
                          aria-label="Preparation notes for supervision"
                        ></textarea>
                      </div>

                      <div class="space-y-4">
                        <div class="flex items-center justify-between p-3 bg-white/60 rounded-panel border border-border-muted/40">
                          <div class="flex items-center gap-3">
                            <span class="text-lg">🛡️</span>
                            <div>
                              <div class="text-caption font-bold text-ink">Anonymisation Status</div>
                              <div class="text-caption text-ink-muted">Using alias: {{ reflection.clients?.display_name ? clientAliases[reflection.clients.display_name] : 'Anonymous' }}</div>
                            </div>
                          </div>
                          <div class="px-2 py-0.5 bg-state-success-surface text-overline font-bold text-state-success uppercase rounded-pill border border-state-success/20">
                            Secure
                          </div>
                        </div>

                        <div class="space-y-3">
                          <h5 class="type-overline text-ink-muted">Inclusion Controls</h5>
                          
                          <div class="flex flex-col gap-2">
                            <label class="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                v-model="packItemOptions[reflection.id].includeText"
                                class="w-4 h-4 rounded border-border-muted text-action-primary focus:ring-action-primary/20"
                              />
                              <span class="text-caption font-medium text-ink group-hover:text-action-primary transition-colors">Include reflection body</span>
                            </label>

                            <label class="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                v-model="packItemOptions[reflection.id].includeDate"
                                class="w-4 h-4 rounded border-border-muted text-action-primary focus:ring-action-primary/20"
                              />
                              <span class="text-caption font-medium text-ink group-hover:text-action-primary transition-colors">Include date</span>
                            </label>

                            <label class="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                v-model="packItemOptions[reflection.id].includeTheme"
                                class="w-4 h-4 rounded border-border-muted text-action-primary focus:ring-action-primary/20"
                              />
                              <span class="text-caption font-medium text-ink group-hover:text-action-primary transition-colors">Include theme</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="mt-8 pt-6 border-t border-border-muted flex justify-between items-center">
                    <button 
                      @click="$emit('remove-from-pack', reflection)"
                      :disabled="actionLoading === reflection.id"
                      class="text-caption font-bold text-state-danger hover:underline flex items-center gap-2 px-3 py-1 rounded-pill hover:bg-state-danger-surface transition-all"
                      aria-label="Remove this reflection from the supervision report. The private reflection is not deleted."
                    >
                      <span v-if="actionLoading === reflection.id" class="w-3 h-3 border-2 border-state-danger border-t-transparent rounded-full animate-spin"></span>
                      <span>Remove from Supervision</span>
                    </button>

                    <button 
                      @click="$emit('toggle-preparation', reflection.id)"
                      class="flex items-center gap-2 text-caption font-bold text-ink-muted hover:text-ink transition-all"
                    >
                      Collapse
                    </button>
                  </div>
                </div>
              </div>
            </transition>
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

const totalWordCount = computed(() => {
  return props.selectedReflections.reduce((acc, r) => {
    const body = r.body || '';
    return acc + (body.trim() ? body.trim().split(/\s+/).length : 0);
  }, 0);
});

const notesCount = computed(() => {
  return props.reflections.filter(r => props.packItemOptions[r.id]?.notes?.trim()).length;
});

const progressMessage = computed(() => {
  if (props.selectedReflections.length === 0) return 'Select reflections to begin preparing your supervision session.';
  if (notesCount.value < props.selectedReflections.length) return 'Add preparation notes when they would help you frame the discussion.';
  return 'Your selected reflections are ready to review.';
});

const getWordCount = (text) => {
  if (!text) return 0;
  return text.trim() ? text.trim().split(/\s+/).length : 0;
};

const getReflectionPreview = (body) => {
  if (!body) return 'No content';
  const text = body.split('\n')[0];
  return text.length > 60 ? text.substring(0, 60) + '...' : text;
};

const getInitials = (name) => {
  if (!name) return 'A';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

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
