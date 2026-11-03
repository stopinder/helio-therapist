<template>
  <button
    type="button"
    data-whisper-control
    class="whisper-mic inline-flex shrink-0 items-center justify-center rounded-full bg-surface-subtle text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink focus:outline-none focus:ring-2 focus:ring-state-focus-ring disabled:cursor-not-allowed disabled:opacity-40"
    :class="[compact ? 'h-8 w-8' : 'h-9 w-9', recording ? 'bg-state-danger/10 text-state-danger hover:bg-state-danger/15 hover:text-state-danger' : '']"
    :disabled="disabled || transcribing"
    :aria-label="ariaLabel"
    :title="ariaLabel"
    :aria-pressed="recording"
    @click="$emit('toggle')"
  >
    <LoaderCircle v-if="transcribing" class="h-4 w-4 animate-spin" aria-hidden="true" />
    <Square v-else-if="recording" class="h-3.5 w-3.5 fill-current" aria-hidden="true" />
    <Mic v-else class="h-4 w-4" aria-hidden="true" />
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { LoaderCircle, Mic, Square } from '@lucide/vue'

const props = defineProps({
  recording: { type: Boolean, default: false },
  transcribing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  compact: { type: Boolean, default: true },
  label: { type: String, default: 'Dictate' }
})
defineEmits(['toggle'])

const ariaLabel = computed(() => props.transcribing ? 'Transcribing' : props.recording ? 'Stop recording' : props.label)
</script>
