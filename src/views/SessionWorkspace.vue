<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-ink-muted flex flex-col items-center gap-2">
        <span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
        <p>Loading session workspace…</p>
      </div>
    </div>
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-inline-lg">
      <div class="max-w-md w-full bg-surface p-inline-lg py-stack-lg rounded-card shadow-sm border border-state-danger/20 text-center">
        <h2 class="text-h2 font-semibold text-state-danger mb-2">Workspace Error</h2>
        <p class="text-ink-secondary mb-6">{{ error }}</p>
        <button 
          @click="loadSession"
          class="px-inline-md py-stack-sm bg-state-selected text-white rounded-control hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
    <template v-else-if="session">
      <!-- Header -->
      <SessionWorkspaceHeader :session="workspaceSession" />

      <!-- Workflow Indicator -->
      <WorkflowIndicator :activeStage="activeTab" />

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
            :transcript="workspaceSession.transcript"
            :markers="workspaceSession.markers"
            :activeTab="activeTab"
          />
          <TherapistNotesTab v-else-if="activeTab === 'Therapist Notes'" />
          <ReflectionTab v-else-if="activeTab === 'Reflection'" />
          <ClinicalSummaryTab v-else-if="activeTab === 'Clinical Summary'" />
          <SupervisionSummaryTab v-else-if="activeTab === 'Supervision Summary'" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { getSession } from '../lib/sessions.js';
import { getClient } from '../lib/clients.js';
import { mockSession } from '../mocks/sessionWorkspaceData.js';
import SessionWorkspaceHeader from '../components/workspace/SessionWorkspaceHeader.vue';
import SessionWorkspaceTabs from '../components/workspace/SessionWorkspaceTabs.vue';
import WorkflowIndicator from '../components/workspace/WorkflowIndicator.vue';
import TranscriptTab from '../components/workspace/TranscriptTab.vue';
import TherapistNotesTab from '../components/workspace/TherapistNotesTab.vue';
import ReflectionTab from '../components/workspace/ReflectionTab.vue';
import ClinicalSummaryTab from '../components/workspace/ClinicalSummaryTab.vue';
import SupervisionSummaryTab from '../components/workspace/SupervisionSummaryTab.vue';

const route = useRoute();
const session = ref(null);
const client = ref(null);
const loading = ref(true);
const error = ref('');

const tabs = [
  'Transcript',
  'Therapist Notes',
  'Reflection',
  'Clinical Summary',
  'Supervision Summary'
];

const activeTab = ref('Transcript');

async function loadSession() {
  loading.value = true;
  error.value = '';
  try {
    const { clientId, sessionId } = route.params;
    const [sessionData, clientData] = await Promise.all([
      getSession({ clientId, sessionId }),
      getClient({ clientId })
    ]);
    session.value = sessionData;
    client.value = clientData;
  } catch (e) {
    console.error('Session loading error:', e);
    error.value = 'The session workspace could not be loaded.';
  } finally {
    loading.value = false;
  }
}

const workspaceSession = computed(() => {
  if (!session.value) return null;
  
  const dateObj = new Date(session.value.startedAt);
  const isValidDate = !isNaN(dateObj.getTime());

  return {
    // Session metadata
    id: session.value.id,
    clientId: session.value.clientId,
    status: session.value.status === 'in_progress' ? 'In Progress' : (session.value.status === 'completed' ? 'Completed' : session.value.status),
    
    // Real client data
    clientName: client.value?.name || 'Unknown Client',
    
    // Derived display values
    date: isValidDate ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Pending',
    time: isValidDate ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
    type: 'Clinical session',

    // Video provider data (from session if available, otherwise fallback)
    videoProvider: session.value.videoProvider || 'in_person',
    meetingUrl: session.value.meetingUrl || null,
    isInPerson: session.value.videoProvider === 'in_person' || !session.value.videoProvider,
    
    // Fields still mocked for this phase
    elapsedTime: '00:00:00', // Will be incremented by the header component
    transcript: mockSession.transcript,
    markers: mockSession.markers
  };
});

onMounted(loadSession);
</script>
