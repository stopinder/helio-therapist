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
          </div>
        </div>
      </div>

      <div class="flex items-center gap-inline-sm flex-wrap">
        <button 
          @click="joinMeeting"
          :disabled="isInPerson || !session.meetingUrl"
          :title="isInPerson ? 'In-person session' : (!session.meetingUrl ? 'No video meeting link has been added.' : '')"
          class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isInPerson">In-person session</span>
          <span v-else>{{ videoLabel }}</span>
        </button>
        <button class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected">
          Add to Supervision
        </button>
        <button class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected">
          Save Notes
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
  }
});

const emit = defineEmits(['end-session']);

const isInPerson = computed(() => true); // Columns don't exist in Supabase yet, defaulting to safe in-person logic for UI

const isCompleted = computed(() => props.session.status === 'Completed' || props.session.status === 'completed');

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
