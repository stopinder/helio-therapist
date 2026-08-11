<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div v-if="loading" class="flex-1 flex items-center justify-center"><div class="text-ink-muted flex flex-col items-center gap-2"><span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span><p>Loading client workspace…</p></div></div>
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-inline-lg"><div class="max-w-md w-full bg-surface p-inline-lg py-stack-lg rounded-card shadow-sm border border-state-danger/20 text-center"><h2 class="text-h2 font-semibold text-state-danger mb-2">Workspace Error</h2><p class="text-ink-secondary mb-6">{{ error }}</p><button @click="loadClient" class="px-inline-md py-stack-sm bg-state-selected text-white rounded-control">Try Again</button></div></div>
    <template v-else-if="client">
      <ClientWorkspaceHeader :client="client" @create-document="newDocument" @client-updated="client = $event" />
      <ClientWorkspaceTabs :tabs="tabs" v-model:activeTab="activeTab" />
      <div class="flex-1 overflow-auto p-inline-lg py-stack-lg"><div class="max-w-6xl mx-auto space-y-stack-lg">
        <div v-if="client.archived" class="rounded-panel border border-border bg-surface-elevated px-inline-lg py-stack-md text-body-sm text-ink-secondary"><strong class="text-ink">Archived client.</strong> Historical records remain available. Restore the client before starting a new session or joining a meeting.</div>
        <div v-if="activeTab === 'Overview'" class="space-y-stack-lg">
          <ClinicalAttentionPanel :client="client" />
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg"><div class="lg:col-span-2 space-y-stack-lg">
            <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg"><h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Recent Sessions</h3><div class="space-y-stack-md pb-stack-md"><div v-for="session in client.recent_sessions || mockClient.recent_sessions" :key="session.id" class="flex flex-col p-inline-md border border-border rounded-control bg-surface-subtle"><div class="flex justify-between items-center"><span class="font-medium text-ink">{{ session.type }}</span><span class="text-caption text-ink-muted">{{ session.date }}</span></div><p class="text-body-sm text-ink-secondary mt-1">{{ session.note }}</p></div></div></section>
            <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg"><h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Current Goals</h3><div class="space-y-stack-sm pb-stack-md"><div v-for="goal in client.goals || mockClient.goals" :key="goal.id" class="flex items-center gap-inline-md p-inline-md border border-border rounded-control"><span class="text-xl">{{ goal.status === 'Completed' ? '✅' : '🎯' }}</span><div class="flex-1"><p class="text-body-sm text-ink" :class="{ 'line-through text-ink-muted': goal.status === 'Completed' }">{{ goal.text }}</p><StatusBadge :status="goal.status === 'Completed' ? 'success' : 'pending'" :label="goal.status" /></div></div></div></section>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-stack-lg"><section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg"><h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Recent Documents</h3><div class="space-y-stack-sm pb-stack-md"><button v-for="doc in documents.slice(0, 4)" :key="doc.id" type="button" @click="openDocument(doc)" class="w-full text-left flex items-center justify-between p-inline-md border border-border rounded-control bg-surface hover:border-action-link"><div class="flex flex-col min-w-0 flex-1"><div class="flex items-center gap-inline-sm flex-wrap"><span class="text-body-sm text-ink truncate font-medium">{{ doc.title }}</span><StatusBadge :status="doc.status" /></div><span class="text-caption text-ink-muted mt-0.5">{{ formatDate(doc.updatedAt) }}</span></div><span class="text-ink-subtle ml-2">→</span></button><p v-if="!documents.length && !documentsLoading" class="text-body-sm text-ink-muted">No client documents yet.</p></div></section><section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg"><h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Upcoming Tasks</h3><div class="space-y-stack-sm pb-stack-md"><div v-for="task in client.upcoming_tasks || mockClient.upcoming_tasks" :key="task.id" class="flex items-center justify-between p-inline-md border border-border rounded-control bg-surface"><span class="text-body-sm text-ink truncate">{{ task.text }}</span><span class="text-caption text-state-warning">Due {{ task.due }}</span></div></div></section></div>
          </div><div class="space-y-stack-lg"><div class="p-inline-md bg-state-warning-surface border border-state-warning/20 rounded-panel"><p class="text-caption text-state-warning font-medium uppercase tracking-wider mb-1">Notice</p><p class="text-body-sm text-ink-secondary">This workspace still contains some <strong>mock data</strong> outside the document workflow.</p></div><div class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg"><h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Care Team</h3><p class="text-body-sm text-ink-muted italic">Primary: {{ client.primary_therapist || mockClient.primary_therapist }}</p></div></div></div>
        </div>
        <div v-else-if="activeTab === 'Details'"><ClientDetails :client="client" @updated="client = $event" /></div>
        <ClientTranscriptsPanel v-else-if="activeTab === 'Transcripts'" :client-id="String(route.params.clientId)" />
        <ClientDocumentsPanel v-else-if="activeTab === 'Documents'" :documents="documents" :loading="documentsLoading" :error="documentsError" @create="newDocument" @edit="editDocument" @download="downloadDocument" />
        <div v-else><div v-if="activeTab === 'Timeline'" class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg max-w-2xl mx-auto"><h3 class="text-h3 font-semibold text-ink mb-stack-lg pt-stack-md">Client Timeline</h3><div v-if="timelineLoading" class="py-stack-xl text-center"><p class="text-body-sm text-ink-subtle">Loading clinical narrative...</p></div><div v-else-if="timelineEvents.length === 0" class="py-stack-xl text-center"><p class="text-body-sm text-ink-subtle">No clinical events recorded for this client.</p></div><div v-else class="space-y-0"><TimelineItem v-for="(event, index) in timelineEvents" :key="event.id" :event-type="event.event_type" :date="formatDate(event.occurred_at)" :description="event.summary" :subject-type="event.subject_type" :subject-id="event.subject_id" :session-id="event.session_id" :is-last="index === timelineEvents.length - 1" /></div></div><EmptyState v-else :title="activeTab" :description="`The ${activeTab} module will provide detailed clinical information and management tools for this client's care journey.`" icon="🛠️"><template #action><button @click="activeTab = 'Overview'" class="text-action-link font-medium hover:underline">Return to Overview</button></template></EmptyState></div>
      </div></div>
      <ClientDocumentComposer v-if="documentComposerOpen" :client="client" :document="editingDocument" @close="closeDocumentComposer" @saved="documentSaved" @show-documents="showDocuments" />
    </template>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { mockClient } from '../mocks/clientWorkspaceData.js';
