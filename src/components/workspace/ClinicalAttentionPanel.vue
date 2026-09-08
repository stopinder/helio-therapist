<template>
  <div class="bg-surface-subtle border-l-4 border-l-action-link border-y border-r border-border-muted rounded-panel overflow-hidden shadow-sm">
    <div class="px-inline-lg py-stack-sm border-b border-border-muted bg-surface/50 flex items-center justify-between gap-inline-md">
      <h3 class="text-body font-bold text-ink flex items-center gap-2">
        <span class="text-action-link">✨</span> Current focus
      </h3>
      <button
        v-if="!editing"
        type="button"
        class="text-body-sm font-medium text-action-link hover:underline"
        @click="startEditing"
      >
        {{ client.note ? 'Edit' : '+ Add current focus' }}
      </button>
    </div>

    <div v-if="editing" class="p-inline-lg space-y-stack-sm">
      <label :for="`current-focus-${client.id}`" class="text-caption font-medium text-ink-secondary">
        Current focus
      </label>
      <textarea
        :id="`current-focus-${client.id}`"
        v-model="draft"
        rows="3"
        class="w-full rounded-control border border-border bg-surface px-inline-md py-stack-sm text-body-sm text-ink"
        placeholder="What is most important to keep in view for this client right now?"
      ></textarea>
      <div class="flex justify-end gap-inline-sm">
        <button type="button" class="button-secondary" :disabled="saving" @click="cancel">
          Cancel
        </button>
        <button type="button" class="button-primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save current focus' }}
        </button>
      </div>
      <p v-if="saveError" class="text-body-sm text-state-danger">{{ saveError }}</p>
    </div>

    <div v-else-if="client.note" class="p-inline-lg">
      <p class="text-body-sm text-ink font-medium whitespace-pre-wrap">{{ client.note }}</p>
    </div>
    <p v-else class="p-inline-lg py-stack-lg text-body-sm text-ink-muted">No current focus recorded.</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { updateClientFocus } from '../../lib/clients.js'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['updated'])

const editing = ref(false)
const draft = ref(props.client.note || '')
const saving = ref(false)
const saveError = ref('')

function startEditing() {
  draft.value = props.client.note || ''
  saveError.value = ''
  editing.value = true
}

function cancel() {
  draft.value = props.client.note || ''
  saveError.value = ''
  editing.value = false
}

async function save() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    const updated = await updateClientFocus({ clientId: props.client.id, note: draft.value })
    emit('updated', updated)
    editing.value = false
  } catch (error) {
    saveError.value = error?.message || 'Current focus could not be saved.'
  } finally {
    saving.value = false
  }
}

watch(() => props.client.note, value => {
  if (!editing.value) draft.value = value || ''
})
</script>
