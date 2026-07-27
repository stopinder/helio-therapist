<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <!-- Notice -->
    <div class="p-3 bg-state-warning-surface border border-state-warning/20 rounded-panel">
      <p class="text-caption text-state-warning font-medium uppercase tracking-wider mb-1">Status</p>
      <p class="text-body-sm text-ink-secondary">These notes are stored in local session state and are <strong>not yet saved</strong> to the clinical record.</p>
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
        <label for="private-notes" class="text-body-sm font-bold text-state-danger uppercase tracking-wider flex items-center gap-2">
          <span>🔒 Private Therapist Notes</span>
        </label>
        <p class="text-caption text-ink-muted mb-2 italic">These notes are for your personal reflection and will not be included in the shared clinical summary.</p>
        <textarea
          id="private-notes"
          v-model="notes.private"
          rows="4"
          class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink"
          placeholder="Enter private reflections..."
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';

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
</script>
