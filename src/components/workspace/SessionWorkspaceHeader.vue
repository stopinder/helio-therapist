<template>
  <header class="bg-surface border-b border-border-muted px-inline-lg py-stack-md">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
      <div class="flex items-center gap-inline-md">
        <RouterLink :to="`/clients/${session.clientId}`" class="h-10 w-10 rounded-pill bg-avatar flex items-center justify-center text-h3 font-semibold text-ink shrink-0 hover:bg-avatar-hover transition-colors" title="Back to Client Record">←</RouterLink>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-inline-sm flex-wrap"><h1 class="text-h2 font-semibold text-ink truncate">{{ session.clientName }}</h1><StatusBadge status="active" :label="session.status" /></div>
          <div class="flex flex-wrap items-center gap-x-inline-md gap-y-0 text-caption text-ink-muted"><span class="font-medium">Session type: {{ session.type }}</span><span>{{ session.date }} at {{ session.time }}</span></div>
        </div>
      </div>
      <div class="flex items-center gap-inline-sm flex-wrap">
        <button @click="emit('join-meeting')" :disabled="isInPerson || joiningMeeting" :aria-busy="joiningMeeting" :title="isInPerson ? 'In-person session' : ''" class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected disabled:opacity-50 disabled:cursor-not-allowed">{{ joiningMeeting ? 'Opening Zoom…' : videoLabel }}</button>
        <button class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected disabled:opacity-50 disabled:cursor-not-allowed" disabled>Save Notes</button>
        <button @click="emit('end-session')" class="px-inline-md py-stack-xs bg-state-danger text-body-sm font-medium text-white rounded-control hover:opacity-90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger ring-offset-2">End Session</button>
      </div>
    </div>
    <div v-if="meetingError" role="alert" class="mt-stack-sm rounded-control border border-state-danger/20 bg-state-danger/5 px-inline-md py-stack-xs text-body-sm text-state-danger">{{ meetingError }}</div>
  </header>
</template>
<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import StatusBadge from './StatusBadge.vue';
import { videoProviderService } from '../../lib/videoProvider.js';
const props = defineProps({ session: { type: Object, required: true }, joiningMeeting: { type: Boolean, default: false }, meetingError: { type: String, default: '' } });
const emit = defineEmits(['end-session', 'join-meeting']);
const isInPerson = computed(() => props.session.type === 'In-person');
const videoLabel = computed(() => isInPerson.value ? 'In-person session' : videoProviderService.getVideoActionLabel({ videoProvider: 'zoom', meetingUrl: 'server-resolved', status: props.session.status }));
</script>
