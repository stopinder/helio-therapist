<template>
  <div class="flex h-full flex-col bg-surface-canvas">
    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <div class="flex flex-col items-center gap-2 text-ink-muted">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-state-selected border-t-transparent"></span>
        <p>Loading client workspace…</p>
      </div>
    </div>

    <div v-else-if="error" class="flex flex-1 items-center justify-center p-inline-lg">
      <div class="w-full max-w-md rounded-card border border-state-danger/20 bg-surface p-inline-lg py-stack-lg text-center shadow-sm">
        <h2 class="mb-2 text-h2 font-semibold text-state-danger">Workspace Error</h2>
        <p class="mb-6 text-ink-secondary">{{ error }}</p>
        <button class="rounded-control bg-accent px-inline-md py-stack-sm text-white" @click="loadClient">Try Again</button>
      </div>
    </div>

    <template v-else-if="client">
      <ClientWorkspaceHeader
        :client="client"
        :next-appointment="nextAppointment"
        :therapist-label="therapistLabel"
        :active-session="activeSession"
        :unresolved-session="unresolvedSession"
        @create-document="newDocument"
        @client-updated="client = $event"
      />

      <div class="flex-1 overflow-auto p-inline-lg py-stack-lg">
        <div class="mx-auto max-w-6xl space-y-stack-xl">
          <div v-if="client.archived" class="rounded-panel border border-border bg-surface-elevated px-inline-lg py-stack-md text-body-sm text-ink-secondary">
            <strong class="text-ink">Archived client.</strong> Historical records remain available. Restore the client before opening Clinical Workspace, joining a meeting, or scheduling a new appointment.
          </div>

          <section v-if="isSampleClient" class="rounded-panel border border-action-link/20 bg-state-selected px-inline-lg py-stack-lg" data-testid="sample-client-guide">
            <div class="flex flex-col gap-stack-md lg:flex-row lg:items-start lg:justify-between">
              <div class="max-w-3xl">
                <p class="type-overline text-action-link">Worked sample · fictional data</p>
                <h2 class="mt-1 text-h2 font-semibold text-ink">{{ sampleGuide.title }}</h2>
                <p class="mt-2 text-body-sm text-ink-secondary">{{ sampleGuide.description }}</p>
                <p v-if="sampleSummaryExcerpt" class="mt-stack-md text-body-sm leading-relaxed text-ink-secondary">
                  <strong class="text-ink">Current summary:</strong> {{ sampleSummaryExcerpt }}
                </p>
              </div>
              <span class="shrink-0 rounded-pill border border-action-link/20 bg-surface px-inline-sm py-stack-xs text-caption font-semibold text-action-link">SAMPLE</span>
            </div>
            <div class="mt-stack-lg grid grid-cols-2 gap-inline-sm sm:grid-cols-4">
              <button type="button" class="button-secondary justify-center" @click="openWorkspaceSection('therapy')">Therapy Focus</button>
              <button type="button" class="button-secondary justify-center" :disabled="!recentSessions.length" @click="openSessionWorkspace(recentSessions[0])">Session Capture</button>
              <button type="button" class="button-secondary justify-center" @click="openSampleTranscript">Transcript</button>
              <button type="button" class="button-secondary justify-center" @click="openSampleSummary">Summary</button>
            </div>
          </section>

          <section id="section-now" aria-labelledby="now-heading" class="space-y-stack-lg">
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p class="type-overline text-action-link">Client workspace</p>
                <h2 id="now-heading" class="mt-1 text-h1 font-semibold text-ink">Now</h2>
                <p class="mt-1 text-body-sm text-ink-muted">What is most useful to hold in mind before the next session.</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" class="button-secondary" :disabled="!recentSessions.length" @click="askHeliosAboutClient">Ask Helios about this client</button>
                <HelpLink topic="client-workspace" label="How the Client Workspace works" />
              </div>
            </div>

            <CurrentCareFocus
              :key="careRefreshKey"
              :client="client"
              :refresh-key="careRefreshKey"
              :lens-id="selectedLensId"
              @open-focus="openWorkspaceSection('therapy')"
              @client-updated="client = $event"
              @changed="careRefreshKey++"
            />

            <div class="grid grid-cols-1 gap-stack-lg lg:grid-cols-2">
              <section class="rounded-panel border border-border-muted bg-surface-elevated px-inline-lg py-stack-lg" aria-labelledby="latest-work-heading">
                <div class="flex items-start justify-between gap-inline-md">
                  <div>
                    <h3 id="latest-work-heading" class="text-h3 font-semibold text-ink">Latest work</h3>
                    <p class="mt-1 text-caption text-ink-muted">The most recent clinical activity, not the full history.</p>
                  </div>
                  <button v-if="sessions.length" type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="openWorkspaceSection('history')">View history</button>
                </div>

                <p v-if="sessionsLoading" class="mt-stack-md text-body-sm text-ink-muted">Loading sessions…</p>
                <div v-else-if="latestSessions.length" class="mt-stack-md divide-y divide-border-muted border-y border-border-muted">
                  <article v-for="session in latestSessions" :key="session.id" class="flex flex-col justify-between gap-inline-md py-stack-sm sm:flex-row sm:items-center">
                    <div class="min-w-0">
                      <p class="text-body-sm font-semibold text-ink">{{ formatSessionDate(session.startedAt) }} · {{ formatSessionTime(session.startedAt) }}</p>
                      <p class="mt-1 text-caption text-ink-muted">{{ humanReadableState(session) }}</p>
                    </div>
                    <div class="flex shrink-0 items-center gap-inline-sm">
                      <button type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="openSessionWorkspace(session)">Open session</button>
                      <button v-if="session.hasTranscript" type="button" class="text-body-sm text-ink-secondary hover:text-ink" @click="viewTranscript(session)">Transcript</button>
                    </div>
                  </article>
                </div>
                <p v-else class="mt-stack-md text-body-sm text-ink-muted">No sessions recorded yet.</p>
              </section>

              <ClientFollowUps :client-id="String(route.params.clientId)" />
            </div>
          </section>

          <section id="section-therapy" class="border-t border-border-muted pt-stack-lg">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-inline-md rounded-panel border border-border-muted bg-surface-elevated px-inline-lg py-stack-md text-left hover:bg-surface-subtle"
              :aria-expanded="therapyOpen"
              @click="therapyOpen=!therapyOpen"
            >
              <div>
                <p class="type-overline text-ink-muted">Therapy</p>
                <h2 class="mt-1 text-h2 font-semibold text-ink">Full Therapy Focus</h2>
                <p class="mt-1 text-body-sm text-ink-muted">Aims, shared understanding, what you are trying, change noticed, learning and Helios review.</p>
              </div>
              <span class="shrink-0 text-body-sm font-semibold text-action-link">{{ therapyOpen ? 'Hide' : 'Open' }}</span>
            </button>
            <div v-if="therapyOpen" class="mt-stack-lg">
              <ClientCarePanel :client-id="String(route.params.clientId)" @changed="careRefreshKey++" />
            </div>
          </section>

          <section id="section-history" class="border-t border-border-muted pt-stack-lg">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-inline-md rounded-panel border border-border-muted bg-surface-elevated px-inline-lg py-stack-md text-left hover:bg-surface-subtle"
              :aria-expanded="historyOpen"
              @click="historyOpen=!historyOpen"
            >
              <div>
                <p class="type-overline text-ink-muted">History</p>
                <h2 class="mt-1 text-h2 font-semibold text-ink">Sessions & chronology</h2>
                <p class="mt-1 text-body-sm text-ink-muted">{{ sessions.length ? `${sessions.length} recorded session${sessions.length===1?'':'s'}` : 'No recorded sessions yet' }} · transcript sources and meaningful clinical events live here.</p>
              </div>
              <span class="shrink-0 text-body-sm font-semibold text-action-link">{{ historyOpen ? 'Hide' : 'Open' }}</span>
            </button>

            <div v-if="historyOpen" class="mt-stack-lg space-y-stack-lg">
              <section class="rounded-panel border border-border-muted bg-surface-elevated px-inline-lg py-stack-lg" aria-labelledby="session-history-heading">
                <div class="flex items-start justify-between gap-inline-md">
                  <div>
                    <h3 id="session-history-heading" class="text-h3 font-semibold text-ink">Sessions</h3>
                    <p class="mt-1 text-caption text-ink-muted">Open the encounter itself for summary, transcript and clinical workspace.</p>
                  </div>
                </div>

                <p v-if="sessionsLoading" class="mt-stack-md text-body-sm text-ink-muted">Loading sessions…</p>
                <div v-else-if="sessions.length" class="mt-stack-md divide-y divide-border-muted border-y border-border-muted">
                  <article v-for="session in sessions" :key="session.id" class="flex flex-col justify-between gap-inline-md py-stack-sm md:flex-row md:items-center">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-inline-sm">
                        <span class="font-medium text-ink">{{ formatSessionDate(session.startedAt) }}</span>
                        <span class="text-caption text-ink-muted">{{ formatSessionTime(session.startedAt) }}</span>
                        <span v-if="session.status === 'in_progress'" class="text-caption font-medium text-action-link">Open</span>
                      </div>
                      <p class="mt-1 text-body-sm text-ink-secondary">{{ humanReadableState(session) }}</p>
                    </div>
                    <div class="flex shrink-0 items-center gap-inline-sm">
                      <button type="button" class="button-secondary !min-h-0 py-1.5" @click="openSessionWorkspace(session)">Open session</button>
                      <button v-if="session.hasTranscript" type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="viewTranscript(session)">Transcript</button>
                    </div>
                  </article>
                </div>
                <p v-else class="mt-stack-md text-body-sm text-ink-muted">No sessions recorded for this client yet.</p>
              </section>

              <section class="rounded-panel border border-border-muted bg-surface-elevated">
                <button type="button" class="flex w-full items-center justify-between gap-inline-md px-inline-lg py-stack-md text-left" :aria-expanded="transcriptsOpen" @click="transcriptsOpen=!transcriptsOpen">
                  <div>
                    <h3 class="text-h3 font-semibold text-ink">Transcript sources</h3>
                    <p class="mt-1 text-caption text-ink-muted">View original transcript text or correct its session link when needed.</p>
                  </div>
                  <span class="text-body-sm font-semibold text-action-link">{{ transcriptsOpen ? 'Hide' : 'Open' }}</span>
                </button>
                <div v-if="transcriptsOpen" class="border-t border-border-muted py-stack-md">
                  <ClientTranscriptsPanel :client-id="String(route.params.clientId)" />
                </div>
              </section>

              <section v-if="meaningfulTimelineEvents.length" id="section-timeline" class="rounded-panel border border-border-muted bg-surface-elevated px-inline-lg py-stack-lg">
                <h3 class="text-h3 font-semibold text-ink">Meaningful timeline</h3>
                <p class="mt-1 text-caption text-ink-muted">Milestones and changes that add something beyond the session list.</p>
                <div class="mt-stack-md space-y-0">
                  <TimelineItem
                    v-for="(event, index) in meaningfulTimelineEvents"
                    :key="event.id"
                    :event-type="event.event_type"
                    :date="formatDate(event.occurred_at)"
                    :description="event.summary"
                    :subject-type="event.subject_type"
                    :subject-id="event.subject_id"
                    :session-id="event.session_id"
                    :is-last="index === meaningfulTimelineEvents.length - 1"
                  />
                </div>
              </section>
            </div>
          </section>

          <section id="section-record" class="border-t border-border-muted pt-stack-lg">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-inline-md rounded-panel border border-border-muted bg-surface-elevated px-inline-lg py-stack-md text-left hover:bg-surface-subtle"
              :aria-expanded="recordOpen"
              @click="recordOpen=!recordOpen"
            >
              <div>
                <p class="type-overline text-ink-muted">Record & administration</p>
                <h2 class="mt-1 text-h2 font-semibold text-ink">Documents, measures, resources & details</h2>
                <p class="mt-1 text-body-sm text-ink-muted">{{ documents.length ? `${documents.length} document${documents.length===1?'':'s'}` : 'No documents yet' }} · administrative material stays available without occupying the clinical reading path.</p>
              </div>
              <span class="shrink-0 text-body-sm font-semibold text-action-link">{{ recordOpen ? 'Hide' : 'Open' }}</span>
            </button>

            <div v-if="recordOpen" class="mt-stack-lg space-y-stack-lg">
              <div id="section-documents">
                <ClientDocumentsPanel
                  :documents="documents"
                  :loading="documentsLoading"
                  :error="documentsError"
                  :archived="client.archived"
                  :focus-document-id="focusDocumentId"
                  @create="newDocument"
                  @edit="editDocument"
                  @download="downloadDocument"
                />
              </div>

              <section class="rounded-panel border border-border-muted bg-surface-elevated">
                <button type="button" class="flex w-full items-center justify-between px-inline-lg py-stack-md text-left" :aria-expanded="measuresOpen" @click="measuresOpen=!measuresOpen">
                  <div>
                    <h3 class="text-h3 font-semibold text-ink">Measures</h3>
                    <p class="mt-1 text-caption text-ink-muted">Outcome measures and scores, when you need them.</p>
                  </div>
                  <span class="text-body-sm font-semibold text-action-link">{{ measuresOpen ? 'Hide' : 'Open' }}</span>
                </button>
                <div v-if="measuresOpen" class="border-t border-border-muted px-inline-lg py-stack-lg"><ClientMeasuresPanel :client="client" /></div>
              </section>

              <section class="rounded-panel border border-border-muted bg-surface-elevated">
                <button type="button" class="flex w-full items-center justify-between px-inline-lg py-stack-md text-left" :aria-expanded="resourcesOpen" @click="resourcesOpen=!resourcesOpen">
                  <div>
                    <h3 class="text-h3 font-semibold text-ink">Resources</h3>
                    <p class="mt-1 text-caption text-ink-muted">Materials and activities sent to this client.</p>
                  </div>
                  <span class="text-body-sm font-semibold text-action-link">{{ resourcesOpen ? 'Hide' : 'Open' }}</span>
                </button>
                <div v-if="resourcesOpen" class="border-t border-border-muted px-inline-lg py-stack-lg"><ClientResourcesPanel :client="client" /></div>
              </section>

              <section id="section-details" class="rounded-panel border border-border-muted bg-surface-elevated">
                <button type="button" class="flex w-full items-center justify-between px-inline-lg py-stack-md text-left" :aria-expanded="detailsOpen" @click="detailsOpen=!detailsOpen">
                  <div>
                    <h3 class="text-h3 font-semibold text-ink">Client details</h3>
                    <p class="mt-1 text-caption text-ink-muted">Contact, emergency and administrative information.</p>
                  </div>
                  <span class="text-body-sm font-semibold text-action-link">{{ detailsOpen ? 'Hide' : 'Open' }}</span>
                </button>
                <div v-if="detailsOpen" class="border-t border-border-muted px-inline-lg py-stack-lg"><ClientDetails :client="client" @updated="client = $event" /></div>
              </section>
            </div>
          </section>
        </div>
      </div>

      <ClientDocumentComposer
        v-if="documentComposerOpen"
        :client="client"
        :client-email="client?.email || ''"
        :document="editingDocument"
        :initial-document-type="newDocumentType"
        @close="closeDocumentComposer"
        @saved="documentSaved"
        @show-documents="showDocuments"
      />
    </template>
  </div>
