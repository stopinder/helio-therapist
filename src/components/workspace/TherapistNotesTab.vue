<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="p-3 bg-state-info/10 border border-state-info/20 rounded-panel">
      <p class="text-caption text-state-info font-medium uppercase tracking-wider mb-1">Working notes</p>
      <p class="text-body-sm text-ink-secondary">Private editable working material. These notes are stored separately and are not the approved clinical record.</p>
    </div>

    <div v-if="draftApplied" class="p-3 bg-state-info/10 border border-state-info/20 rounded-panel">
      <p class="text-caption text-state-info font-medium uppercase tracking-wider">AI-assisted draft · not saved</p>
      <p class="mt-1 text-body-sm text-ink-secondary">Prepared from the linked transcript after your request. Review and edit every field, then choose Save working notes when you are ready.</p>
    </div>

    <p v-if="loading" class="text-body-sm text-ink-muted">Loading working notes…</p>
    <p v-if="loadError" class="text-body-sm text-state-danger" role="alert">{{ loadError }}</p>

    <div class="grid grid-cols-1 gap-6" :aria-busy="loading">
      <div v-for="(label, key) in noteSections" :key="key" class="space-y-2">
        <label :for="key" class="text-body-sm font-bold text-ink uppercase tracking-wider">{{ label }}</label>
        <div class="relative">
          <textarea :id="key" v-model="notes[key]" rows="4" :disabled="loading || saving || conflict || dictation.busy.value" class="w-full p-3 pr-12 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink disabled:opacity-60" :placeholder="`Enter ${label.toLowerCase()}...`"></textarea>
          <div class="absolute bottom-2 right-2">
            <WhisperMicButton
              :recording="dictationTargetKey === key && dictation.recording.value"
              :transcribing="dictationTargetKey === key && dictation.transcribing.value"
              :disabled="loading || saving || conflict || (dictation.busy.value && dictationTargetKey !== key)"
              :label="`Dictate ${label.toLowerCase()}`"
              @toggle="toggleDictation(key)"
            />
          </div>
        </div>
        <p v-if="dictationTargetKey === key && dictation.error.value" class="text-caption text-state-danger" role="alert">{{ dictation.error.value }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-3 border-t border-border pt-4">
      <div v-if="saveError" class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-control bg-state-danger/10 border border-state-danger/20" role="alert">
        <p class="text-body-sm text-state-danger font-medium">{{ saveError }}</p>
        <button v-if="conflict" type="button" :disabled="loading" class="px-3 py-2 bg-surface border border-border rounded-control text-body-sm font-medium text-ink hover:bg-state-hover disabled:opacity-60" @click="load">Reload latest notes</button>
      </div>

      <div class="flex items-center justify-end gap-3">
        <span v-if="savedMessage" class="text-body-sm text-state-success" role="status">{{ savedMessage }}</span>
        <button type="button" :disabled="loading || saving || conflict || dictation.busy.value" class="button-primary" @click="save">{{ saving ? 'Saving…' : 'Save working notes' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { appendDictation, useWhisperDictation } from '../../composables/useWhisperDictation.js';
import WhisperMicButton from '../ui/WhisperMicButton.vue';
import { emptyWorkingNotes, getSessionWorkingNotes, saveSessionWorkingNotes } from '../../lib/workingNotes.js';

const props = defineProps({
  clientId: { type: String, required: true },
  sessionId: { type: String, required: true },
  initialDraft: { type: Object, default: null }
});
const emit = defineEmits(['draft-consumed']);
const noteSections = { observations: 'Observations', interventions: 'Interventions', themes: 'Themes', followUp: 'Follow-up' };
const notes = reactive(emptyWorkingNotes());
const loading = ref(true);
const saving = ref(false);
const version = ref(0);
const conflict = ref(false);
const loadError = ref('');
const saveError = ref('');
const savedMessage = ref('');
const dictationTargetKey = ref('');
const draftApplied = ref(false);
const dictation = useWhisperDictation({
  onText: (text, key) => {
    if (!key || !(key in notes)) return;
    notes[key] = appendDictation(notes[key], text, '\n');
  }
});

async function load() {
  loading.value = true;
  loadError.value = '';
  saveError.value = '';
  savedMessage.value = '';
  try {
    const record = await getSessionWorkingNotes({ sessionId: props.sessionId, clientId: props.clientId });
    const saved = record?.content || emptyWorkingNotes();
    Object.assign(notes, saved);
    version.value = record?.version || 0;
    conflict.value = false;

    const savedHasContent = Object.values(saved).some(value => String(value || '').trim());
    if (props.initialDraft && !savedHasContent) {
      Object.assign(notes, emptyWorkingNotes(), props.initialDraft);
      draftApplied.value = true;
      emit('draft-consumed');
    }
  } catch (err) {
    console.error('Failed to load working notes:', err);
    loadError.value = 'Working notes could not be loaded.';
  } finally {
    loading.value = false;
  }
}

function toggleDictation(key) {
  if (!dictation.recording.value) {
    dictationTargetKey.value = key;
    dictation.resetError();
  }
  dictation.toggle(key);
}

async function save() {
  if (saving.value || conflict.value || dictation.busy.value) return;
  saving.value = true;
  saveError.value = '';
  savedMessage.value = '';
  try {
    const record = await saveSessionWorkingNotes({
      sessionId: props.sessionId,
      clientId: props.clientId,
      content: notes,
      expectedVersion: version.value
    });
    Object.assign(notes, record.content);
    version.value = record.version;
    draftApplied.value = false;
    savedMessage.value = 'Working notes saved.';
  } catch (err) {
    console.error('Failed to save working notes:', err);
    if (err.code === 'WORKING_NOTES_CONFLICT') {
      conflict.value = true;
      saveError.value = 'These working notes were changed in another tab. Reload the latest notes before saving again.';
    } else {
      saveError.value = 'Working notes could not be saved. Please try again.';
    }
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
