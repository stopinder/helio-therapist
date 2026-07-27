<template>
  <header class="bg-surface border-b border-border-muted px-inline-lg py-stack-lg">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-stack-lg">
      <div class="flex items-start gap-inline-md">
        <div class="h-12 w-12 rounded-pill bg-avatar flex items-center justify-center text-h2 font-semibold text-ink shrink-0">
          {{ clientInitials }}
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-inline-sm flex-wrap">
            <h1 class="text-h1 font-semibold text-ink">{{ client.display_name }}</h1>
            <StatusBadge :status="client.status" />
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-inline-lg gap-y-stack-xs text-body-sm text-ink-muted">
            <span class="flex items-center gap-1.5">
              <span class="text-caption">🗓️</span> Next: {{ client.next_appointment }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="text-caption">👤</span> {{ client.primary_therapist }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-inline-sm flex-wrap">
        <button class="px-inline-md py-stack-sm bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors">
          Create Document
        </button>
        <button class="px-inline-md py-stack-sm bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors">
          Schedule
        </button>
        <button class="px-inline-md py-stack-sm bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors">
          Add to Supervision
        </button>
        <button class="px-inline-md py-stack-sm bg-action-link text-body-sm font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors">
          Open Session
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import StatusBadge from './StatusBadge.vue';

const props = defineProps({
  client: {
    type: Object,
    required: true
  }
});

const clientInitials = computed(() => {
  if (!props.client.display_name) return '??';
  return props.client.display_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
});
</script>
