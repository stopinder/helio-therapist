<template>
  <div class="fixed inset-0 z-[70]" @click.self="$emit('close')">
    <section class="absolute right-4 top-[4.25rem] w-[min(24rem,calc(100vw-2rem))] rounded-panel border border-border-muted bg-surface shadow-overlay" role="dialog" aria-labelledby="quick-capture-title">
      <header class="flex items-start justify-between gap-3 border-b border-border-muted px-4 py-3">
        <div>
          <h2 id="quick-capture-title" class="type-ui font-semibold text-ink">My reminders</h2>
          <p class="type-metadata text-ink-muted mt-0.5">Private to you, not part of a client record.</p>
        </div>
        <button type="button" class="p-1.5 rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink" aria-label="Close quick capture" @click="$emit('close')">×</button>
      </header>

      <div class="max-h-56 overflow-y-auto px-4">
        <p v-if="!reminders.length" class="py-3 type-metadata text-ink-subtle">No outstanding reminders.</p>
        <label v-for="reminder in reminders" :key="reminder.id" class="flex items-start gap-3 border-b border-border-muted py-3 last:border-b-0 cursor-pointer">
          <input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-border text-action-primary focus:ring-state-focus-ring" :disabled="completingId === reminder.id" @change="complete(reminder)" />
          <span class="type-ui text-ink-secondary leading-5">{{ reminder.body }}</span>
        </label>
      </div>

      <div class="border-t border-border-muted px-4 py-3">
        <textarea
          v-model="body"
          rows="2"
          maxlength="2000"
          autofocus
          class="w-full resize-none rounded-control border border-border bg-surface-elevated px-3 py-2 type-ui text-ink placeholder:text-ink-subtle focus:border-action-link focus:outline-none focus:ring-2 focus:ring-state-focus-ring"
          placeholder="What do you need to remember?"
          :disabled="saving"
          @keydown.meta.enter.prevent="save"
          @keydown.ctrl.enter.prevent="save"
        />
        <p v-if="error" class="mt-2 type-metadata text-state-danger" role="alert">{{ error }}</p>
        <div class="mt-2 flex justify-end">
          <button type="button" class="button-primary" :disabled="!canSave || saving" @click="save">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { createTherapistReminder, setTherapistReminderCompleted } from '../../lib/therapistReminders.js'

defineProps({
  reminders: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'saved', 'changed'])
const body = ref('')
const saving = ref(false)
const completingId = ref(null)
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

async function complete(reminder) {
  if (!reminder?.id || completingId.value) return
  completingId.value = reminder.id
  error.value = ''
  try {
    await setTherapistReminderCompleted({ id: reminder.id, completed: true })
    window.dispatchEvent(new CustomEvent('helios-reminders-changed'))
    emit('changed')
  } catch {
    error.value = 'Could not complete this reminder. Please try again.'
  } finally {
    completingId.value = null
  }
}
</script>
