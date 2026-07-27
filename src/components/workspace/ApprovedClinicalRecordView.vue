<template>
  <div class="space-y-6">
    <div v-for="(label, key) in fields" :key="key" class="space-y-2">
      <h5 class="text-caption font-bold text-ink-muted uppercase tracking-wider">{{ label }}</h5>
      <div class="p-4 rounded-control border border-border-muted bg-surface-subtle text-body-sm text-ink leading-relaxed">
        {{ data[key] || 'No content provided.' }}
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  fields: { type: Object, required: true },
  data: { type: Object, required: true }
});
</script>
