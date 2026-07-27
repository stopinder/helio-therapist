<template>
  <header class="bg-surface border-b border-border-muted px-inline-lg py-stack-md">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
      <div class="flex items-center gap-inline-md">
        <div class="h-10 w-10 rounded-pill bg-avatar flex items-center justify-center text-h3 font-semibold text-ink shrink-0">
          {{ clientInitials }}
        </div>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-inline-sm flex-wrap">
            <h1 class="text-h2 font-semibold text-ink truncate">{{ client.display_name }}</h1>
            <StatusBadge :status="client.status" />
          </div>
          <div class="flex flex-wrap items-center gap-x-inline-md gap-y-0 text-caption text-ink-muted">
            <span class="flex items-center gap-1">
              Next: {{ client.next_appointment }}
            </span>
            <span class="flex items-center gap-1">
              Therapist: {{ client.primary_therapist }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-inline-sm flex-wrap">
        <button class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected">
          Schedule
        </button>
        <button class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected">
          Add to Supervision
        </button>
        <button class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected">
          Create Document
        </button>
        <button 
          @click="joinMeeting"
          :disabled="mockSession.isInPerson || !mockSession.meetingUrl"
          :title="mockSession.isInPerson ? 'In-person session' : (!mockSession.meetingUrl ? 'No video meeting link has been added.' : '')"
          class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="mockSession.isInPerson">In-person session</span>
          <span v-else>{{ videoLabel }}</span>
        </button>
        <button 
          v-if="!isSessionWorkspace"
          @click="openSession"
          class="px-inline-md py-stack-xs bg-action-link text-body-sm font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected ring-offset-2"
        >
          Open Session Workspace
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import StatusBadge from './StatusBadge.vue';
import { mockSession } from '../../mocks/sessionWorkspaceData.js';
import { videoProviderService } from '../../lib/videoProvider.js';

const props = defineProps({
  client: {
    type: Object,
    required: true
  }
});

const router = useRouter();
const route = useRoute();

const isSessionWorkspace = computed(() => route.name === 'SessionWorkspace');

const openSession = () => {
  router.push({
    name: 'SessionWorkspace',
    params: {
      clientId: props.client.id,
      sessionId: 's123' // Mock session ID
    }
  });
};

const joinMeeting = () => {
  videoProviderService.openMeeting(mockSession);
};

const videoLabel = computed(() => {
  return videoProviderService.getVideoActionLabel(mockSession);
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
