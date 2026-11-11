<template>
  <section class="rounded-panel border border-border bg-surface-elevated p-5 sm:p-6 text-left space-y-3" role="alert" data-testid="summary-evidence-limit">
    <div class="space-y-1 min-w-0">
      <h3 class="text-body font-semibold text-ink">{{ kind === 'limit' ? 'Adjust the evidence window' : 'The summary could not be prepared' }}</h3>
      <p class="text-body-sm text-ink-secondary break-words">{{ failureMessage }}</p>
      <p class="text-caption text-ink-muted">{{ kind === 'limit' ? 'Choose fewer sessions or a different anchor, then generate again. Retrying the same selection will not help.' : 'Review the message above, then try again or adjust the selected evidence. Changing the selection does not generate or save anything automatically.' }}</p>
    </div>
    <div class="flex flex-col sm:flex-row gap-2">
      <button v-if="kind !== 'limit'" type="button" class="button-secondary w-full sm:w-auto" :disabled="retryDisabled" @click="$emit('retry')">Try again</button>
      <button type="button" class="button-secondary w-full sm:w-auto" @click="$emit('adjust')">Adjust evidence</button>
    </div>
  </section>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ message: { type: String, required: true }, kind: { type: String, default: 'limit' }, retryDisabled: { type: Boolean, default: false } })
// Always reassure the therapist that generation has not replaced their work,
// including generic/network errors which do not carry the server's safeguard text.
const failureMessage = computed(() => {
  const message = props.message.trim()
  return /\bunchanged\b/i.test(message) ? message : `${message} The current draft is unchanged.`
})
defineEmits(['adjust','retry'])
</script>
