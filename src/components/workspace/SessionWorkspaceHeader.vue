<template>
  <header class="bg-surface border-b border-border-muted px-inline-lg py-stack-md">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
      <div class="flex items-center gap-inline-md">
        <RouterLink 
          :to="`/clients/${session.clientId}`"
          class="h-10 w-10 rounded-pill bg-avatar flex items-center justify-center text-h3 font-semibold text-ink shrink-0 hover:bg-avatar-hover transition-colors"
          title="Back to Client Record"
        >
          ←
        </RouterLink>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-inline-sm flex-wrap">
            <h1 class="text-h2 font-semibold text-ink truncate">{{ session.clientName }}</h1>
            <StatusBadge status="active" :label="session.status" />
          </div>
          <div class="flex flex-wrap items-center gap-x-inline-md gap-y-0 text-caption text-ink-muted">
            <span class="font-medium">{{ session.type }}</span>
            <span>{{ session.date }} at {{ session.time }}</span>
            <span class="flex items-center gap-1 text-action-link font-mono bg-state-selected px-2 rounded-pill">
              ⏱ {{ displayTime }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-inline-sm flex-wrap">
        <div class="flex items-center gap-2 mr-4 px-3 py-1 bg-state-success-surface border border-state-success/20 rounded-pill">
          <span class="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
          <span class="text-caption text-state-success font-semibold tracking-wide uppercase">Listening…</span>
        </div>
        <button class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected">
          Add to Supervision
        </button>
        <button class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected">
          Save Notes
        </button>
        <button class="px-inline-md py-stack-xs bg-state-danger text-body-sm font-medium text-white rounded-control hover:opacity-90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger ring-offset-2">
          End Session
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import StatusBadge from './StatusBadge.vue';

const props = defineProps({
  session: {
    type: Object,
    required: true
  }
});

const displayTime = ref(props.session.elapsedTime || '45:00');
let timerInterval = null;

const incrementTimer = () => {
  const [mins, secs] = displayTime.value.split(':').map(Number);
  let newSecs = secs + 1;
  let newMins = mins;
  if (newSecs >= 60) {
    newSecs = 0;
    newMins++;
  }
  displayTime.value = `${String(newMins).padStart(2, '0')}:${String(newSecs).padStart(2, '0')}`;
};

onMounted(() => {
  timerInterval = setInterval(incrementTimer, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>
