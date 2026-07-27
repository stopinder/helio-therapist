<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <!-- Header -->
    <ClientWorkspaceHeader :client="mockClient" />

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
          <ClinicalAttentionPanel :client="mockClient" />

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
            <!-- Left Column -->
            <div class="lg:col-span-2 space-y-stack-lg">
              <!-- Recent Sessions -->
              <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
                <h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Recent Sessions</h3>
                <div class="space-y-stack-md pb-stack-md">
                  <div v-for="session in mockClient.recent_sessions" :key="session.id" class="flex flex-col p-inline-md border border-border rounded-control bg-surface-subtle">
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
                  <div v-for="goal in mockClient.goals" :key="goal.id" class="flex items-center gap-inline-md p-inline-md border border-border rounded-control">
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
                    <div v-for="doc in mockClient.recent_documents" :key="doc.id" 
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
                    <div v-for="task in mockClient.upcoming_tasks" :key="task.id" class="flex items-center justify-between p-inline-md border border-border rounded-control bg-surface">
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
                 <p class="text-body-sm text-ink-muted italic">Primary: {{ mockClient.primary_therapist }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Other Tabs Placeholders -->
        <div v-else>
          <div v-if="activeTab === 'Timeline'" class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg max-w-2xl mx-auto">
            <h3 class="text-h3 font-semibold text-ink mb-stack-lg pt-stack-md">Client Timeline</h3>
            <div class="space-y-0">
              <TimelineItem 
                v-for="(event, index) in mockClient.timeline_events" 
                :key="event.id"
                :type="event.type"
                :date="event.date"
                :description="event.description"
                :is-last="index === mockClient.timeline_events.length - 1"
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
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { mockClient } from '../mocks/clientWorkspaceData.js';
import ClientWorkspaceHeader from '../components/workspace/ClientWorkspaceHeader.vue';
import ClientWorkspaceTabs from '../components/workspace/ClientWorkspaceTabs.vue';
import ClinicalAttentionPanel from '../components/workspace/ClinicalAttentionPanel.vue';
import StatusBadge from '../components/workspace/StatusBadge.vue';
import TimelineItem from '../components/workspace/TimelineItem.vue';
import EmptyState from '../components/workspace/EmptyState.vue';

const route = useRoute();
const clientId = route.params.clientId;

const tabs = [
  'Overview',
  'Sessions',
  'Care',
  'Measures',
  'Resources',
  'Documents',
  'Timeline'
];

const activeTab = ref('Overview');
</script>
