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
            <StatusBadge :status="session.status.toLowerCase().includes('completed') ? 'success' : 'active'" :label="session.status" />
          </div>
          <div class="flex flex-wrap items-center gap-x-inline-md gap-y-0 text-caption text-ink-muted">
            <span class="font-medium">{{ session.type }}</span>
            <span>{{ session.date }} at {{ session.time }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-inline-sm flex-wrap">
        <div class="flex items-center gap-inline-md mr-inline-md">
          <div class="flex flex-col items-end">
            <span class="text-caption font-semibold text-ink">{{ workStatusLabel }}</span>
            <span class="text-caption text-ink-muted">{{ recordedTimeLabel }}</span>
          </div>
          <div v-if="!isCompleted" class="flex items-center gap-inline-sm">
            <button 
              v-if="workState?.tracking_state === 'running'"
              @click="emit('pause-work')"
              class="p-1.5 rounded-pill bg-surface border border-border text-ink-secondary hover:bg-surface-subtle transition-colors"
              title="Pause Work"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
              </svg>
            </button>
            <button 
              v-else
              @click="emit('resume-work')"
              class="p-1.5 rounded-pill bg-surface border border-border text-ink-secondary hover:bg-surface-subtle transition-colors"
              title="Resume Work"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M6.3 2.841A.75.75 0 017 3.5v13a.75.75 0 01-1.144.644L1.856 14.634A.75.75 0 011.5 14V6a.75.75 0 01.356-.634l4-2.525zM10.8 2.841A.75.75 0 0111.5 3.5v13a.75.75 0 01-1.144.644L6.356 14.634A.75.75 0 016 14V6a.75.75 0 01.356-.634l4-2.525z" />
              </svg>
            </button>
          </div>
        </div>

        <div 
          v-if="isInPerson"
          class="px-inline-md py-stack-xs bg-surface-subtle border border-border text-caption font-medium text-ink-secondary rounded-control"
        >
          Session type: In-person
        </div>
        <button 
          v-else
          @click="joinMeeting"
          :disabled="!session.meetingUrl"
          :title="!session.meetingUrl ? 'No video meeting link has been added.' : ''"
          class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ videoLabel }}
        </button>
        <button 
          v-if="!isCompleted"
          @click="emit('end-session')"
          :disabled="ending"
          class="px-inline-md py-stack-xs bg-state-danger text-body-sm font-medium text-white rounded-control hover:opacity-90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ ending ? 'Ending Session…' : 'End Session' }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import StatusBadge from './StatusBadge.vue';
import { videoProviderService } from '../../lib/videoProvider.js';

const props = defineProps({
  session: {
    type: Object,
    required: true
  },
  ending: {
    type: Boolean,
    default: false
  },
  workState: {
    type: Object,
    default: () => ({ tracking_state: 'not_started', recorded_minutes: 0 })
  }
});

const emit = defineEmits(['end-session', 'pause-work', 'resume-work', 'add-to-supervision']);

const isInPerson = computed(() => true); // Columns don't exist in Supabase yet, defaulting to safe in-person logic for UI

const isCompleted = computed(() => props.session.status === 'Completed' || props.session.status === 'completed');

const workStatusLabel = computed(() => {
  if (isCompleted.value) return 'Work completed';
  switch (props.workState?.tracking_state) {
    case 'running': return 'Work time active';
    case 'paused': return 'Work paused';
    default: return 'Work not started';
  }
});

const recordedTimeLabel = computed(() => {
  if (!props.workState) return '';
  if (props.workState.tracking_state === 'not_tracked') return 'Recorded: Not tracked';
  if (props.workState.recorded_minutes === undefined || props.workState.recorded_minutes === null) return '';
  return `Recorded: ${props.workState.recorded_minutes} min`;
});

const joinMeeting = () => {
  // Use mock data as these columns don't exist in Supabase yet
  videoProviderService.openMeeting({
    videoProvider: 'zoom',
    meetingUrl: 'https://zoom.us/j/123456789'
  });
};

const videoLabel = computed(() => {
  return videoProviderService.getVideoActionLabel({
    videoProvider: 'zoom',
    meetingUrl: 'https://zoom.us/j/123456789',
    status: 'Scheduled'
  });
});
</script>
