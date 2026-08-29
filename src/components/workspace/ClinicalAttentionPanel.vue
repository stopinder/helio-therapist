<template>
  <div class="bg-surface-subtle border-l-4 border-l-action-link border-y border-r border-border-muted rounded-panel overflow-hidden shadow-sm">
    <div class="px-inline-lg py-stack-sm border-b border-border-muted bg-surface/50">
      <h3 class="text-body font-bold text-ink flex items-center gap-2">
        <span class="text-action-link">✨</span> Current focus
      </h3>
    </div>
    <div v-if="client.note" class="p-inline-lg">
      <p class="text-body-sm text-ink font-medium whitespace-pre-wrap">{{ client.note }}</p>
    </div>
    <p v-else class="p-inline-lg py-stack-lg text-body-sm text-ink-muted">No current focus recorded.</p>
  </div>
</template>
<script setup>
const props = defineProps({ client: { type: Object, required: true } });
</script>