</template>

<script setup>
import HelpLink from '../components/help/HelpLink.vue'
import { computed, ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getClient, getCurrentTherapistLabel, getTimelineEvents } from '../lib/clients.js'
import { listSessions } from '../lib/sessions.js'
import { listClientAppointments, nextClientAppointment } from '../lib/appointments.js'
import { downloadClientDocument, listClientDocuments } from '../lib/clientDocuments.js'
import { DEFAULT_LENS_ID } from '../lib/clinicalLenses.js'
import ClientWorkspaceHeader from '../components/workspace/ClientWorkspaceHeader.vue'
import ClientDocumentsPanel from '../components/workspace/ClientDocumentsPanel.vue'
import ClientTranscriptsPanel from '../components/workspace/ClientTranscriptsPanel.vue'
import ClientDocumentComposer from '../components/workspace/ClientDocumentComposer.vue'
import ClientCarePanel from '../components/workspace/ClientCarePanel.vue'
import ClientMeasuresPanel from '../components/workspace/ClientMeasuresPanel.vue'
import ClientResourcesPanel from '../components/workspace/ClientResourcesPanel.vue'
import CurrentCareFocus from '../components/workspace/CurrentCareFocus.vue'
import ClientFollowUps from '../components/workspace/ClientFollowUps.vue'
import TimelineItem from '../components/workspace/TimelineItem.vue'
import ClientDetails from './ClientDetails.vue'
import { useAskHelios } from '../composables/useAskHelios.js'

