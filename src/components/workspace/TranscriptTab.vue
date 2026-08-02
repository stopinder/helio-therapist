<template>
  <div class="flex flex-col gap-stack-md">
    <div v-if="loading" class="min-h-64 flex flex-col items-center justify-center gap-3 rounded-panel border border-border bg-surface p-6 text-center">
      <span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
      <p class="text-body text-ink-muted">Loading linked Zoom transcript…</p>
    </div>

    <div v-else-if="error" class="min-h-64 flex flex-col items-center justify-center gap-4 rounded-panel border border-state-danger/20 bg-surface p-6 text-center">
      <div>
        <h3 class="text-h3 font-semibold text-state-danger">Transcript unavailable</h3>
        <p class="mt-2 text-body text-ink-muted">{{ error }}</p>
      </div>
      <button
        class="px-4 py-2 bg-action-primary text-on-action rounded-control font-medium hover:bg-action-primary-hover"
        @click="$emit('retry')"
      >
        Retry
      </button>
    </div>

    <div v-else-if="!transcript" class="min-h-64 flex flex-col items-center justify-center rounded-panel border border-border bg-surface p-6 text-center">
      <h3 class="text-h3 font-semibold text-ink">No linked transcript</h3>
      <p class="mt-2 max-w-lg text-body text-ink-muted">No Zoom transcript is linked to this client session. Review unmatched transcripts in the Transcript Inbox.</p>
    </div>

    <div v-else class="flex flex-col lg:flex-row gap-6">
      <section class="min-w-0 flex-1 rounded-panel border border-border bg-surface p-5">
        <header class="mb-4">
          <p class="text-caption font-medium uppercase tracking-wider text-action-link">Original Zoom transcript</p>
          <h3 class="mt-1 text-h3 font-semibold text-ink">Source material</h3>
          <p class="mt-2 text-body-sm text-ink-muted">This is the original transcript imported from Zoom. Helios has not analysed or changed it.</p>
        </header>
        <pre class="max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-panel bg-surface-subtle p-4 font-mono text-body-sm leading-relaxed text-ink-secondary">{{ transcript.text }}</pre>
      </section>

      <div class="w-full lg:w-72">
        <WorkflowStatusPanel
          :workflowItems="workflowProgress"
          :activeStage="activeTab"
        />
        <p class="mt-4 rounded-panel border border-border bg-surface-subtle p-4 text-body-sm text-ink-muted">
          Markers and important moments are unavailable until their persistence workflow is approved.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import WorkflowStatusPanel from './WorkflowStatusPanel.vue';

defineProps({
  transcript: { type: Object, default: null },
  loading: Boolean,
  error: { type: String, default: '' },
  activeTab: String
});

defineEmits(['retry']);

const workflowProgress = [
  { label: 'Recording', status: 'In Progress' },
  { label: 'Transcript', status: 'In Progress' },
  { label: 'Notes', status: 'Not Started' },
  { label: 'Reflection', status: 'Not Started' },
  { label: 'Clinical Summary', status: 'Not Started' },
  { label: 'Supervision', status: 'Not Started' }
];
</script>
