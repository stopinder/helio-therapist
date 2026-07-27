<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-border-muted rounded-panel bg-surface-subtle/50">
    <div class="text-3xl mb-4">{{ icon }}</div>
    <h3 class="text-h3 font-semibold text-ink">{{ title }}</h3>
    <p class="mt-2 text-body text-ink-muted max-w-xs mx-auto">
      {{ description }}
    </p>
    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  description: String,
  icon: {
    type: String,
    default: '📭'
  }
});
</script>
