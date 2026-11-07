<template>
  <header class="border-b border-border-muted bg-surface px-4 py-2.5 md:px-6" data-testid="compact-encounter-header">
    <div class="mx-auto flex max-w-4xl items-center gap-3">
      <RouterLink
        :to="returnTo || ('/clients/' + session.clientId)"
        :aria-label="returnLabel"
        :title="returnLabel"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ink-secondary transition-colors hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-link"
      >
        <ArrowLeft class="h-4 w-4" aria-hidden="true" />
      </RouterLink>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 class="max-w-full truncate text-lg font-semibold leading-tight text-ink">{{ session.clientName }}</h1>
          <StatusBadge status="active" :label="session.status" />
        </div>
        <p class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-caption text-ink-muted">
          <span>Session type: {{ session.type }}</span>
          <span>{{ session.date }} at {{ session.time }}</span>
        </p>
      </div>
      <RouterLink
        v-if="showClientLink"
        :to="'/clients/' + session.clientId"
        class="hidden min-h-9 shrink-0 items-center rounded-control border border-border-muted px-3 text-body-sm font-medium text-action-link hover:bg-surface-subtle sm:inline-flex"
      >Client Workspace</RouterLink>
      <button
        v-if="!isTranscriptReady"
        type="button"
        @click="emit('join-meeting')"
        :disabled="isInPerson || joiningMeeting"
        :aria-busy="joiningMeeting"
        class="min-h-9 shrink-0 rounded-control bg-action-primary px-3 text-body-sm font-medium text-on-action transition-colors hover:bg-action-primary-hover disabled:opacity-50"
      >{{ joiningMeeting ? 'Opening Zoom…' : videoLabel }}</button>
    </div>
    <p v-if="!isInPerson && !isTranscriptReady" class="mx-auto mt-2 max-w-4xl text-caption text-ink-muted">
      Zoom opens the video call in a separate tab. Keep Clinical Workspace open in Helio for session capture, notes and review.
    </p>
    <p v-if="meetingError" role="alert" class="mx-auto mt-2 max-w-4xl rounded-control border border-state-danger/20 bg-state-danger-surface px-3 py-2 text-body-sm text-state-danger">
      {{ meetingError }}
    </p>
  </header>
</template>
<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import StatusBadge from './StatusBadge.vue'
import { videoProviderService } from '../../lib/videoProvider.js'

const props = defineProps({
  session: { type: Object, required: true },
  returnTo: { type: [String, Object], default: null },
  returnLabel: { type: String, default: 'Back to Client Workspace' },
  showClientLink: { type: Boolean, default: false },
  joiningMeeting: { type: Boolean, default: false },
  meetingError: { type: String, default: '' }
})
const emit = defineEmits(['join-meeting'])
const isInPerson = computed(() => props.session.type === 'In-person')
const isTranscriptReady = computed(() => props.session.status === 'Transcript Ready')
const videoLabel = computed(() =>
  isInPerson.value ? 'In-person session' : videoProviderService.getVideoActionLabel({
    videoProvider: 'zoom', meetingUrl: 'server-resolved', status: props.session.status
  })
)
</script>
