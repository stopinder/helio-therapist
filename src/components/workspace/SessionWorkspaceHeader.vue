<template>
  <header class="bg-surface border-b border-border-muted px-inline-lg py-stack-md">
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  session: {
    type: Object,
    required: true
  }
})
</script>
