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
      <SessionWorkspaceHeader 
        :session="workspaceSession" 
        @end-session="confirmEndSession"
      />

      <!-- Workflow Indicator -->
      <WorkflowIndicator 
        :activeStage="activeTab" 
        @select-stage="activeTab = $event"
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
          <TherapistNotesTab 
            v-else-if="activeTab === 'Notes'" 
            :clientId="session.clientId"
            :sessionId="session.id"
          />
          <ReflectionTab v-else-if="activeTab === 'Reflection'" />
          <ClinicalSummaryTab 
            v-else-if="activeTab === 'Clinical Record'" 
            :session="session"
            @update:session="session = $event"
          />
          <SupervisionSummaryTab v-else-if="activeTab === 'Professional Development'" />
        </div>
      </div>

      <!-- End Session Confirmation Modal -->
      <div v-if="showEndSessionConfirmation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-surface max-w-md w-full rounded-card shadow-xl p-6 border border-border">
          <h3 class="text-h3 font-semibold text-ink mb-2">End this client session?</h3>
          <p class="text-body text-ink-muted mb-6">
            Ending the session will complete the clinical record. You won't be able to edit the transcript or base notes after this.
          </p>
          <div class="flex flex-col sm:flex-row justify-end gap-3">
            <button 
              @click="showEndSessionConfirmation = false"
              class="px-4 py-2 bg-surface border border-border text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors font-medium"
            >
              Cancel
            </button>
            <button 
              @click="handleEndSession"
              class="px-4 py-2 bg-state-danger text-white rounded-control hover:opacity-90 transition-opacity font-medium shadow-sm"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getSession, completeSessionRecord } from '../lib/sessions.js';
import { getClient } from '../lib/clients.js';
import { mockSession } from '../mocks/sessionWorkspaceData.js';
import SessionWorkspaceHeader from '../components/workspace/SessionWorkspaceHeader.vue';
import WorkflowIndicator from '../components/workspace/WorkflowIndicator.vue';
import TranscriptTab from '../components/workspace/TranscriptTab.vue';
import TherapistNotesTab from '../components/workspace/TherapistNotesTab.vue';
import ReflectionTab from '../components/workspace/ReflectionTab.vue';
import ClinicalSummaryTab from '../components/workspace/ClinicalSummaryTab.vue';
import SupervisionSummaryTab from '../components/workspace/SupervisionSummaryTab.vue';

const route = useRoute();
const router = useRouter();
const session = ref(null);
const client = ref(null);
const loading = ref(true);
const error = ref('');

const tabs = [
  'Transcript',
  'Notes',
  'Reflection',
  'Clinical Record',
  'Professional Development'
];

const activeTab = ref('Transcript');

const showEndSessionConfirmation = ref(false);

function confirmEndSession() {
  showEndSessionConfirmation.value = true;
}

async function handleEndSession() {
  try {
    const updatedSession = await completeSessionRecord(session.value, session.value.notes);
    session.value = updatedSession;
    router.push(`/clients/${session.value.clientId}`);
  } catch (err) {
    console.error('Failed to complete session:', err);
  }
}

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
    // IMPORTANT: videoProvider and meetingUrl do not exist in the current Supabase schema
    videoProvider: 'zoom', // Hard-coded fallback for demonstration since columns don't exist
    meetingUrl: 'https://zoom.us/j/123456789', // Hard-coded fallback for demonstration
    isInPerson: false,
    
    // Fields still mocked for this phase
    elapsedTime: '00:00:00', // Will be incremented by the header component
    transcript: mockSession.transcript,
    markers: mockSession.markers
  };
});

onMounted(loadSession);
</script>
