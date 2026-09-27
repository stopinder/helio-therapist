<template>
  <button type="button" class="inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-control px-2 text-body-sm font-medium text-action-link hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-link" :aria-label="label" aria-haspopup="dialog" @click="openHelp(topic)">
    <CircleHelp class="h-4 w-4" aria-hidden="true" />
    <span>How this works</span>
  </button>
</template>
<script setup>
import { CircleHelp } from '@lucide/vue'
import { useHelp } from '../../composables/useHelp.js'
defineProps({ topic: { type: String, required: true }, label: { type: String, default: 'How this works' } })
const { openHelp } = useHelp()
</script>
