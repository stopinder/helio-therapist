<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-backdrop backdrop-blur-sm p-4" @click.self="$emit('close')">
    <section class="w-full max-w-md rounded-card border border-border-muted bg-surface shadow-overlay" role="dialog" aria-modal="true" aria-labelledby="quick-capture-title">
      <header class="flex items-center justify-between border-b border-border-muted px-5 py-4">
        <div>
          <h2 id="quick-capture-title" class="type-h3 text-ink">Quick capture</h2>
          <p class="type-metadata text-ink-muted mt-1">A private reminder for you. It is not part of a client or clinical record.</p>
        </div>
        <button type="button" class="p-2 rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink" aria-label="Close quick capture" @click="$emit('close')">×</button>
      </header>

      <div class="px-5 py-5">
        <textarea
          v-model="body"
          rows="4"
          maxlength="2000"
          autofocus
          class="w-full resize-none rounded-control border border-border bg-surface-elevated px-3 py-3 type-body text-ink placeholder:text-ink-subtle focus:border-action-link focus:outline-none focus:ring-2 focus:ring-state-focus-ring"
          placeholder="What do you need to remember?"
          :disabled="saving"
          @keydown.meta.enter.prevent="save"
          @keydown.ctrl.enter.prevent="save"
        />
        <p v-if="error" class="mt-2 type-metadata text-state-danger" role="alert">{{ error }}</p>
      </div>

      <footer class="flex justify-end gap-2 border-t border-border-muted px-5 py-4">
        <button type="button" class="button-secondary" :disabled="saving" @click="$emit('close')">Cancel</button>
        <button type="button" class="button-primary" :disabled="!canSave || saving" @click="save">{{ saving ? 'Saving…' : 'Save' }}</button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { createTherapistReminder } from '../../lib/therapistReminders.js'

const emit = defineEmits(['close', 'saved'])
const body = ref('')
const saving = ref(false)
const error = ref('')
const canSave = computed(() => body.value.trim().length > 0)

async function save() {
  if (!canSave.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const reminder = await createTherapistReminder({ body: body.value })
    window.dispatchEvent(new CustomEvent('helios-reminders-changed'))
    emit('saved', reminder)
    emit('close')
  } catch {
    error.value = 'Could not save this reminder. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>
