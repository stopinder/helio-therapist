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
        :ending="isEnding"
        :work-state="workSummary"
        @end-session="confirmEndSession"
        @pause-work="handlePauseWork"
        @resume-work="handleResumeWork"
      />

      <!-- End Session Confirmation Dialog -->
      <div v-if="showEndSessionConfirmation" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
        <div class="bg-surface max-w-md w-full rounded-panel shadow-xl border border-border overflow-hidden">
          <div class="p-6">
            <h3 class="text-h3 font-semibold text-ink mb-2">End this client session?</h3>
            <p class="text-body-sm text-ink-secondary">
              The appointment will be marked as completed. You can continue working on the documentation afterwards.
            </p>
          </div>
          <div class="flex items-center justify-end gap-inline-md p-4 bg-surface-subtle border-t border-border">
            <button 
              @click="showEndSessionConfirmation = false"
              :disabled="isEnding"
              class="px-inline-md py-stack-sm text-body-sm font-medium text-ink-secondary hover:text-ink transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              @click="handleEndSession"
              :disabled="isEnding"
              class="px-inline-md py-stack-sm bg-state-danger text-white text-body-sm font-medium rounded-control hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <span v-if="isEnding" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {{ isEnding ? 'Ending Session…' : 'End Session' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Billable Time Confirmation Dialog -->
      <div v-if="showBillingConfirmation" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
        <div class="bg-surface max-w-md w-full rounded-panel shadow-xl border border-border overflow-hidden">
          <div class="p-6">
            <h3 class="text-h3 font-semibold text-ink mb-2">Confirm Billable Time</h3>
            
            <div class="space-y-4 mt-4">
              <div class="p-3 bg-surface-subtle rounded border border-border">
                <p class="text-caption text-ink-muted uppercase tracking-wider mb-1">Recorded work time</p>
                <p class="text-h2 font-semibold text-ink">{{ workSummary?.recorded_minutes }} minutes</p>
              </div>

              <div class="space-y-1">
                <label for="billable-minutes" class="text-body-sm font-medium text-ink">Billable minutes</label>
                <input 
                  id="billable-minutes"
                  type="number" 
                  v-model.number="billableMinutes"
                  class="w-full p-2 border border-border rounded-control bg-surface text-ink focus:ring-2 focus:ring-state-selected focus:border-state-selected outline-none"
                  min="0"
                  max="1440"
                >
              </div>

              <div class="space-y-1">
                <label for="adjustment-reason" class="text-body-sm font-medium text-ink">
                  Adjustment reason
                  <span v-if="billableMinutes !== workSummary?.recorded_minutes" class="text-state-danger">*</span>
                </label>
                <textarea 
                  id="adjustment-reason"
                  v-model="adjustmentReason"
                  rows="3"
                  class="w-full p-2 border border-border rounded-control bg-surface text-ink focus:ring-2 focus:ring-state-selected focus:border-state-selected outline-none text-body-sm"
                  placeholder="Required if billable time differs from recorded time..."
                ></textarea>
              </div>

              <div v-if="error" class="p-3 bg-state-danger-surface border border-state-danger/20 rounded text-state-danger text-caption">
                {{ error }}
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-inline-md p-4 bg-surface-subtle border-t border-border">
            <button 
              @click="showBillingConfirmation = false; router.push(`/clients/${session.clientId}`)"
              :disabled="isConfirmingBilling"
              class="px-inline-md py-stack-sm text-body-sm font-medium text-ink-secondary hover:text-ink transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
            <button 
              @click="handleConfirmBilling"
              :disabled="isConfirmingBilling"
              class="px-inline-md py-stack-sm bg-state-selected text-white text-body-sm font-medium rounded-control hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <span v-if="isConfirmingBilling" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {{ isConfirmingBilling ? 'Confirming…' : 'Confirm Billable Time' }}
            </button>
          </div>
        </div>
      </div>

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
          <TherapistNotesTab v-else-if="activeTab === 'Notes'" />
          <ReflectionTab v-else-if="activeTab === 'Reflection'" />
          <ClinicalSummaryTab 
            v-else-if="activeTab === 'Clinical Record'" 
            :session="session"
            @update:session="session = $event"
          />
          <SupervisionSummaryTab v-else-if="activeTab === 'Supervision Summary'" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  getSession, 
  completeSessionRecord, 
  startSessionWork, 
  pauseSessionWork, 
  getSessionWorkSummary,
  confirmSessionBillableTime
} from '../lib/sessions.js';
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
const router = useRouter();
const session = ref(null);
const client = ref(null);
const loading = ref(true);
const error = ref('');
const isEnding = ref(false);
const showEndSessionConfirmation = ref(false);

