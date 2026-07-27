<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <!-- Header -->
    <SessionWorkspaceHeader :session="mockSession" />

    <!-- Tabs -->
    <SessionWorkspaceTabs
      :tabs="tabs"
      v-model:activeTab="activeTab"
    />

    <!-- Tab Content -->
    <div class="flex-1 overflow-auto p-inline-lg py-stack-lg">
      <div class="max-w-6xl mx-auto">
        <TranscriptTab 
          v-if="activeTab === 'Transcript'" 
          :transcript="mockSession.transcript"
          :markers="mockSession.markers"
        />
        <TherapistNotesTab v-else-if="activeTab === 'Therapist Notes'" />
        <ReflectionTab v-else-if="activeTab === 'Reflection'" />
        <ClinicalSummaryTab v-else-if="activeTab === 'Clinical Summary'" />
        <SupervisionSummaryTab v-else-if="activeTab === 'Supervision Summary'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { mockSession } from '../mocks/sessionWorkspaceData.js';
import SessionWorkspaceHeader from '../components/workspace/SessionWorkspaceHeader.vue';
import SessionWorkspaceTabs from '../components/workspace/SessionWorkspaceTabs.vue';
import TranscriptTab from '../components/workspace/TranscriptTab.vue';
import TherapistNotesTab from '../components/workspace/TherapistNotesTab.vue';
import ReflectionTab from '../components/workspace/ReflectionTab.vue';
import ClinicalSummaryTab from '../components/workspace/ClinicalSummaryTab.vue';
import SupervisionSummaryTab from '../components/workspace/SupervisionSummaryTab.vue';

const tabs = [
  'Transcript',
  'Therapist Notes',
  'Reflection',
  'Clinical Summary',
  'Supervision Summary'
];

const activeTab = ref('Transcript');
</script>
