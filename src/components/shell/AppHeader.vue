<template>
  <header class="flex h-16 shrink-0 items-center justify-between border-b border-border-muted bg-surface px-inline-lg md:px-6">
    <div class="flex min-w-0 items-center gap-inline-md">
      <button
        class="-ml-2 rounded-control p-2 text-ink-secondary hover:bg-surface-subtle md:hidden"
        aria-label="Open menu"
        @click="$emit('open-menu')"
      >
        <Menu class="workspace-icon-lg" />
      </button>

      <h2 class="truncate type-body-medium text-ink">{{ pageName }}</h2>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <div
        class="hidden items-center gap-2.5 whitespace-nowrap text-ink-muted md:flex"
        data-testid="global-appointment-clock"
        :data-appointment-status="appointmentStatus"
        aria-live="polite"
      >
        <time class="type-ui tabular-nums font-medium text-ink-secondary" :datetime="now.toISOString()">
          {{ currentTimeLabel }}
        </time>
        <span class="h-4 w-px bg-border-muted" aria-hidden="true"></span>
        <span
          v-if="nextAppointment"
          class="type-metadata flex items-center gap-1.5"
          :class="{
            'text-ink-muted': appointmentStatus === 'neutral',
            'text-ink-secondary': appointmentStatus === 'approaching',
            'text-brand-amber font-medium': appointmentStatus === 'warning',
            'text-state-danger font-semibold': appointmentStatus === 'imminent'
          }"
        >
          <span>Next {{ nextAppointmentTimeLabel }}</span>
          <span class="tabular-nums">{{ nextAppointmentCountdownLabel }}</span>
        </span>
        <span v-else class="type-metadata text-ink-subtle">No upcoming appointment</span>
      </div>

      <span class="mx-1 hidden h-6 w-px bg-border-muted md:block" aria-hidden="true"></span>

      <button
        type="button"
        class="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-control border px-3 type-ui transition-colors"
        :class="outstandingReminderCount
          ? 'border-brand-amber/40 bg-brand-amber-soft/60 text-ink'
          : 'border-border-muted bg-surface text-ink-secondary hover:bg-surface-subtle'"
        :aria-expanded="quickCaptureOpen"
        aria-haspopup="dialog"
        @click="$emit('toggle-quick-capture')"
      >
        <Plus class="workspace-icon-sm text-focus" aria-hidden="true" />
        <span class="hidden sm:inline">Quick capture</span>
        <span
          v-if="outstandingReminderCount"
          class="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand-amber/15 px-1.5 type-metadata font-semibold"
        >
          {{ outstandingReminderCount }}
        </span>
      </button>

      <router-link
        v-if="routePath !== '/schedule'"
        to="/schedule"
        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border-muted bg-surface text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink lg:w-auto lg:gap-1.5 lg:px-3"
        aria-label="Schedule appointment"
        title="Schedule appointment"
      >
        <CalendarDays class="workspace-icon-sm text-accent" aria-hidden="true" />
        <span class="hidden lg:inline">Schedule</span>
      </router-link>

      <button
        type="button"
        class="inline-flex h-9 min-w-[3.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-control border px-2.5 type-ui font-semibold transition-colors"
        :class="canJoinNextAppointment
          ? 'border-action-primary bg-action-primary text-on-action hover:bg-action-primary-hover'
          : 'border-border-muted bg-surface-subtle text-ink-subtle cursor-default'"
        :disabled="!canJoinNextAppointment || joiningNextAppointment"
        :title="canJoinNextAppointment ? 'Join next appointment' : 'No joinable appointment'"
        @click="$emit('join-next-appointment')"
      >
        {{ joiningNextAppointment ? 'Opening…' : 'Join' }}
      </button>
    </div>
  </header>
</template>

<script setup>
import { CalendarDays, Menu, Plus } from '@lucide/vue'

defineProps({
  pageName: { type: String, required: true },
  routePath: { type: String, required: true },
  now: { type: Date, required: true },
  currentTimeLabel: { type: String, required: true },
  nextAppointment: { type: Object, default: null },
  nextAppointmentTimeLabel: { type: String, default: '' },
  nextAppointmentCountdownLabel: { type: String, default: '' },
  appointmentStatus: { type: String, required: true },
  canJoinNextAppointment: Boolean,
  joiningNextAppointment: Boolean,
  outstandingReminderCount: { type: Number, default: 0 },
  quickCaptureOpen: Boolean
})

defineEmits(['open-menu', 'toggle-quick-capture', 'join-next-appointment'])
</script>