// Billing state
const workSummary = ref(null);
const showBillingConfirmation = ref(false);
const billableMinutes = ref(0);
const adjustmentReason = ref('');
const isConfirmingBilling = ref(false);
const summaryInterval = ref(null);

const tabs = [
  'Transcript',
  'Notes',
  'Reflection',
  'Clinical Record',
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

    if (session.value.status === 'in_progress') {
      await startSessionWork(session.value.id);
      startSummaryPolling();
    }
    await refreshWorkSummary();
  } catch (e) {
    console.error('Session loading error:', e);
    error.value = 'The session workspace could not be loaded.';
  } finally {
    loading.value = false;
  }
}

async function refreshWorkSummary() {
  if (!session.value) return;
  try {
    workSummary.value = await getSessionWorkSummary(session.value.id);
    if (workSummary.value.tracking_state === 'completed' || workSummary.value.tracking_state === 'paused') {
      stopSummaryPolling();
    }
  } catch (e) {
    console.error('Failed to fetch work summary:', e);
  }
}

function startSummaryPolling() {
  stopSummaryPolling();
  summaryInterval.value = setInterval(refreshWorkSummary, 30000); // Poll every 30 seconds
}

function stopSummaryPolling() {
  if (summaryInterval.value) {
    clearInterval(summaryInterval.value);
    summaryInterval.value = null;
  }
}

async function handlePauseWork() {
  if (!session.value) return;
  try {
    await pauseSessionWork(session.value.id);
    await refreshWorkSummary();
    stopSummaryPolling();
  } catch (e) {
    console.error('Failed to pause work:', e);
  }
}

async function handleResumeWork() {
  if (!session.value) return;
  try {
    await startSessionWork(session.value.id);
    await refreshWorkSummary();
    startSummaryPolling();
  } catch (e) {
    console.error('Failed to resume work:', e);
  }
}

function confirmEndSession() {
  showEndSessionConfirmation.value = true;
}

async function handleEndSession() {
  if (isEnding.value || !session.value) return;
  
  isEnding.value = true;
  error.value = '';
  
  try {
    const updatedSession = await completeSessionRecord(session.value, session.value.notes);
    session.value = updatedSession;
    showEndSessionConfirmation.value = false;
    stopSummaryPolling();
    await refreshWorkSummary();
    
    // Default billable to recorded
    billableMinutes.value = workSummary.value.recorded_minutes;
    showBillingConfirmation.value = true;
  } catch (e) {
    console.error('Failed to end session:', e);
    error.value = e.message || 'Failed to end session. Please try again.';
    isEnding.value = false;
  }
}

async function handleConfirmBilling() {
  if (isConfirmingBilling.value || !session.value) return;
  
  const recorded = workSummary.value.recorded_minutes;
  if (billableMinutes.value !== recorded && !adjustmentReason.value.trim()) {
    error.value = 'An adjustment reason is required when billable time differs from recorded time.';
    return;
  }

  isConfirmingBilling.value = true;
  error.value = '';

  try {
    const updatedSession = await confirmSessionBillableTime({
      sessionId: session.value.id,
      billableMinutes: billableMinutes.value,
      adjustmentReason: adjustmentReason.value,
      expectedVersion: session.value.version
    });
    session.value = updatedSession;
    showBillingConfirmation.value = false;
    router.push(`/clients/${session.value.clientId}`);
  } catch (e) {
    console.error('Failed to confirm billing:', e);
    error.value = e.message || 'Failed to confirm billing. Please try again.';
    isConfirmingBilling.value = false;
  }
}

onUnmounted(stopSummaryPolling);

const workspaceSession = computed(() => {
  if (!session.value) return null;
  
  const dateObj = new Date(session.value.startedAt);
  const isValidDate = !isNaN(dateObj.getTime());

  return {
    // Session metadata
    id: session.value.id,
    clientId: session.value.clientId,
    status: session.value.status === 'in_progress' ? 'SESSION IN PROGRESS' : (session.value.status === 'completed' ? 'SESSION COMPLETED' : session.value.status.toUpperCase()),
    
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
    transcript: mockSession.transcript,
    markers: mockSession.markers
  };
});

onMounted(loadSession);
</script>
