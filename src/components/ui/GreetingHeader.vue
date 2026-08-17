<template>
  <header class="space-y-2">
    <p v-if="eyebrow" class="type-eyebrow text-action-primary">
      {{ eyebrow }}<span v-if="time" class="ml-2 text-ink-muted font-normal">· {{ time }}</span>
    </p>
    <h1 class="type-greeting text-ink">
      <span>{{ phrase }}</span><template v-if="displayName">, {{ displayName }}</template>
    </h1>
    <p v-if="supporting" class="type-body text-ink-muted">{{ supporting }}</p>
  </header>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  time: { type: String, default: '' },
  phrase: { type: String, required: true },
  displayName: { type: String, default: '' },
  supporting: { type: String, default: '' }
})
</script>
