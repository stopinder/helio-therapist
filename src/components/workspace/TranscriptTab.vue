<template>
  <div class="flex flex-col gap-stack-md">
    <!-- Notice -->
    <div class="p-3 bg-state-warning-surface border border-state-warning/20 rounded-panel">
      <p class="text-caption text-state-warning font-medium uppercase tracking-wider mb-1">Notice</p>
      <p class="text-body-sm text-ink-secondary">This transcript is <strong>demonstration data</strong> for clinical workflow visualization.</p>
    </div>

    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Main Area -->
      <div class="flex-1 space-y-4">
        <h3 class="text-h3 font-semibold text-ink">Timeline</h3>
        <div class="space-y-3">
          <TranscriptEntry 
            v-for="(entry, index) in transcript" 
            :key="entry.id"
            v-bind="entry"
            :isActive="index === transcript.length - 1"
          />
        </div>
      </div>

      <!-- Side Panel -->
      <div class="w-full lg:w-72 space-y-6">
        <WorkflowStatusPanel 
          :workflowItems="workflowProgress" 
          :activeStage="activeTab"
        />

        <section class="p-4 bg-surface border border-border rounded-panel">
          <h4 class="text-body-sm font-bold text-ink uppercase tracking-wider mb-4">Markers</h4>
          <div class="space-y-3">
            <div 
              v-for="marker in markers" 
              :key="marker.id"
              class="flex items-center justify-between p-2 border border-border rounded bg-surface-subtle hover:border-action-link cursor-pointer transition-colors"
            >
              <span class="text-body-sm text-ink">{{ marker.label }}</span>
              <span class="text-caption font-mono text-ink-muted">{{ marker.time }}</span>
            </div>
            <button class="w-full py-2 border border-dashed border-border text-caption text-ink-muted hover:text-action-link hover:border-action-link transition-colors rounded">
              + Add Marker
            </button>
          </div>
        </section>

        <section class="p-4 bg-surface border border-border rounded-panel">
          <h4 class="text-body-sm font-bold text-ink uppercase tracking-wider mb-4">Important Moments</h4>
          <div class="text-body-sm text-ink-muted italic text-center py-4 border border-dashed border-border rounded">
            No moments highlighted yet.
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import TranscriptEntry from './TranscriptEntry.vue';
import WorkflowStatusPanel from './WorkflowStatusPanel.vue';

defineProps({
  transcript: Array,
  markers: Array,
  activeTab: String
});

const workflowProgress = [
  { label: 'Recording', status: 'In Progress' },
  { label: 'Transcript', status: 'In Progress' },
  { label: 'Notes', status: 'Not Started' },
  { label: 'Reflection', status: 'Not Started' },
  { label: 'Clinical Summary', status: 'Not Started' },
  { label: 'Supervision', status: 'Not Started' }
];
</script>
