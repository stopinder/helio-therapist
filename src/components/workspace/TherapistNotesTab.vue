<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <!-- Notice -->
    <div class="p-3 bg-state-warning-surface border border-state-warning/20 rounded-panel flex justify-between items-center">
      <div>
        <p class="text-caption text-state-warning font-medium uppercase tracking-wider mb-1">Status</p>
        <p class="text-body-sm text-ink-secondary">These notes are stored in local session state and are <strong>not yet saved</strong> to the clinical record.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6">
      <div v-for="(label, key) in noteSections" :key="key" class="space-y-2">
        <label :for="key" class="text-body-sm font-bold text-ink uppercase tracking-wider">
          {{ label }}
        </label>
        <textarea
          :id="key"
          v-model="notes[key]"
          rows="4"
          class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink"
          :placeholder="`Enter ${label.toLowerCase()}...`"
        ></textarea>
      </div>

      <div class="space-y-2 p-4 bg-surface-subtle border border-border rounded-panel">
        <div class="flex justify-between items-center mb-2">
          <label for="private-notes" class="text-body-sm font-bold text-state-danger uppercase tracking-wider flex items-center gap-2">
            <span>🔒 Private Therapist Notes</span>
          </label>
          <div class="flex items-center gap-2">
            <span v-if="saveStatus === 'saving'" class="text-caption text-ink-muted flex items-center gap-1">
              <span class="w-3 h-3 border-2 border-ink-muted/30 border-t-ink-muted rounded-full animate-spin"></span>
              Saving...
            </span>
            <span v-else-if="saveStatus === 'saved'" class="text-caption text-state-success flex items-center gap-1">
              ✓ Saved
            </span>
            <span v-else-if="saveStatus === 'error'" class="text-caption text-state-danger flex items-center gap-1">
              ⚠️ Save failed
            </span>
          </div>
        </div>
        <p class="text-caption text-ink-muted mb-2 italic">These notes are for your personal reflection and will not be included in the shared clinical summary.</p>
        <textarea
          id="private-notes"
          v-model="notes.private"
          rows="4"
          class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink"
          placeholder="Enter private reflections..."
          @input="handlePrivateNoteInput"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue';
import { getPrivateReflection, upsertPrivateReflection } from '../../lib/reflections.js';

const props = defineProps({
  clientId: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  }
});

const noteSections = {
  observations: 'Observations',
  interventions: 'Interventions',
  themes: 'Themes',
  followUp: 'Follow-up'
};

const notes = reactive({
  observations: '',
  interventions: '',
  themes: '',
  followUp: '',
  private: ''
});

const saveStatus = ref(''); // '', 'saving', 'saved', 'error'
let saveTimeout = null;

async function loadPrivateReflection() {
  try {
    const data = await getPrivateReflection({
      clientId: props.clientId,
      sessionId: props.sessionId
    });
    if (data && data.body) {
      notes.private = data.body;
    }
  } catch (err) {
    console.error('[TherapistNotesTab] Load error:', err);
  }
}

async function savePrivateReflection() {
  saveStatus.value = 'saving';
  try {
    await upsertPrivateReflection({
      clientId: props.clientId,
      sessionId: props.sessionId,
      body: notes.private
    });
    saveStatus.value = 'saved';
    // Clear "Saved" status after a few seconds
    setTimeout(() => {
      if (saveStatus.value === 'saved') saveStatus.value = '';
    }, 3000);
  } catch (err) {
    console.error('[TherapistNotesTab] Save error:', err);
    saveStatus.value = 'error';
  }
}

function handlePrivateNoteInput() {
  saveStatus.value = 'saving';
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(savePrivateReflection, 1000);
}

onMounted(() => {
  loadPrivateReflection();
});
</script>
