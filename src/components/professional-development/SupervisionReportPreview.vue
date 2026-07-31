<template>
  <div
    class="fixed inset-0 bg-backdrop/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 print:p-0 print:bg-white no-print"
    @click.self="$emit('close')"
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-modal-title"
    data-testid="supervision-report-preview"
  >
    <div class="w-full max-w-5xl bg-surface rounded-panel shadow-overlay max-h-[90vh] flex flex-col overflow-hidden border border-border">
      <div class="p-6 border-b border-border-muted flex justify-between items-center bg-surface-elevated">
        <div>
          <h2 id="export-modal-title" class="text-h2 font-semibold text-ink">Supervision Report Preview</h2>
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

      <div class="flex-1 flex flex-col md:flex-row overflow-hidden bg-surface-subtle">
        <!-- Options Sidebar -->
        <div class="w-full md:w-80 border-r border-border-muted bg-surface p-6 overflow-y-auto">
          <div class="space-y-6">
            <div>
              <h3 class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-4">Content Options</h3>
              <div class="space-y-4">
                <div class="p-3 bg-state-info-surface/50 rounded border border-state-info/20 text-caption text-ink-secondary mb-4">
                  <span class="font-bold text-state-info uppercase tracking-tighter block mb-1">Global Settings</span>
                  These settings apply to all items in the report unless overridden in the preparation panel.
                </div>
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative inline-block w-10 h-5 transition duration-200 ease-in-out bg-surface-subtle border border-border rounded-full">
                    <input 
                      type="checkbox" 
                      :checked="options.includeText"
                      @change="$emit('update-option', 'includeText', $event.target.checked)"
                      class="absolute block w-4 h-4 mt-0.5 ml-0.5 bg-white border border-border rounded-full appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:bg-state-selected"
                    />
                  </div>
                  <span class="text-body-sm font-medium text-ink group-hover:text-state-selected transition-colors">Include reflection text</span>
                </label>
                
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative inline-block w-10 h-5 transition duration-200 ease-in-out bg-surface-subtle border border-border rounded-full">
                    <input 
                      type="checkbox" 
                      :checked="options.includeThemes"
                      @change="$emit('update-option', 'includeThemes', $event.target.checked)"
                      class="absolute block w-4 h-4 mt-0.5 ml-0.5 bg-white border border-border rounded-full appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:bg-state-selected"
                    />
                  </div>
                  <span class="text-body-sm font-medium text-ink group-hover:text-state-selected transition-colors">Include themes</span>
                </label>

                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative inline-block w-10 h-5 transition duration-200 ease-in-out bg-surface-subtle border border-border rounded-full">
                    <input 
                      type="checkbox" 
                      :checked="options.includeDates"
                      @change="$emit('update-option', 'includeDates', $event.target.checked)"
                      class="absolute block w-4 h-4 mt-0.5 ml-0.5 bg-white border border-border rounded-full appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:bg-state-selected"
                    />
                  </div>
                  <span class="text-body-sm font-medium text-ink group-hover:text-state-selected transition-colors">Include dates</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-4">Privacy Options</h3>
              <div class="space-y-4">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative inline-block w-10 h-5 transition duration-200 ease-in-out bg-surface-subtle border border-border rounded-full">
                    <input 
                      type="checkbox" 
                      :checked="options.includeClientReferences"
                      @change="$emit('update-option', 'includeClientReferences', $event.target.checked)"
                      class="absolute block w-4 h-4 mt-0.5 ml-0.5 bg-white border border-border rounded-full appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:bg-state-selected"
                    />
                  </div>
                  <span class="text-body-sm font-medium text-ink group-hover:text-state-selected transition-colors">Include client names</span>
                </label>
                <div class="p-3 bg-state-info-surface border border-state-info/20 rounded-control text-caption text-ink-secondary">
                  <span class="font-bold text-state-info uppercase tracking-tighter block mb-1">Privacy Rule</span>
                  Client names are excluded by default. Session and Client UUIDs are always excluded from exports.
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-2">Introduction (Optional)</h3>
              <textarea 
                :value="introduction"
                @input="$emit('update-introduction', $event.target.value)"
                rows="4"
                placeholder="Add a brief introduction to your report..."
                class="w-full p-3 bg-surface border border-border rounded-control text-body-sm focus:ring-2 focus:ring-state-selected/20 focus:border-state-selected outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Preview Area -->
        <div class="flex-1 overflow-auto p-6 md:p-12 bg-surface-subtle flex justify-center">
          <div class="w-full max-w-[21cm] bg-white shadow-lg border border-border-muted min-h-full p-[2cm]" id="printable-pack">
            <div class="mb-12 pb-6 border-b-2 border-ink">
              <h1 class="text-3xl font-bold text-ink uppercase tracking-tighter">Supervision Report</h1>
              <p class="text-body-sm text-ink-muted mt-2">
                Generated on {{ new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }}
              </p>
            </div>

            <div v-if="introduction" class="mb-12">
              <p class="text-body-sm text-ink-secondary whitespace-pre-wrap leading-relaxed">{{ introduction }}</p>
            </div>

            <div v-for="reflection in reflections" :key="'export-' + reflection.id" class="break-inside-avoid mb-12">
              <div class="flex items-start justify-between mb-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="packItemOptions[reflection.id].includeDate" class="text-caption font-bold text-ink-muted uppercase tracking-widest">
                    {{ formatDate(reflection.created_at) }}
                  </span>
                  <span v-if="options.includeClientReferences" class="text-caption font-bold text-ink border-l-2 border-border pl-2">
                    {{ reflection.clients?.display_name || 'Anonymous' }}
                  </span>
                  <span v-else class="text-caption font-bold text-ink border-l-2 border-border pl-2">
                    {{ reflection.clients?.display_name ? clientAliases[reflection.clients.display_name] : 'Case Anonymous' }}
                  </span>
                </div>
                <span v-if="packItemOptions[reflection.id].includeTheme && reflection.theme" class="text-overline font-bold text-ink-secondary bg-surface-subtle px-2 py-0.5 rounded uppercase border border-border">
                  {{ reflection.theme }}
                </span>
              </div>

              <div v-if="packItemOptions[reflection.id].includeText" class="p-6 bg-surface-subtle rounded border-l-4 border-border-muted">
                <p class="text-body-sm text-ink italic leading-relaxed whitespace-pre-wrap">"{{ reflection.body }}"</p>
              </div>
            </div>

            <div v-if="reflections.length === 0" class="py-12 text-center italic text-ink-muted">
              No items selected for this report.
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-border-muted bg-surface flex justify-between items-center no-print">
        <button 
          @click="$emit('close')"
          class="px-6 py-2 text-body-sm font-bold text-ink-secondary hover:text-ink transition-colors"
        >
          Cancel
        </button>
        <div class="flex items-center gap-4">
          <button 
            @click="$emit('copy')"
            class="px-6 py-2.5 bg-surface border border-border text-ink text-body-sm font-bold rounded-pill hover:bg-surface-subtle transition-all flex items-center gap-2"
          >
            <span v-if="copying" class="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin"></span>
            <span v-else>📋</span>
            Copy Text
          </button>
          <button 
            @click="$emit('print')"
            class="px-8 py-2.5 bg-ink text-white text-body-sm font-bold rounded-pill hover:bg-ink-muted transition-all flex items-center gap-2 shadow-lg"
          >
            <span>🖨️</span>
            Print / PDF
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
