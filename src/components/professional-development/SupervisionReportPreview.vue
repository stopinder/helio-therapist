<template>
  <div
    class="fixed inset-0 bg-backdrop/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 print:p-0 print:bg-white no-print"
    @click.self="$emit('close')"
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-modal-title"
    data-testid="supervision-report-preview"
  >
    <div class="w-full max-w-5xl bg-surface rounded-[2.5rem] shadow-overlay max-h-[90vh] flex flex-col overflow-hidden border border-border">
      <div class="p-8 border-b border-border-muted flex justify-between items-center bg-surface-elevated">
        <div>
          <h2 id="export-modal-title" class="editorial-heading text-h2 text-ink">Supervision Report Preview</h2>
          <p class="text-caption text-ink-muted mt-1">Review your content and anonymise before printing or copying.</p>
        </div>
        <button 
          @click="$emit('close')"
          class="p-2 text-ink-muted hover:text-ink transition-colors rounded-control hover:bg-surface-subtle"
          aria-label="Close export preview"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 flex flex-col lg:flex-row overflow-hidden bg-surface-subtle">
        <!-- Options Sidebar -->
        <div class="w-full lg:w-80 border-r border-border-muted bg-surface p-8 overflow-y-auto">
          <div class="space-y-8">
            <div>
              <h3 class="type-overline text-ink-muted mb-4">Content Options</h3>
              <div class="space-y-4">
                <div class="p-4 bg-state-info-surface/30 rounded-panel border border-state-info/10 text-caption text-ink-secondary mb-4 italic">
                  Global settings apply to all items unless overridden.
                </div>
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative inline-block w-10 h-5 transition duration-200 ease-in-out bg-surface-muted border border-border-muted rounded-full">
                    <input 
                      type="checkbox" 
                      :checked="options.includeText"
                      @change="$emit('update-option', 'includeText', $event.target.checked)"
                      class="absolute block w-4 h-4 mt-0.5 ml-0.5 bg-white border border-border-muted rounded-full appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:bg-action-primary"
                    />
                  </div>
                  <span class="text-body-sm font-medium text-ink group-hover:text-action-primary transition-colors">Include reflection text</span>
                </label>
                
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative inline-block w-10 h-5 transition duration-200 ease-in-out bg-surface-muted border border-border-muted rounded-full">
                    <input 
                      type="checkbox" 
                      :checked="options.includeThemes"
                      @change="$emit('update-option', 'includeThemes', $event.target.checked)"
                      class="absolute block w-4 h-4 mt-0.5 ml-0.5 bg-white border border-border-muted rounded-full appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:bg-action-primary"
                    />
                  </div>
                  <span class="text-body-sm font-medium text-ink group-hover:text-action-primary transition-colors">Include themes</span>
                </label>

                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative inline-block w-10 h-5 transition duration-200 ease-in-out bg-surface-muted border border-border-muted rounded-full">
                    <input 
                      type="checkbox" 
                      :checked="options.includeDates"
                      @change="$emit('update-option', 'includeDates', $event.target.checked)"
                      class="absolute block w-4 h-4 mt-0.5 ml-0.5 bg-white border border-border-muted rounded-full appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:bg-action-primary"
                    />
                  </div>
                  <span class="text-body-sm font-medium text-ink group-hover:text-action-primary transition-colors">Include dates</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="type-overline text-ink-muted mb-4">Privacy Options</h3>
              <div class="space-y-4">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative inline-block w-10 h-5 transition duration-200 ease-in-out bg-surface-muted border border-border-muted rounded-full">
                    <input 
                      type="checkbox" 
                      :checked="options.includeClientReferences"
                      @change="$emit('update-option', 'includeClientReferences', $event.target.checked)"
                      class="absolute block w-4 h-4 mt-0.5 ml-0.5 bg-white border border-border-muted rounded-full appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:bg-action-primary"
                    />
                  </div>
                  <span class="text-body-sm font-medium text-ink group-hover:text-action-primary transition-colors">Include client names</span>
                </label>
                <div class="p-4 bg-surface-subtle border border-border-muted rounded-panel text-caption text-ink-muted">
                  Client names are excluded by default. Case aliases are used to maintain privacy.
                </div>
              </div>
            </div>

            <div>
              <h3 class="type-overline text-ink-muted mb-2">Introduction</h3>
              <textarea 
                :value="introduction"
                @input="$emit('update-introduction', $event.target.value)"
                rows="4"
                placeholder="Add a brief introduction to your report..."
                class="w-full p-4 bg-surface border border-border rounded-control text-body focus:ring-2 focus:ring-action-primary outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Preview Area -->
        <div class="flex-1 overflow-auto p-8 lg:p-16 bg-surface-subtle flex justify-center">
          <div class="w-full max-w-[21cm] bg-white shadow-lg border border-border-muted min-h-full p-[2cm] animate-expandIn" id="printable-pack">
            <div class="mb-16 pb-8 border-b-2 border-ink">
              <h1 class="editorial-heading text-display text-ink uppercase tracking-tighter">Supervision Report</h1>
              <p class="text-body-sm text-ink-muted mt-2">
                Generated on {{ new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }}
              </p>
            </div>

            <div v-if="introduction" class="mb-16">
              <p class="editorial-heading text-h3 text-ink-secondary whitespace-pre-wrap leading-relaxed italic">{{ introduction }}</p>
            </div>

            <div v-for="reflection in reflections" :key="'export-' + reflection.id" class="break-inside-avoid mb-16">
              <div class="flex items-start justify-between mb-6">
                <div class="flex flex-wrap items-center gap-3">
                  <span v-if="packItemOptions[reflection.id].includeDate" class="type-overline text-ink-muted">
                    {{ formatDate(reflection.created_at) }}
                  </span>
                  <span class="w-px h-3 bg-border-muted mx-1" v-if="packItemOptions[reflection.id].includeDate"></span>
                  <span v-if="options.includeClientReferences" class="text-body font-semibold text-ink">
                    {{ reflection.clients?.display_name || 'Anonymous' }}
                  </span>
                  <span v-else class="text-body font-semibold text-ink">
                    {{ reflection.clients?.display_name ? clientAliases[reflection.clients.display_name] : 'Case Anonymous' }}
                  </span>
                </div>
                <span v-if="packItemOptions[reflection.id].includeTheme && reflection.theme" class="px-2.5 py-1 bg-surface-subtle text-caption font-bold text-ink-secondary uppercase rounded-full border border-border">
                  {{ reflection.theme }}
                </span>
              </div>

              <div v-if="packItemOptions[reflection.id].includeText" class="p-8 bg-surface-subtle rounded-[1.5rem] border-l-4 border-action-primary">
                <p class="editorial-heading text-h3 text-ink italic leading-relaxed whitespace-pre-wrap">"{{ reflection.body }}"</p>
                <div v-if="packItemOptions[reflection.id].notes" class="mt-6 pt-6 border-t border-border-muted">
                  <h5 class="type-overline text-ink-muted mb-2">Preparation Note:</h5>
                  <p class="text-body-sm text-ink-secondary whitespace-pre-wrap">{{ packItemOptions[reflection.id].notes }}</p>
                </div>
              </div>
            </div>

            <div v-if="reflections.length === 0" class="py-24 text-center italic text-ink-muted editorial-heading text-h3">
              No items selected for this report.
            </div>
          </div>
        </div>
      </div>

      <div class="p-8 border-t border-border-muted bg-surface flex justify-between items-center no-print">
        <button 
          @click="$emit('close')"
          class="button-secondary"
        >
          Back to Workspace
        </button>
        <div class="flex items-center gap-4">
          <button 
            @click="$emit('copy')"
            class="button-secondary bg-surface-subtle border-border shadow-sm flex items-center gap-2"
          >
            <span v-if="copying" class="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin"></span>
            <span v-else>📋</span>
            Copy Text
          </button>
          <button 
            @click="$emit('print')"
            class="button-primary px-10 shadow-lg flex items-center gap-2"
          >
            <span>🖨️</span>
            Print Report
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  reflections: {
    type: Array,
    required: true
  },
  options: {
    type: Object,
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
  introduction: {
    type: String,
    default: ''
  },
  copying: {
    type: Boolean,
    default: false
  }
});

defineEmits([
  'close',
  'update-option',
  'update-introduction',
  'copy',
  'print'
]);

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

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }
  
  #printable-pack {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    max-width: none !important;
  }
}
</style>