const route=useRoute(),router=useRouter()
const { openClinicalContext } = useAskHelios()
const client=ref(null),loading=ref(true),error=ref('')
const timelineEvents=ref([]),timelineLoading=ref(false)
const documents=ref([]),documentsLoading=ref(false),documentsError=ref(''),documentComposerOpen=ref(false),editingDocument=ref(null),newDocumentType=ref('other')
const sessions=ref([]),sessionsLoading=ref(false),appointments=ref([]),appointmentsLoading=ref(false),therapistLabel=ref('Current therapist')
const careRefreshKey=ref(0),selectedLensId=ref(DEFAULT_LENS_ID)
const therapyOpen=ref(false),historyOpen=ref(false),recordOpen=ref(false),transcriptsOpen=ref(false),measuresOpen=ref(false),resourcesOpen=ref(false),detailsOpen=ref(false)

const recentSessions=computed(()=>sessions.value.slice(0,4))
const latestSessions=computed(()=>sessions.value.slice(0,2))
const meaningfulTimelineEvents=computed(()=>timelineEvents.value.filter(event=>{
  const summary=String(event?.summary||'').trim().toLowerCase()
  if(!summary)return false
  return !['session completed','session recorded','session created'].includes(summary)
}))
const isSampleClient=computed(()=>/^SAMPLE-\d{3}$/.test(String(client.value?.reference||'')))
const sampleSummaryDocument=computed(()=>documents.value.find(document=>document.documentType==='session_summary'||document.document_type==='session_summary')||null)
const sampleSummaryExcerpt=computed(()=>String(sampleSummaryDocument.value?.content?.body||'').trim().slice(0,420))
const sampleTranscriptSession=computed(()=>sessions.value.find(session=>session.hasTranscript)||null)
const sampleGuide=computed(()=>{
  const reference=String(client.value?.reference||'')
  if(reference==='SAMPLE-001')return{title:'Alex: follow the work across several sessions',description:'This example is designed to show longitudinal Clinical Intelligence: repeated patterns, change over time, transcript-backed Session Captures and a multi-session summary.'}
  if(reference==='SAMPLE-002')return{title:'Priya: see a concise adjustment and bereavement example',description:'This example shows how Therapy Focus and session material can stay tentative, supportive and grounded without turning a normal grief response into a diagnosis.'}
  if(reference==='SAMPLE-003')return{title:'Daniel: inspect one complete piece of clinical work',description:'Daniel is the end-to-end worked example: aims and objectives, an active Therapy Focus, a linked transcript, reviewed Session Capture and a therapist-facing summary.'}
  return{title:'Maya: see how completed work remains available',description:'This archived example shows how historical clinical material remains readable without presenting an active workload.'}
})
const nextAppointment=computed(()=>nextClientAppointment(appointments.value))
const activeSession=computed(()=>sessions.value.find(s=>s.status==='in_progress')||null)
const unresolvedSession=computed(()=>{
  const unresolvedStates=['awaiting_transcript','transcript_received','needs_review','review_choices_saved','drafts_awaiting_review']
  return sessions.value.find(s=>s.status==='source_ready'||(s.status==='completed'&&unresolvedStates.includes(s.workflowStatus)))||null
})
const focusDocumentId=computed(()=>typeof route.query.document==='string'?route.query.document:'')

