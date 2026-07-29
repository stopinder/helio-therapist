<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-ink-muted flex flex-col items-center gap-2">
        <span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
        <p>Loading client workspace…</p>
      </div>
    </div>
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-inline-lg">
      <div class="max-w-md w-full bg-surface p-inline-lg py-stack-lg rounded-card shadow-sm border border-state-danger/20 text-center">
        <h2 class="text-h2 font-semibold text-state-danger mb-2">Workspace Error</h2>
        <p class="text-ink-secondary mb-6">{{ error }}</p>
        <button 
          @click="loadClient"
          class="px-inline-md py-stack-sm bg-state-selected text-white rounded-control hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
    <template v-else-if="client">
      <!-- Header -->
      <ClientWorkspaceHeader :client="client" />

      <!-- Tabs -->
      <ClientWorkspaceTabs
        :tabs="tabs"
        v-model:activeTab="activeTab"
      />

      <!-- Tab Content -->
      <div class="flex-1 overflow-auto p-inline-lg py-stack-lg">
        <div class="max-w-6xl mx-auto space-y-stack-lg">
          <!-- Overview Tab -->
          <div v-if="activeTab === 'Overview'" class="space-y-stack-lg">
            <!-- Clinical Attention moved to top and full width -->
            <ClinicalAttentionPanel :client="client" />

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
              <!-- Left Column -->
              <div class="lg:col-span-2 space-y-stack-lg">
                <!-- Recent Sessions -->
                <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
                  <h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Recent Sessions</h3>
                  <div class="space-y-stack-md pb-stack-md">
                    <div v-for="session in client.recent_sessions || mockClient.recent_sessions" :key="session.id" class="flex flex-col p-inline-md border border-border rounded-control bg-surface-subtle">
                      <div class="flex justify-between items-center">
                        <span class="font-medium text-ink">{{ session.type }}</span>
                        <span class="text-caption text-ink-muted">{{ session.date }}</span>
                      </div>
                      <p class="text-body-sm text-ink-secondary mt-1">{{ session.note }}</p>
                    </div>
                  </div>
                </section>

                <!-- Current Goals -->
                <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
                  <h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Current Goals</h3>
                  <div class="space-y-stack-sm pb-stack-md">
                    <div v-for="goal in client.goals || mockClient.goals" :key="goal.id" class="flex items-center gap-inline-md p-inline-md border border-border rounded-control">
                      <span class="text-xl">{{ goal.status === 'Completed' ? '✅' : '🎯' }}</span>
                      <div class="flex-1">
                        <p class="text-body-sm text-ink" :class="{ 'line-through text-ink-muted': goal.status === 'Completed' }">{{ goal.text }}</p>
                        <StatusBadge :status="goal.status === 'Completed' ? 'success' : 'pending'" :label="goal.status" />
                      </div>
                    </div>
                  </div>
                </section>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
                  <!-- Recent Documents -->
                  <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
                    <h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Recent Documents</h3>
                    <div class="space-y-stack-sm pb-stack-md">
                      <div v-for="doc in client.recent_documents || mockClient.recent_documents" :key="doc.id" 
                           class="flex items-center justify-between p-inline-md border border-border rounded-control bg-surface hover:border-action-link transition-colors cursor-pointer group"
                           tabindex="0"
                           role="button"
                           :aria-label="`Open document ${doc.name}`">
                        <div class="flex flex-col min-w-0 flex-1">
                          <div class="flex items-center gap-inline-sm flex-wrap">
                            <span class="text-body-sm text-ink truncate group-hover:text-action-link font-medium">{{ doc.name }}</span>
                            <StatusBadge :status="doc.status" />
                          </div>
                          <span class="text-caption text-ink-muted mt-0.5">{{ doc.date }}</span>
                        </div>
                        <span class="text-ink-subtle group-hover:text-action-link ml-2">→</span>
                      </div>
                    </div>
                  </section>

                  <!-- Upcoming Tasks -->
                  <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
                    <h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Upcoming Tasks</h3>
                    <div class="space-y-stack-sm pb-stack-md">
                      <div v-for="task in client.upcoming_tasks || mockClient.upcoming_tasks" :key="task.id" class="flex items-center justify-between p-inline-md border border-border rounded-control bg-surface">
                        <span class="text-body-sm text-ink truncate">{{ task.text }}</span>
                        <span class="text-caption text-state-warning">Due {{ task.due }}</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <!-- Right Column -->
              <div class="space-y-stack-lg">
                <div class="p-inline-md bg-state-warning-surface border border-state-warning/20 rounded-panel">
                  <p class="text-caption text-state-warning font-medium uppercase tracking-wider mb-1">Notice</p>
                  <p class="text-body-sm text-ink-secondary">This workspace uses <strong>mock data</strong> for clinical demonstration purposes.</p>
                </div>
                <!-- Placeholder for future Right Panel items (e.g. Risk Review detail) -->
                <div class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
                   <h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Care Team</h3>
                   <p class="text-body-sm text-ink-muted italic">Primary: {{ client.primary_therapist || mockClient.primary_therapist }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Details Tab -->
          <div v-else-if="activeTab === 'Details'">
            <ClientDetails :client="client" @updated="client = $event" />
          </div>

          <!-- Other Tabs Placeholders -->
          <div v-else>
            <div v-if="activeTab === 'Timeline'" class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg max-w-2xl mx-auto">
              <h3 class="text-h3 font-semibold text-ink mb-stack-lg pt-stack-md">Client Timeline</h3>
              <div v-if="timelineLoading" class="py-stack-xl text-center">
                <p class="text-body-sm text-ink-subtle">Loading clinical narrative...</p>
              </div>
              <div v-else-if="timelineEvents.length === 0" class="py-stack-xl text-center">
                <p class="text-body-sm text-ink-subtle">No clinical events recorded for this client.</p>
              </div>
              <div v-else class="space-y-0">
                <TimelineItem 
                  v-for="(event, index) in timelineEvents" 
                  :key="event.id"
                  :event-type="event.event_type"
                  :date="formatDate(event.occurred_at)"
                  :description="event.summary"
                  :subject-type="event.subject_type"
                  :subject-id="event.subject_id"
                  :session-id="event.session_id"
                  :is-last="index === timelineEvents.length - 1"
                />
              </div>
            </div>

            <EmptyState
              v-else
              :title="activeTab"
              :description="`The ${activeTab} module will provide detailed clinical information and management tools for this client's care journey.`"
              icon="🛠️"
            >
              <template #action>
                <button @click="activeTab = 'Overview'" class="text-action-link font-medium hover:underline">
                  Return to Overview
                </button>
              </template>
            </EmptyState>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { mockClient } from '../mocks/clientWorkspaceData.js';
import { getClient, getTimelineEvents } from '../lib/clients.js';
import ClientWorkspaceHeader from '../components/workspace/ClientWorkspaceHeader.vue';
import ClientWorkspaceTabs from '../components/workspace/ClientWorkspaceTabs.vue';
import ClinicalAttentionPanel from '../components/workspace/ClinicalAttentionPanel.vue';
import StatusBadge from '../components/workspace/StatusBadge.vue';
import TimelineItem from '../components/workspace/TimelineItem.vue';
import EmptyState from '../components/workspace/EmptyState.vue';
import ClientDetails from './ClientDetails.vue';

const route = useRoute();
const client = ref(null);
const loading = ref(true);
const error = ref('');

const tabs = [
  'Overview',
  'Sessions',
  'Details',
  'Care',
  'Measures',
  'Resources',
  'Documents',
  'Timeline'
];

const activeTab = ref('Overview');
const timelineEvents = ref([]);
const timelineLoading = ref(false);

async function loadClient() {
  loading.value = true;
  error.value = '';
  try {
    const clientId = route.params.clientId;
    client.value = await getClient({ clientId });
    loadTimeline();
  } catch (e) {
    console.error('Failed to load client:', e);
    error.value = 'The client workspace could not be loaded.';
  } finally {
    loading.value = false;
  }
}

async function loadTimeline() {
  const clientId = route.params.clientId;
  if (!clientId) return;
  timelineLoading.value = true;
  try {
    timelineEvents.value = await getTimelineEvents({ clientId });
  } catch (e) {
    console.error('Failed to load timeline:', e);
  } finally {
    timelineLoading.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(loadClient);
</script>