import { getClient, getTimelineEvents } from '../lib/clients.js';
import { downloadClientDocument, listClientDocuments } from '../lib/clientDocuments.js';
import ClientWorkspaceHeader from '../components/workspace/ClientWorkspaceHeader.vue';
import ClientWorkspaceTabs from '../components/workspace/ClientWorkspaceTabs.vue';
import ClinicalAttentionPanel from '../components/workspace/ClinicalAttentionPanel.vue';
import ClientDocumentsPanel from '../components/workspace/ClientDocumentsPanel.vue';
import ClientTranscriptsPanel from '../components/workspace/ClientTranscriptsPanel.vue';
import ClientDocumentComposer from '../components/workspace/ClientDocumentComposer.vue';
import StatusBadge from '../components/workspace/StatusBadge.vue';
import TimelineItem from '../components/workspace/TimelineItem.vue';
import EmptyState from '../components/workspace/EmptyState.vue';
import ClientDetails from './ClientDetails.vue';
const route = useRoute(); const client = ref(null); const loading = ref(true); const error = ref('');
const tabs = ['Overview','Sessions','Transcripts','Details','Care','Measures','Resources','Documents','Timeline']; const activeTab = ref('Overview'); const timelineEvents = ref([]); const timelineLoading = ref(false);
const documents = ref([]); const documentsLoading = ref(false); const documentsError = ref(''); const documentComposerOpen = ref(false); const editingDocument = ref(null);
async function loadClient() { loading.value = true; error.value = ''; try { client.value = await getClient({ clientId: route.params.clientId }); await Promise.all([loadTimeline(), refreshDocuments()]); } catch (e) { console.error('Failed to load client:', e); error.value = 'The client workspace could not be loaded.'; } finally { loading.value = false; } }
async function loadTimeline() { const clientId = route.params.clientId; if (!clientId) return; timelineLoading.value = true; try { timelineEvents.value = await getTimelineEvents({ clientId }); } catch (e) { console.error('Failed to load timeline:', e); } finally { timelineLoading.value = false; } }
async function refreshDocuments() { if (!route.params.clientId) return; documentsLoading.value = true; documentsError.value = ''; try { documents.value = await listClientDocuments(route.params.clientId); } catch (e) { console.error('Failed to load client documents:', e); documentsError.value = 'Could not load client documents.'; } finally { documentsLoading.value = false; } }
function newDocument() { editingDocument.value = null; documentComposerOpen.value = true; }
function editDocument(document) { editingDocument.value = document; documentComposerOpen.value = true; }
function openDocument(document) { if (document.status === 'completed' && document.storagePath) downloadDocument(document); else editDocument(document); }
async function downloadDocument(document) { try { await downloadClientDocument(document); } catch (e) { console.error('Failed to download document:', e); documentsError.value = 'Could not download this document.'; } }
function closeDocumentComposer() { documentComposerOpen.value = false; editingDocument.value = null; }
async function documentSaved() { await refreshDocuments(); }
function showDocuments(){closeDocumentComposer();activeTab.value='Documents';}
function formatDate(dateString) { if (!dateString) return ''; return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
onMounted(loadClient);
</script>
