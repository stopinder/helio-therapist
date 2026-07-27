<template>
  <div class="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-subtle">
    <div class="flex flex-col items-center gap-1 shrink-0 pt-1">
      <span class="text-caption font-mono text-ink-muted leading-none">{{ timestamp }}</span>
    </div>
    <div class="flex flex-col gap-1 min-w-0">
      <div class="flex items-center gap-2">
        <span 
          class="text-xs font-bold uppercase tracking-wider"
          :class="speaker === 'Therapist' ? 'text-action-link' : 'text-state-info'"
        >
          {{ speaker }}
        </span>
      </div>
      <p class="text-body-sm text-ink leading-relaxed">{{ text }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  speaker: String,
  timestamp: String,
  text: String
});
</script>