async function loadClient(){
  loading.value=true
  error.value=''
  try{
    client.value=await getClient({clientId:route.params.clientId})
    const results=await Promise.allSettled([loadTimeline(),refreshDocuments(),loadSessions(),loadAppointments(),loadTherapist()])
    for(const result of results)if(result.status==='rejected')console.error('Client workspace context failed to load:',{code:result.reason?.code||'CONTEXT_LOAD_FAILED'})
    await openRequestedDocument()
  }catch{
    error.value='The client workspace could not be loaded.'
  }finally{
    loading.value=false
  }
}
async function loadTimeline(){if(!route.params.clientId)return;timelineLoading.value=true;try{timelineEvents.value=await getTimelineEvents({clientId:route.params.clientId})}finally{timelineLoading.value=false}}
async function refreshDocuments(){if(!route.params.clientId)return;documentsLoading.value=true;documentsError.value='';try{documents.value=await listClientDocuments(route.params.clientId)}catch(e){documentsError.value='Could not load client documents.';throw e}finally{documentsLoading.value=false}}
async function loadSessions(){sessionsLoading.value=true;try{sessions.value=await listSessions({clientId:route.params.clientId})}finally{sessionsLoading.value=false}}
async function loadAppointments(){appointmentsLoading.value=true;try{appointments.value=await listClientAppointments({clientId:route.params.clientId})}finally{appointmentsLoading.value=false}}
async function loadTherapist(){therapistLabel.value=await getCurrentTherapistLabel()}

