<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="p-3 bg-state-info/10 border border-state-info/20 rounded-panel">
      <p class="text-caption text-state-info font-medium uppercase tracking-wider mb-1">Working notes</p>
      <p class="text-body-sm text-ink-secondary">Private editable working material. These notes are stored separately and are not the approved clinical record.</p>
    </div>

    <p v-if="loading" class="text-body-sm text-ink-muted">Loading working notes…</p>
    <p v-if="error" class="text-body-sm text-state-danger" role="alert">{{ error }}</p>

    <div class="grid grid-cols-1 gap-6" :aria-busy="loading">
      <div v-for="(label, key) in noteSections" :key="key" class="space-y-2">
        <label :for="key" class="text-body-sm font-bold text-ink uppercase tracking-wider">{{ label }}</label>
        <textarea :id="key" v-model="notes[key]" rows="4" :disabled="loading || saving" class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink disabled:opacity-60" :placeholder="`Enter ${label.toLowerCase()}...`"></textarea>
      </div>
    </div>

    <div class="flex items-center justify-end gap-3">
      <span v-if="savedMessage" class="text-body-sm text-state-success" role="status">{{ savedMessage }}</span>
      <button type="button" :disabled="loading || saving" class="px-4 py-2 bg-state-selected text-white rounded-control hover:opacity-90 disabled:opacity-60" @click="save">{{ saving ? 'Saving…' : 'Save working notes' }}</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { emptyWorkingNotes, getSessionWorkingNotes, saveSessionWorkingNotes } from '../../lib/workingNotes.js';

const props = defineProps({ clientId: { type: String, required: true }, sessionId: { type: String, required: true } });
const noteSections = { observations: 'Observations', interventions: 'Interventions', themes: 'Themes', followUp: 'Follow-up' };
const notes = reactive(emptyWorkingNotes());
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const savedMessage = ref('');

async function load() {
  loading.value = true; error.value = '';
  try {
    const record = await getSessionWorkingNotes({ sessionId: props.sessionId, clientId: props.clientId });
    Object.assign(notes, record?.content || emptyWorkingNotes());
  } catch (err) { console.error('Failed to load working notes:', err); error.value = 'Working notes could not be loaded.'; }
  finally { loading.value = false; }
}

async function save() {
  if (saving.value) return;
  saving.value = true; error.value = ''; savedMessage.value = '';
  try {
    const record = await saveSessionWorkingNotes({ sessionId: props.sessionId, clientId: props.clientId, content: notes });
    Object.assign(notes, record.content);
    savedMessage.value = 'Working notes saved.';
  } catch (err) { console.error('Failed to save working notes:', err); error.value = 'Working notes could not be saved. Please try again.'; }
  finally { saving.value = false; }
}

onMounted(load);
</script>
