<template>
  <header class="bg-surface border-b border-border-muted px-inline-lg py-stack-md">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
      <div class="flex items-center gap-inline-md">
        <RouterLink :to="`/clients/${session.clientId}`" class="h-10 w-10 rounded-pill bg-avatar flex items-center justify-center text-h3 font-semibold text-ink shrink-0 hover:bg-avatar-hover transition-colors" title="Back to Client Workspace">←</RouterLink>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-inline-sm flex-wrap"><h1 class="text-h2 font-semibold text-ink truncate">{{ session.clientName }}</h1><StatusBadge status="active" :label="session.status" /></div>
          <div class="flex flex-wrap items-center gap-x-inline-md gap-y-0 text-caption text-ink-muted"><span class="font-medium">Session type: {{ session.type }}</span><span>{{ session.date }} at {{ session.time }}</span></div>
        </div>
      </div>
      <div class="flex items-center gap-inline-sm">
        <RouterLink
          :to="`/clients/${session.clientId}`"
          class="px-inline-sm py-stack-xs bg-[#0b4654] text-white text-body-sm font-medium rounded-control hover:bg-[#0f5968] transition-colors"
        >
          Client Workspace
        </RouterLink>
      </div>
    </div>
    <p v-if="!isInPerson" class="mt-stack-sm text-caption text-ink-muted">Zoom opens the video call in a separate tab. Keep Clinical Workspace open in Helio for session capture, notes and review.</p>
  </header>
</template>
<script setup>
import { computed } from 'vue'; import { RouterLink } from 'vue-router'; import StatusBadge from './StatusBadge.vue';
const props=defineProps({session:{type:Object,required:true}}); const isInPerson=computed(()=>props.session.type==='In-person');
</script>