function askHeliosAboutClient(){
  const anchor=recentSessions.value[0]
  if(!client.value?.id||!anchor?.id)return
  void openClinicalContext({
    clientId:String(client.value.id),
    clientName:client.value.display_name||client.value.name||'',
    anchorSessionId:String(anchor.id),
    window:'last_three',
    lens:client.value.preferred_summary_lens||'integrative',
    source:'client_workspace'
  })
}
function openSessionWorkspace(session){if(!session?.id||!client.value?.id)return;router.push({name:'SessionWorkspace',params:{clientId:client.value.id,sessionId:session.id}})}
function viewTranscript(session){if(!session?.id||!client.value?.id)return;router.push({name:'SessionWorkspace',params:{clientId:client.value.id,sessionId:session.id},query:{view:'transcript'}})}
function openSampleTranscript(){if(sampleTranscriptSession.value){viewTranscript(sampleTranscriptSession.value);return}openWorkspaceSection('history').then(()=>{transcriptsOpen.value=true})}
function openSampleSummary(){if(sampleSummaryDocument.value&&!client.value?.archived){editDocument(sampleSummaryDocument.value);return}openWorkspaceSection('record')}
function humanReadableState(session){if(session.status==='source_ready')return'Transcript ready for summary.';if(session.status==='in_progress')return'Clinical workspace is open.';if(session.workflowStatus==='needs_review'||session.workflowStatus==='drafts_awaiting_review')return'Review is waiting.';return session.completedAt?'Completed.':'Recorded.'}

