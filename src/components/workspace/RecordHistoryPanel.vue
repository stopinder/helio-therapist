<template>
  <section class="bg-surface border border-border-muted rounded-panel p-4 mt-8">
    <h4 class="text-body-sm font-bold text-ink uppercase tracking-wider mb-4 px-2">Record History</h4>
    <div class="space-y-4">
      <div 
        v-for="(entry, index) in history" 
        :key="index"
        class="p-3 border border-border rounded-control bg-surface-subtle"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-body-sm font-bold text-ink">{{ entry.title }}</span>
          <StatusBadge :status="entry.status" :label="entry.statusLabel" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-caption text-ink-muted">
          <div v-if="entry.author">
            <span class="font-medium">Author:</span> {{ entry.author }}
          </div>
          <div v-if="entry.approvedDate">
            <span class="font-medium">Approved:</span> {{ entry.approvedDate }}
          </div>
          <div v-if="entry.createdDate">
            <span class="font-medium">Created:</span> {{ entry.createdDate }}
          </div>
          <div v-if="entry.reason" class="col-span-full mt-1 p-2 bg-surface rounded border border-border-muted italic">
            <span class="font-medium not-italic">Reason:</span> {{ entry.reason }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import StatusBadge from './StatusBadge.vue';

defineProps({
  history: {
    type: Array,
    required: true
  }
});
</script>
