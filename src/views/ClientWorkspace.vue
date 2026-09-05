<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div v-if="loading" class="flex-1 flex items-center justify-center"><div class="text-ink-muted flex flex-col items-center gap-2"><span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span><p>Loading client workspace…</p></div></div>
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-inline-lg"><div class="max-w-md w-full bg-surface p-inline-lg py-stack-lg rounded-card shadow-sm border border-state-danger/20 text-center"><h2 class="text-h2 font-semibold text-state-danger mb-2">Workspace Error</h2><p class="text-ink-secondary mb-6">{{ error }}</p><button @click="loadClient" class="px-inline-md py-stack-sm bg-state-selected text-white rounded-control">Try Again</button></div></div>
    <template v-else-if="client">
      <ClientWorkspaceHeader :client="client" :next-appointment="nextAppointment" :therapist-label="therapistLabel" :active-session="activeSession" @create-document="newDocument" @client-updated="client = $event" />
      
      <div class="flex-1 overflow-auto p-inline-lg py-stack-lg">
        <div class="max-w-6xl mx-auto space-y-stack-xl">
          <div v-if="client.archived" class="rounded-panel border border-border bg-surface-elevated px-inline-lg py-stack-md text-body-sm text-ink-secondary">
            <strong class="text-ink">Archived client.</strong> Historical records remain available. Restore the client before opening Clinical Workspace, joining a meeting, or scheduling a new appointment.
          </div>

          <!-- Primary: Before next session -->
          <section aria-labelledby="before-next-heading" class="space-y-stack-lg">
            <h2 id="before-next-heading" class="text-h2 font-semibold text-ink">Before next session</h2>
            
            <ClinicalAttentionPanel :client="client" />

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
              <div class="lg:col-span-2 space-y-stack-lg">
                <CurrentCareFocus :key="careRefreshKey" :client-id="String(route.params.clientId)" :lens-id="selectedLensId" @open-care="scrollToSection('care')" />
                <ClientFollowUps :client-id="String(route.params.clientId)" />
              </div>
              
              <div class="space-y-stack-lg">
                <div class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
                  <h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Next Appointment</h3>
                  <p v-if="appointmentsLoading" class="text-body-sm text-ink-muted pb-stack-md">Loading appointment…</p>
                  <div v-else-if="nextAppointment" class="pb-stack-md">
                    <p class="text-body-sm font-medium text-ink">{{ formatDate(nextAppointment.starts_at) }}</p>
                    <p class="text-caption text-ink-muted mt-1">{{ nextAppointment.status === 'rescheduled' ? 'Rescheduled' : 'Scheduled' }}</p>
                  </div>
                  <p v-else class="text-body-sm text-ink-muted pb-stack-md">No upcoming appointment is recorded.</p>
                </div>
                
                <div class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
                  <h3 class="text-h3 font-semibold text-ink mb-stack-md pt-stack-md">Care Team</h3>
                  <p class="text-body-sm text-ink-muted pb-stack-md">Primary therapist: {{ therapistLabel }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Recent sessions -->
          <section aria-labelledby="recent-sessions-heading" class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
            <header class="flex items-center justify-between mb-stack-md pt-stack-md">
              <h2 id="recent-sessions-heading" class="text-h2 font-semibold text-ink">Recent sessions</h2>
            </header>
            
            <div class="space-y-stack-md pb-stack-md">
              <p v-if="sessionsLoading" class="text-body-sm text-ink-muted">Loading sessions…</p>
              <template v-else-if="recentSessions.length">
                <div v-for="session in recentSessions" :key="session.id" class="flex flex-col md:flex-row md:items-center justify-between p-inline-md border border-border rounded-control bg-surface-subtle gap-inline-md">
                  <div class="min-w-0">
                    <div class="flex items-center gap-inline-sm flex-wrap">
                      <span class="font-medium text-ink">{{ formatSessionDate(session.startedAt) }}</span>
                      <span v-if="session.status === 'in_progress'" class="text-caption font-medium text-action-link">Open</span>
                    </div>
                    <p class="text-body-sm text-ink-secondary mt-1">{{ humanReadableState(session) }}</p>
                  </div>
                  <div class="flex items-center gap-inline-sm shrink-0">
                    <span class="text-caption text-ink-muted tabular-nums mr-inline-sm">{{ formatSessionTime(session.startedAt) }}</span>
                    <button type="button" class="px-inline-md py-stack-xs border border-border bg-surface text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle" @click="openSessionWorkspace(session)">
                      {{ session.status === 'in_progress' ? 'Open summary' : 'Open summary' }}
                    </button>
                    <button v-if="session.hasTranscript" type="button" class="px-inline-md py-stack-xs text-body-sm font-medium text-ink-secondary hover:text-ink" @click="viewTranscript(session)">
                      Transcript
                    </button>
                  </div>
                </div>
              </template>
              <p v-else class="text-body-sm text-ink-muted">No sessions recorded for this client yet.</p>
            </div>
          </section>

          <!-- Quiet secondary: Supporting material -->
          <section aria-labelledby="supporting-material-heading" class="pt-stack-xl border-t border-border-muted">
            <h2 id="supporting-material-heading" class="text-caption uppercase tracking-wider text-ink-muted mb-stack-lg">Supporting material</h2>
            
            <div class="space-y-stack-xl">
              <div id="section-care">
                <ClientCarePanel :client-id="String(route.params.clientId)" @changed="careRefreshKey++" />
              </div>
              
              <div id="section-timeline" class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg max-w-2xl mx-auto">
                <h3 class="text-h3 font-semibold text-ink mb-stack-lg pt-stack-md">Timeline</h3>
                <div v-if="timelineLoading" class="py-stack-xl text-center">
                  <p class="text-body-sm text-ink-subtle">Loading clinical narrative...</p>
                </div>
                <div v-else-if="timelineEvents.length === 0" class="py-stack-xl text-center">
                  <p class="text-body-sm text-ink-subtle">No clinical events recorded for this client.</p>
                </div>
                <div v-else class="space-y-0">
                  <TimelineItem v-for="(event, index) in timelineEvents" :key="event.id" :event-type="event.event_type" :date="formatDate(event.occurred_at)" :description="event.summary" :subject-type="event.subject_type" :subject-id="event.subject_id" :session-id="event.session_id" :is-last="index === timelineEvents.length - 1" />
                </div>
              </div>

              <ClientDocumentsPanel :documents="documents" :loading="documentsLoading" :error="documentsError" :archived="client.archived" @create="newDocument" @edit="editDocument" @download="downloadDocument" />
              
              <ClientTranscriptsPanel :client-id="String(route.params.clientId)" />

              <ClientMeasuresPanel :client="client" />
              
              <ClientResourcesPanel :client="client" />

              <section id="section-details" class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
                <h3 class="text-h3 font-semibold text-ink mb-stack-lg pt-stack-md">Client Details</h3>
                <ClientDetails :client="client" @updated="client = $event" />
              </section>
            </div>
          </section>
        </div>
      </div>
      
      <ClientDocumentComposer v-if="documentComposerOpen" :client="client" :document="editingDocument" :initial-document-type="newDocumentType" @close="closeDocumentComposer" @saved="documentSaved" @show-documents="showDocuments" />
    </template>
  </div>
</template>
<script setup>
import { computed, ref, onMounted } from 'vue'; import { useRoute, useRouter } from 'vue-router'; import { getClient, getCurrentTherapistLabel, getTimelineEvents } from '../lib/clients.js'; import { listSessions } from '../lib/sessions.js'; import { listClientAppointments, nextClientAppointment } from '../lib/appointments.js'; import { downloadClientDocument, listClientDocuments } from '../lib/clientDocuments.js'; import { DEFAULT_LENS_ID } from '../lib/clinicalLenses.js'; import ClientWorkspaceHeader from '../components/workspace/ClientWorkspaceHeader.vue'; import ClinicalAttentionPanel from '../components/workspace/ClinicalAttentionPanel.vue'; import ClientDocumentsPanel from '../components/workspace/ClientDocumentsPanel.vue'; import ClientTranscriptsPanel from '../components/workspace/ClientTranscriptsPanel.vue'; import ClientDocumentComposer from '../components/workspace/ClientDocumentComposer.vue'; import ClientCarePanel from '../components/workspace/ClientCarePanel.vue'; import ClientMeasuresPanel from '../components/workspace/ClientMeasuresPanel.vue'; import ClientResourcesPanel from '../components/workspace/ClientResourcesPanel.vue'; import CurrentCareFocus from '../components/workspace/CurrentCareFocus.vue'; import ClientFollowUps from '../components/workspace/ClientFollowUps.vue'; import StatusBadge from '../components/workspace/StatusBadge.vue'; import TimelineItem from '../components/workspace/TimelineItem.vue'; import EmptyState from '../components/workspace/EmptyState.vue'; import ClientDetails from './ClientDetails.vue';
const route=useRoute(),router=useRouter();const client=ref(null),loading=ref(true),error=ref('');const timelineEvents=ref([]),timelineLoading=ref(false);const documents=ref([]),documentsLoading=ref(false),documentsError=ref(''),documentComposerOpen=ref(false),editingDocument=ref(null),newDocumentType=ref('other');const sessions=ref([]),sessionsLoading=ref(false),appointments=ref([]),appointmentsLoading=ref(false),therapistLabel=ref('Current therapist');const careRefreshKey=ref(0),selectedLensId=ref(DEFAULT_LENS_ID);const recentSessions=computed(()=>sessions.value.slice(0,4)),nextAppointment=computed(()=>nextClientAppointment(appointments.value)),activeSession=computed(()=>sessions.value.find(s=>s.status==='in_progress')||null),completedSessions=computed(()=>sessions.value.filter(s=>s.status==='completed'));
async function loadClient(){loading.value=true;error.value='';try{client.value=await getClient({clientId:route.params.clientId});const results=await Promise.allSettled([loadTimeline(),refreshDocuments(),loadSessions(),loadAppointments(),loadTherapist()]);for(const result of results)if(result.status==='rejected')console.error('Client workspace context failed to load:',{code:result.reason?.code||'CONTEXT_LOAD_FAILED'})}catch(e){error.value='The client workspace could not be loaded.'}finally{loading.value=false}}async function loadTimeline(){if(!route.params.clientId)return;timelineLoading.value=true;try{timelineEvents.value=await getTimelineEvents({clientId:route.params.clientId})}finally{timelineLoading.value=false}}async function refreshDocuments(){if(!route.params.clientId)return;documentsLoading.value=true;documentsError.value='';try{documents.value=await listClientDocuments(route.params.clientId)}catch(e){documentsError.value='Could not load client documents.';throw e}finally{documentsLoading.value=false}}async function loadSessions(){sessionsLoading.value=true;try{sessions.value=await listSessions({clientId:route.params.clientId})}finally{sessionsLoading.value=false}}async function loadAppointments(){appointmentsLoading.value=true;try{appointments.value=await listClientAppointments({clientId:route.params.clientId})}finally{appointmentsLoading.value=false}}async function loadTherapist(){therapistLabel.value=await getCurrentTherapistLabel()}function openSessionWorkspace(session){if(!session?.id||!client.value?.id)return;router.push({name:'SessionWorkspace',params:{clientId:client.value.id,sessionId:session.id}})}
function viewTranscript(session) {
  if (!session?.id || !client.value?.id) return;
  router.push({ name: 'SessionWorkspace', params: { clientId: client.value.id, sessionId: session.id }, query: { view: 'transcript' } });
}
function humanReadableState(session) {
  if (session.status === 'in_progress') return 'Clinical workspace is open.';
  if (session.workflowStatus === 'needs_review' || session.workflowStatus === 'drafts_awaiting_review') return 'Review is waiting.';
  return session.completedAt ? 'Completed.' : 'Recorded.';
}
function scrollToSection(id) {
  const el = document.getElementById(`section-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}
function newDocument(documentType='other'){if(client.value?.archived)return;editingDocument.value=null;newDocumentType.value=documentType||'other';documentComposerOpen.value=true}function editDocument(document){if(client.value?.archived)return;editingDocument.value=document;newDocumentType.value=document.documentType||'other';documentComposerOpen.value=true}function openDocument(document){if(document.status==='completed'&&document.storagePath)downloadDocument(document);else editDocument(document)}async function downloadDocument(document){try{await downloadClientDocument(document)}catch(e){documentsError.value='Could not download this document.'}}function closeDocumentComposer(){documentComposerOpen.value=false;editingDocument.value=null;newDocumentType.value='other'}async function documentSaved(){await refreshDocuments()}function showDocuments(){closeDocumentComposer();scrollToSection('supporting-material')}function formatDate(dateString){if(!dateString)return'';return new Date(dateString).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}function formatSessionDate(dateString){if(!dateString)return'';return new Date(dateString).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}function formatSessionTime(dateString){if(!dateString)return'';return new Date(dateString).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}onMounted(loadClient);
</script>