async function openWorkspaceSection(section){
  if(section==='therapy')therapyOpen.value=true
  if(section==='history')historyOpen.value=true
  if(section==='record')recordOpen.value=true
  await nextTick()
  document.getElementById(`section-${section}`)?.scrollIntoView({behavior:'smooth',block:'start'})
}
async function scrollToRecordAnchor(id){
  recordOpen.value=true
  await nextTick()
  document.getElementById(`section-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'})
}
async function openRequestedDocument(){
  const documentId=focusDocumentId.value
  if(!documentId)return
  const requested=documents.value.find(document=>document.id===documentId)
  if(!requested)return
  if(client.value?.archived&&requested.status!=='completed'){await scrollToRecordAnchor('documents');return}
  editingDocument.value=requested
  newDocumentType.value=requested.documentType||'other'
  documentComposerOpen.value=true
}
function newDocument(documentType='other'){if(client.value?.archived)return;editingDocument.value=null;newDocumentType.value=documentType||'other';documentComposerOpen.value=true}
function editDocument(document){if(client.value?.archived)return;editingDocument.value=document;newDocumentType.value=document.documentType||'other';documentComposerOpen.value=true}
async function downloadDocument(document){try{await downloadClientDocument(document)}catch{documentsError.value='Could not download this document.'}}
function closeDocumentComposer(){documentComposerOpen.value=false;editingDocument.value=null;newDocumentType.value='other'}
async function documentSaved(){await refreshDocuments()}
async function showDocuments(){closeDocumentComposer();await scrollToRecordAnchor('documents')}

function formatDate(dateString){if(!dateString)return'';return new Date(dateString).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function formatSessionDate(dateString){if(!dateString)return'';return new Date(dateString).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
function formatSessionTime(dateString){if(!dateString)return'';return new Date(dateString).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
onMounted(loadClient)
</script>
