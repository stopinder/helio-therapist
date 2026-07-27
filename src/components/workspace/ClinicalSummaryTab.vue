<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <h3 class="text-h3 font-semibold text-ink mb-6">Preparation for Clinical Summary</h3>
      
      <div class="space-y-8">
        <!-- Checklist -->
        <section>
          <h4 class="text-body-sm font-bold text-ink uppercase tracking-wider mb-4">Source Material Checklist</h4>
          <div class="space-y-3">
            <div v-for="item in checklist" :key="item.id" class="flex items-center gap-3">
              <div 
                class="w-5 h-5 rounded border flex items-center justify-center text-xs"
                :class="item.available ? 'bg-state-success-surface border-state-success text-state-success' : 'bg-surface-subtle border-border text-ink-muted'"
              >
                {{ item.available ? '✓' : '' }}
              </div>
              <span class="text-body-sm" :class="item.available ? 'text-ink' : 'text-ink-muted'">
                {{ item.label }} 
                <span v-if="item.available" class="text-caption font-medium uppercase ml-2 px-1 bg-state-success-surface rounded">Available</span>
              </span>
            </div>
          </div>
        </section>

        <!-- Status -->
        <section class="p-4 bg-surface-subtle rounded border border-border">
          <div class="flex items-center justify-between mb-2">
            <span class="text-body-sm font-medium text-ink">Summary Status</span>
            <span class="text-caption font-bold text-ink-muted uppercase">Not Generated</span>
          </div>
          <p class="text-caption text-ink-muted">Generate a draft clinical summary based on the available source material above.</p>
        </section>

        <!-- Action -->
        <div class="flex flex-col gap-4">
          <button 
            disabled
            class="w-full py-3 bg-action-link opacity-50 text-on-action font-medium rounded-control cursor-not-allowed flex items-center justify-center gap-2"
          >
            🪄 Prepare Draft Clinical Summary
          </button>
          
          <div class="p-3 bg-surface border border-border rounded flex gap-3">
            <span class="text-xl">ℹ️</span>
            <p class="text-caption text-ink-secondary leading-relaxed">
              <strong>AI-assisted content must be reviewed and approved by the therapist</strong> before it becomes part of the clinical record. 
              The draft will be generated using only the selected source materials.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const checklist = [
  { id: 1, label: 'Session Transcript', available: true },
  { id: 2, label: 'Therapist Notes', available: true },
  { id: 3, label: 'Therapist Reflection', available: true },
  { id: 4, label: 'Client Feedback', available: false }
];
</script>
