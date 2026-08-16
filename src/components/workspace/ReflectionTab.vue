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
          <textarea :id="key" v-model="reflection[key]" rows="3" :disabled="loading || saving" class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink disabled:opacity-60" :placeholder="`Reflect on ${label.toLowerCase()}...`"></textarea>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 mt-6">
        <span v-if="savedMessage" class="text-body-sm text-state-success" role="status">{{ savedMessage }}</span>
        <button type="button" :disabled="loading || saving" class="button-primary" @click="save">{{ saving ? 'Saving…' : 'Save private reflection' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { emptyWorkspaceReflection, getPrivateReflection, normalizeWorkspaceReflection, upsertPrivateReflection, workspaceReflectionBody } from '../../lib/reflections.js';

const props = defineProps({ clientId: { type: String, required: true }, sessionId: { type: String, required: true } });
const reflectionFields = { stoodOut: 'What stood out in this session?', emotionalResponse: 'Therapist emotional response', countertransference: 'Possible countertransference', uncertainties: 'Uncertainties or sticking points', supervisionQuestions: 'Supervision questions', nextSession: 'Next session considerations' };
const reflection = reactive(emptyWorkspaceReflection());
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const savedMessage = ref('');

async function load() {
  loading.value = true; error.value = '';
  try {
    const record = await getPrivateReflection({ clientId: props.clientId, sessionId: props.sessionId });
    Object.assign(reflection, normalizeWorkspaceReflection(record?.workspace_content));
  } catch (err) { console.error('Failed to load private reflection:', err); error.value = 'Private reflection could not be loaded.'; }
  finally { loading.value = false; }
}

async function save() {
  if (saving.value) return;
  saving.value = true; error.value = ''; savedMessage.value = '';
  try {
    await upsertPrivateReflection({ clientId: props.clientId, sessionId: props.sessionId, body: workspaceReflectionBody(reflection), workspaceContent: reflection });
    savedMessage.value = 'Private reflection saved.';
  } catch (err) { console.error('Failed to save private reflection:', err); error.value = 'Private reflection could not be saved. Please try again.'; }
  finally { saving.value = false; }
}

onMounted(load);
</script>
