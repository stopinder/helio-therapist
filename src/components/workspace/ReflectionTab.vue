<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <h3 class="text-h3 font-semibold text-ink mb-6">Therapist Reflection</h3>
      <p class="text-body-sm text-ink-muted mb-8 italic border-l-4 border-state-info pl-4">This reflection is private and separate from the client's clinical record. It is intended for your professional development and supervision preparation.</p>
      <p v-if="loading" class="text-body-sm text-ink-muted mb-4">Loading reflection…</p>
      <p v-if="error" class="text-body-sm text-state-danger mb-4" role="alert">{{ error }}</p>
      <div class="grid grid-cols-1 gap-8" :aria-busy="loading">
        <div v-for="(label, key) in reflectionFields" :key="key" class="space-y-2">
          <label :for="key" class="text-body-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">{{ label }}</label>
          <textarea :id="key" v-model="reflection[key]" rows="3" :disabled="loading || saving || Boolean(activeDictationKey) || Boolean(transcribingKey)" class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink disabled:opacity-60" :placeholder="`Reflect on ${label.toLowerCase()}...`"></textarea>
          <div class="flex items-center justify-between gap-3">
            <p v-if="dictationErrorKey === key" class="text-caption text-state-danger" role="alert">{{ dictationError }}</p>
            <span v-else class="text-caption text-ink-muted">Dictation adds text here for you to review before saving.</span>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-control border border-border bg-surface text-body-sm font-medium text-ink-secondary hover:bg-surface-subtle disabled:opacity-50"
              :disabled="loading || saving || (Boolean(activeDictationKey) && activeDictationKey !== key) || (Boolean(transcribingKey) && transcribingKey !== key)"
              :aria-pressed="activeDictationKey === key"
              @click="toggleDictation(key)"
            >
              <span aria-hidden="true">🎙️</span>
              {{ dictationButtonLabel(key) }}
            </button>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 mt-6">
        <span v-if="savedMessage" class="text-body-sm text-state-success" role="status">{{ savedMessage }}</span>
        <button type="button" :disabled="loading || saving || Boolean(activeDictationKey) || Boolean(transcribingKey)" class="button-primary" @click="save">{{ saving ? 'Saving…' : 'Save private reflection' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { authenticatedFetch } from '../../lib/api.js';
import { emptyWorkspaceReflection, getPrivateReflection, normalizeWorkspaceReflection, upsertPrivateReflection, workspaceReflectionBody } from '../../lib/reflections.js';

const props = defineProps({ clientId: { type: String, required: true }, sessionId: { type: String, required: true } });
const reflectionFields = { stoodOut: 'What stood out in this session?', emotionalResponse: 'Therapist emotional response', countertransference: 'Possible countertransference', uncertainties: 'Uncertainties or sticking points', supervisionQuestions: 'Supervision questions', nextSession: 'Next session considerations' };
const reflection = reactive(emptyWorkspaceReflection());
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const savedMessage = ref('');
const activeDictationKey = ref('');
const transcribingKey = ref('');
const dictationErrorKey = ref('');
const dictationError = ref('');

let recorder = null;
let stream = null;
let chunks = [];

async function load() {
  loading.value = true; error.value = '';
  try {
    const record = await getPrivateReflection({ clientId: props.clientId, sessionId: props.sessionId });
    Object.assign(reflection, normalizeWorkspaceReflection(record?.workspace_content));
  } catch (err) { console.error('Failed to load private reflection:', err); error.value = 'Private reflection could not be loaded.'; }
  finally { loading.value = false; }
}

function dictationButtonLabel(key) {
  if (transcribingKey.value === key) return 'Transcribing…';
  if (activeDictationKey.value === key) return 'Stop recording';
  return 'Dictate';
}

async function toggleDictation(key) {
  if (activeDictationKey.value === key) {
    recorder?.stop();
    return;
  }
  if (activeDictationKey.value || transcribingKey.value) return;

  dictationErrorKey.value = '';
  dictationError.value = '';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => processDictation(key);
    recorder.start();
    activeDictationKey.value = key;
  } catch {
    dictationErrorKey.value = key;
    dictationError.value = 'Microphone access was not available. You can continue by typing.';
  }
}

async function processDictation(key) {
  activeDictationKey.value = '';
  stream?.getTracks().forEach(track => track.stop());

  const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
  if (!blob.size) return;

  transcribingKey.value = key;
  dictationErrorKey.value = '';
  dictationError.value = '';
  try {
    const audio = await blobToDataUrl(blob);
    const response = await authenticatedFetch('/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || 'Dictation could not be transcribed.');
    const text = String(payload?.text || '').trim();
    if (text) reflection[key] = [reflection[key].trim(), text].filter(Boolean).join(reflection[key].trim() ? '\n' : '');
  } catch (err) {
    dictationErrorKey.value = key;
    dictationError.value = err.message || 'The recording could not be transcribed. Your audio was not saved.';
  } finally {
    transcribingKey.value = '';
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function save() {
  if (saving.value || activeDictationKey.value || transcribingKey.value) return;
  saving.value = true; error.value = ''; savedMessage.value = '';
  try {
    await upsertPrivateReflection({ clientId: props.clientId, sessionId: props.sessionId, body: workspaceReflectionBody(reflection), workspaceContent: reflection });
    savedMessage.value = 'Private reflection saved.';
  } catch (err) { console.error('Failed to save private reflection:', err); error.value = 'Private reflection could not be saved. Please try again.'; }
  finally { saving.value = false; }
}

onMounted(load);
onBeforeUnmount(() => {
  if (recorder?.state && recorder.state !== 'inactive') recorder.stop();
  stream?.getTracks().forEach(track => track.stop());
});
</script>
