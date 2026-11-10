<template>
  <section class="rounded-panel border border-border bg-surface-elevated p-5 sm:p-6 text-left space-y-3" role="alert" data-testid="summary-evidence-limit">
    <div class="space-y-1 min-w-0">
      <h3 class="text-body font-semibold text-ink">Adjust the evidence window</h3>
      <p class="text-body-sm text-ink-secondary break-words">{{ message }}</p>
      <p class="text-caption text-ink-muted">Choose fewer sessions or a different anchor, then generate again. Retrying the same selection will not help.</p>
    </div>
    <button type="button" class="button-secondary w-full sm:w-auto" @click="$emit('adjust')">Adjust evidence</button>
  </section>
</template>
<script setup>
defineProps({ message: { type: String, required: true } })
defineEmits(['adjust'])
</script>
