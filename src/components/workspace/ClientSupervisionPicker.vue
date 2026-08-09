<template>
  <teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="$emit('close')">
      <section class="w-full max-w-2xl max-h-[85vh] overflow-hidden bg-surface-elevated border border-border rounded-panel shadow-overlay" role="dialog" aria-modal="true" aria-labelledby="supervision-picker-title">
        <header class="flex items-start justify-between gap-4 p-6 border-b border-border-muted">
          <div>
            <h2 id="supervision-picker-title" class="text-h2 font-semibold text-ink">Add to Supervision</h2>
            <p class="text-body-sm text-ink-secondary mt-1">Which private reflection do you want to bring about {{ clientName }}?</p>
          </div>
          <button type="button" class="text-ink-muted hover:text-ink" aria-label="Close supervision picker" @click="$emit('close')">✕</button>
        </header>

        <div class="p-6 overflow-auto max-h-[60vh]">
          <div v-if="loading" class="py-10 text-center text-ink-muted">Loading private reflections…</div>
          <div v-else-if="error" class="p-4 bg-state-danger/10 text-state-danger rounded-control">{{ error }}</div>
          <div v-else-if="items.length === 0" class="py-10 text-center">
            <p class="font-medium text-ink">No private reflections for this client yet.</p>
            <p class="text-body-sm text-ink-muted mt-2">Complete a private reflection from a session first.</p>
          </div>
          <div v-else class="space-y-3">
            <label v-for="item in items" :key="item.id" class="flex gap-3 p-4 border border-border rounded-control cursor-pointer hover:bg-surface-subtle">
              <input v-model="selectedIds" type="checkbox" :value="item.id" :disabled="item.included_in_supervision" class="mt-1" />
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap gap-2 items-center">
                  <strong class="text-body-sm text-ink">{{ formatDate(item.session?.startedAt || item.created_at) }}</strong>
                  <span v-if="item.session" class="text-caption text-ink-muted">Session</span>
                  <span v-if="item.theme" class="text-caption text-ink-secondary">{{ item.theme }}</span>
                  <span v-if="item.included_in_supervision" class="text-caption text-state-success">Already in pack</span>
                </span>
                <span class="block text-body-sm text-ink-secondary mt-2 line-clamp-3">{{ item.body }}</span>
              </span>
            </label>
          </div>
        </div>

        <footer class="flex items-center justify-between gap-4 p-6 border-t border-border-muted">
          <p class="text-caption text-ink-muted">Private therapist reflections only. Client identifiers are not shown.</p>
          <div class="flex gap-2">
            <button type="button" class="button-secondary" @click="$emit('close')">Cancel</button>
            <button type="button" class="px-4 py-2 bg-action-link text-on-action rounded-control disabled:opacity-50" :disabled="saving || selectedIds.length === 0" @click="confirm">
              {{ saving ? 'Adding…' : `Add ${selectedIds.length || ''} to Supervision` }}
            </button>
          </div>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  clientName: { type: String, required: true },
  reflections: { type: Array, default: () => [] },
  sessions: { type: Array, default: () => [] },
  loading: Boolean,
  saving: Boolean,
  error: { type: String, default: '' }
});
const emit = defineEmits(['close', 'confirm']);
const selectedIds = ref([]);

const items = computed(() => {
  const sessions = new Map(props.sessions.map(session => [session.id, session]));
  return props.reflections.map(reflection => ({ ...reflection, session: sessions.get(reflection.session_ref) || null }))
    .sort((a, b) => Number(Boolean(b.session)) - Number(Boolean(a.session)) || new Date(b.created_at) - new Date(a.created_at));
});

watch(() => props.reflections, () => {
  selectedIds.value = selectedIds.value.filter(id => props.reflections.some(r => r.id === id && !r.included_in_supervision));
}, { deep: true });

function confirm() {
  emit('confirm', [...selectedIds.value]);
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
</script>
