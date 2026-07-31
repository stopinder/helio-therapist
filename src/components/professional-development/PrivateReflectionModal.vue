<template>
  <div
    class="fixed inset-0 bg-backdrop/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print"
    @click.self="$emit('close')"
    role="dialog"
    aria-modal="true"
    aria-labelledby="detail-modal-title"
    data-testid="private-reflection-modal"
  >
    <div class="w-full max-w-2xl bg-surface-elevated rounded-panel shadow-overlay max-h-[90vh] flex flex-col overflow-hidden border border-border">
      <div class="p-6 border-b border-border-muted flex justify-between items-start">
        <div>
          <h2 id="detail-modal-title" class="text-h2 font-semibold text-ink">Private Reflection</h2>
          <div class="mt-2 flex flex-wrap gap-2">
            <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
              {{ formatDate(reflection.created_at) }}
            </span>
            <span v-if="reflection.theme" class="px-2 py-0.5 bg-surface-subtle text-overline font-bold text-ink-secondary uppercase rounded-full border border-border">
              {{ reflection.theme }}
            </span>
            <span v-if="reflection.included_in_supervision" class="inline-flex items-center px-2 py-0.5 bg-state-success-surface text-overline font-bold text-state-success uppercase rounded border border-state-success/20">
              Supervision Pack
            </span>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="p-2 text-ink-muted hover:text-ink transition-colors rounded-control hover:bg-surface-subtle"
          aria-label="Close detail view"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-8 overflow-y-auto flex-1">
        <div class="mb-6 space-y-2 bg-surface-subtle p-4 rounded-panel border border-border-muted">
          <div v-if="reflection.clients?.display_name" class="flex items-center gap-3 text-body-sm text-ink-secondary">
            <span class="w-5 text-center grayscale">👤</span>
            <span class="font-medium">Client:</span> {{ reflection.clients.display_name }}
          </div>
          <div v-if="reflection.session_ref" class="flex items-center gap-3 text-body-sm text-ink-secondary">
            <span class="w-5 text-center grayscale">📅</span>
            <span class="font-medium">Session:</span> 
            <button 
              @click="$emit('go-to-session', reflection)"
              class="text-state-selected hover:underline font-medium text-left"
            >
              Open session
            </button>
          </div>
        </div>

        <div class="prose prose-sm max-w-none">
          <p class="text-body text-ink italic whitespace-pre-wrap leading-relaxed">
            "{{ reflection.body || 'No content' }}"
          </p>
        </div>
      </div>

      <div class="p-6 border-t border-border-muted bg-surface flex justify-between items-center">
        <div v-if="error" role="alert" class="text-overline text-state-danger font-medium">
          Could not update selection.
        </div>
        <div v-else></div>

        <div class="flex items-center gap-3">
          <div v-if="reflection.included_in_supervision" class="flex items-center gap-3">
            <span class="text-body-sm text-ink-secondary font-medium flex items-center gap-1.5">
              <span class="text-state-success">✓</span>
              Included in Supervision Pack
            </span>
            <button
              @click="$emit('toggle-supervision', reflection)"
              :disabled="loading"
              class="text-body-sm font-semibold text-state-danger hover:underline disabled:opacity-50"
            >
              Remove from Pack
            </button>
          </div>
          <button
            v-else
            @click="$emit('toggle-supervision', reflection)"
            :disabled="loading"
            class="flex items-center gap-2 px-4 py-2 bg-state-selected text-white text-body-sm font-semibold rounded-control hover:bg-state-selected-hover transition-all disabled:opacity-50 shadow-sm"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Add to Supervision Pack
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  reflection: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close', 'toggle-supervision', 'go-to-session']);

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
