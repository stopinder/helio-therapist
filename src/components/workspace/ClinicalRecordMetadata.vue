<template>
  <div class="flex flex-wrap items-center gap-x-inline-lg gap-y-stack-xs text-caption text-ink-muted bg-surface-subtle p-3 rounded-control border border-border-muted mb-6">
    <div class="flex items-center gap-1.5">
      <span class="font-semibold text-ink-secondary uppercase tracking-tight">Version:</span>
      <span>{{ version }}</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="font-semibold text-ink-secondary uppercase tracking-tight">Approved by:</span>
      <span>{{ author }}</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="font-semibold text-ink-secondary uppercase tracking-tight">Timestamp:</span>
      <span>{{ timestamp }}</span>
    </div>
    <div class="flex items-center gap-1.5">
      <span class="font-semibold text-ink-secondary uppercase tracking-tight">Type:</span>
      <span>Individual Therapy</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  version: { type: [String, Number], default: 1 },
  author: { type: String, default: 'Therapist' },
  timestamp: { type: String, required: true }
});
</script>
