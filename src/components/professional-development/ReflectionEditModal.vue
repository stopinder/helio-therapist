<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-backdrop/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-reflection-title" @click.self="$emit('close')">
    <div class="w-full max-w-2xl overflow-hidden rounded-panel border border-border bg-surface-elevated shadow-overlay">
      <div class="flex items-start justify-between border-b border-border-muted p-6">
        <div>
          <h2 id="edit-reflection-title" class="text-h2 font-semibold text-ink">Edit reflection</h2>
          <p class="mt-1 text-body-sm text-ink-muted">Update the reflection you have chosen to keep.</p>
        </div>
        <button type="button" class="rounded-control p-2 text-ink-muted hover:bg-surface-subtle hover:text-ink" aria-label="Close edit reflection" @click="$emit('close')">✕</button>
      </div>

      <form class="space-y-4 p-6" @submit.prevent="save">
        <label for="reflection-body" class="block text-body-sm font-semibold text-ink">Reflection</label>
        <textarea
          id="reflection-body"
          v-model="body"
          rows="12"
          maxlength="20000"
          class="w-full rounded-panel border border-border bg-surface p-4 text-body text-ink outline-none transition focus:border-state-selected focus:ring-2 focus:ring-state-selected/20"
          :disabled="saving"
        ></textarea>
        <div class="flex items-center justify-between gap-4">
          <p class="text-caption text-ink-muted">{{ body.length.toLocaleString() }} / 20,000</p>
          <p v-if="localError" class="text-caption font-medium text-state-danger" role="alert">{{ localError }}</p>
        </div>
        <div class="flex justify-end gap-3 border-t border-border-muted pt-4">
          <button type="button" class="button-secondary" :disabled="saving" @click="$emit('close')">Cancel</button>
          <button type="submit" class="button-primary" :disabled="saving || !body.trim()">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  reflection: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['close', 'save'])
const body = ref(props.reflection.body || '')
const localError = ref('')

function save() {
  const text = body.value.trim()
  if (!text) {
    localError.value = 'Write a reflection before saving, or delete it instead.'
    return
  }
  localError.value = props.error || ''
  emit('save', text)
}
</script>
