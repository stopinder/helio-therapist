<template>
  <div class="bg-surface-subtle border-l-4 border-l-action-link border-y border-r border-border-muted rounded-panel overflow-hidden shadow-sm">
    <div class="px-inline-lg py-stack-sm border-b border-border-muted bg-surface/50">
      <h3 class="text-body font-bold text-ink flex items-center gap-2">
        <span class="text-action-link">✨</span> Clinical Attention
      </h3>
    </div>
    <div class="p-inline-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-inline-lg gap-y-stack-md">
      <div v-for="item in client.attention_items" :key="item.id" class="flex flex-col items-start group py-1">
        <StatusBadge :status="item.status" :label="item.label" />
        <div class="mt-2 flex flex-col">
          <span class="text-body-sm text-ink font-medium">{{ item.description }}</span>
          <div v-if="item.due || item.priority" class="flex items-center gap-2 mt-0.5">
            <span v-if="item.due" class="text-caption text-ink-muted">{{ item.due }}</span>
            <span v-if="item.priority" class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-state-danger"></span>
              <span class="text-caption font-bold text-state-danger uppercase tracking-tighter">{{ item.priority }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import StatusBadge from './StatusBadge.vue';

const props = defineProps({
  client: {
    type: Object,
    required: true
  }
});
</script>
