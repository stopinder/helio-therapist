<template>
  <div class="space-y-8 sm:space-y-12 animate-fadeUp">
    <!-- Rich Summary Header -->
    <div class="bg-surface-elevated p-6 sm:p-8 rounded-[2.5rem] border border-border-muted shadow-sm overflow-hidden">
      <div class="flex flex-col lg:flex-row justify-between gap-6 lg:gap-10">
        <div class="space-y-6 flex-1">
          <div>
            <h2 class="editorial-heading text-h1 text-ink mb-2">Supervision Workspace</h2>
            <p class="type-body text-ink-secondary max-w-xl">
              Thoughtfully prepare for your next supervision session. Review and anonymise your private reflections before generating a professional report.
            </p>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div class="space-y-1">
              <span class="type-overline text-ink-muted">Selected</span>
              <div class="text-h3 font-semibold text-ink">{{ selectedReflections.length }} Reflections</div>
            </div>
            <div class="space-y-1">
              <span class="type-overline text-ink-muted">Word Count</span>
              <div class="text-h3 font-semibold text-ink">~{{ totalWordCount }} words</div>
            </div>
            <div class="space-y-1">
              <span class="type-overline text-ink-muted">Anonymisation</span>
              <div class="text-h3 font-semibold text-state-success">Active</div>
            </div>
            <div class="space-y-1">
              <span class="type-overline text-ink-muted">Progress</span>
              <div class="text-h3 font-semibold text-ink">{{ preparationProgress }}%</div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between text-body-sm">
              <transition name="fade" mode="out-in">
                <span :key="progressMessage" class="font-medium text-ink-secondary animate-fadeUp">{{ progressMessage }}</span>
              </transition>
              <span class="text-ink-muted font-bold">{{ preparationProgress }}%</span>
            </div>
            <div class="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <div 
                class="h-full bg-action-primary transition-all duration-700 ease-out rounded-full"
                :style="{ width: preparationProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div class="flex flex-col justify-end lg:items-end gap-4 shrink-0">
          <button 
            v-if="reflections.length > 0"
            @click="$emit('create-report')"
            :disabled="selectedReflections.length === 0"
            class="button-primary px-8 py-3 rounded-pill shadow-lg flex items-center gap-2 group whitespace-nowrap"
          >
            <span>Create Supervision Report</span>
            <span class="transition-transform group-hover:translate-x-1">→</span>
          </button>
          
          <div class="flex items-center gap-2 text-caption text-ink-muted bg-surface-subtle px-4 py-2 rounded-pill border border-border-muted">
            <span>🛡️</span>
            Private preparation workspace
          </div>
        </div>
      </div>
    </div>

    <div v-if="reflections.length === 0" class="py-24 text-center bg-surface-subtle border border-border-muted rounded-[2.5rem]">
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
            class="group relative flex flex-col p-0 bg-surface-elevated border border-border-muted rounded-[1.5rem] shadow-sm transition-all duration-slow overflow-hidden"
            :class="[
              expandedPreparationId === reflection.id ? 'ring-2 ring-state-reflection-focus shadow-elevated z-30' : 'hover:border-border-strong hover:shadow-md z-10',
              reportSelectedIds.has(reflection.id) ? '' : 'opacity-60 grayscale-[0.5]'
            ]"
            data-testid="supervision-pack-row"
          >
            <!-- Card Header -->
            <div 
              class="p-4 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
              @click="$emit('toggle-preparation', reflection.id)"
            >
              <div class="flex items-center gap-4 shrink-0">
                <input 
                  type="checkbox" 
                  :checked="reportSelectedIds.has(reflection.id)"
                  @click.stop
                  @change="$emit('toggle-report-selection', reflection.id)"
                  class="w-6 h-6 rounded-full border-border text-action-primary focus:ring-action-primary/20 cursor-pointer transition-all"
                  aria-label="Include in next report"
                />
                <div class="w-12 h-12 rounded-full bg-avatar flex items-center justify-center text-ink font-semibold border border-border-muted shadow-inner">
                  {{ getInitials(reflection.clients?.display_name ? clientAliases[reflection.clients.display_name] : 'Anonymous') }}
                </div>
              </div>

              <div class="flex-1 min-w-0 space-y-2">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="type-overline text-ink-subtle">
                    {{ formatDate(reflection.created_at) }}
                  </span>
                  <span v-if="reflection.theme" class="px-2.5 py-1 bg-surface-subtle text-caption font-bold text-ink-secondary uppercase rounded-full border border-border">
                    {{ reflection.theme }}
                  </span>
                  <span class="text-caption text-ink-muted">
                    ~{{ getWordCount(reflection.body) }} words
                  </span>
                </div>

                <h4 class="text-body font-semibold text-ink truncate group-hover:text-action-primary transition-colors">
                  {{ getTitle(reflection) }}
                </h4>
              </div>

              <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <button
                  @click.stop="$emit('remove-from-pack', reflection)"
                  :disabled="actionLoading === reflection.id"
                  class="p-2 text-ink-muted hover:text-state-danger hover:bg-state-danger-surface rounded-control transition-all"
                  aria-label="Remove from Pack"
                >
                  <span v-if="actionLoading === reflection.id" class="w-4 h-4 border-2 border-state-danger border-t-transparent rounded-full animate-spin"></span>
                  <span v-else>🗑️</span>
                </button>
                
                <div class="w-px h-6 bg-border-muted mx-1"></div>

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
              enter-from-class="max-h-0 opacity-0 transform translate-y-4"
              enter-to-class="max-h-[2000px] opacity-100 transform translate-y-0"
              leave-from-class="max-h-[2000px] opacity-100 transform translate-y-0"
              leave-to-class="max-h-0 opacity-0 transform translate-y-4"
            >
              <div v-if="expandedPreparationId === reflection.id" class="bg-surface-reflection border-t border-border-reflection">
                <div class="p-8 md:p-12">
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <!-- Left Column: Preview & Metadata -->
                    <div class="space-y-8 animate-expandIn">
                      <div class="space-y-4">
                        <div class="flex items-center justify-between border-b border-border-reflection/40 pb-2">
                          <h5 class="type-overline text-ink-muted">Reflection Preview</h5>
                          <button @click="$emit('open-reflection', reflection)" class="text-body-sm font-semibold text-action-link hover:underline">
                            Open full detail
                          </button>
                        </div>
                        <div class="editorial-heading text-h3 text-ink-secondary italic leading-relaxed bg-white/40 p-6 rounded-panel border border-border-reflection/30">
                          "{{ reflection.body || 'No content' }}"
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-1">
                          <span class="type-overline text-ink-muted">Client Reference</span>
                          <div class="text-body font-medium text-ink">
                            {{ reflection.clients?.display_name || 'Anonymous' }}
                          </div>
                        </div>
                        <div class="space-y-1" v-if="reflection.session_ref">
                          <span class="type-overline text-ink-muted">Related Session</span>
                          <button @click="$emit('go-to-session', reflection)" class="text-body font-medium text-action-link hover:underline block text-left">
                            View Session Detail
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Right Column: Preparation & Controls -->
                    <div class="space-y-8 animate-expandIn" style="animation-delay: 50ms;">
                      <div class="space-y-4">
                        <h5 class="type-overline text-ink-muted border-b border-border-reflection/40 pb-2">Preparation Notes</h5>
                        <textarea 
                          v-model="packItemOptions[reflection.id].notes"
                          placeholder="Add any specific questions or points you want to raise in supervision..."
                          class="w-full h-32 p-4 bg-white/60 border border-border-reflection rounded-panel text-body focus:ring-2 focus:ring-state-reflection-focus outline-none transition-all resize-none"
                          aria-label="Preparation notes for supervision"
                        ></textarea>
                      </div>

                      <div class="space-y-6">
                        <div class="flex items-center justify-between p-4 bg-white/60 rounded-panel border border-border-reflection/40">
                          <div class="flex items-start gap-3">
                            <span class="text-xl">🛡️</span>
                            <div>
                              <div class="text-body-sm font-bold text-ink">Anonymisation Status</div>
                              <div class="text-caption text-ink-muted mt-0.5">Using alias: {{ reflection.clients?.display_name ? clientAliases[reflection.clients.display_name] : 'Anonymous' }}</div>
                            </div>
                          </div>
                          <div class="px-3 py-1 bg-state-success-surface text-caption font-bold text-state-success uppercase rounded-pill border border-state-success/20">
                            Secure
                          </div>
                        </div>

                        <div class="space-y-3">
                          <h5 class="type-overline text-ink-muted">Inclusion Controls</h5>
                          
                          <div class="flex flex-wrap gap-4">
                            <label class="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                v-model="packItemOptions[reflection.id].includeText"
                                class="w-5 h-5 rounded border-border-reflection text-action-primary focus:ring-action-primary/20"
                              />
                              <span class="text-body-sm font-medium text-ink group-hover:text-action-primary transition-colors">Include reflection body</span>
                            </label>

                            <label class="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                v-model="packItemOptions[reflection.id].includeDate"
                                class="w-5 h-5 rounded border-border-reflection text-action-primary focus:ring-action-primary/20"
                              />
                              <span class="text-body-sm font-medium text-ink group-hover:text-action-primary transition-colors">Include date</span>
                            </label>

                            <label class="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                v-model="packItemOptions[reflection.id].includeTheme"
                                class="w-5 h-5 rounded border-border-reflection text-action-primary focus:ring-action-primary/20"
                              />
                              <span class="text-body-sm font-medium text-ink group-hover:text-action-primary transition-colors">Include theme</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="mt-12 pt-8 border-t border-border-reflection/40 flex justify-end">
                    <button 
                      @click="$emit('toggle-preparation', reflection.id)"
                      class="group/btn flex items-center gap-2 px-6 py-2.5 text-body-sm font-semibold text-ink-muted hover:text-ink transition-all"
                    >
                      <span class="transition-transform group-hover/btn:-translate-y-0.5">↑</span>
                      Collapse Workspace
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

const preparationProgress = computed(() => {
  if (props.reflections.length === 0) return 0;
  // Progress is based on number of selected reflections
  return Math.round((props.selectedReflections.length / props.reflections.length) * 100);
});

const progressMessage = computed(() => {
  if (preparationProgress.value === 0) return 'Select reflections to begin preparing your supervision session.';
  if (preparationProgress.value < 100) return 'Your supervision portfolio is taking shape.';
  return 'Ready for your next supervision conversation.';
});

const getWordCount = (text) => {
  if (!text) return 0;
  return text.trim() ? text.trim().split(/\s+/).length : 0;
};

const getTitle = (reflection) => {
  if (reflection.theme) return reflection.theme;
  if (!reflection.body) return 'Untitled Reflection';
  const firstLine = reflection.body.split('\n')[0];
  return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
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
