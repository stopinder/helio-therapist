<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div v-if="loading" class="flex-1 flex items-center justify-center"><div class="text-ink-muted flex flex-col items-center gap-2"><span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span><p>Loading session…</p></div></div>
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-inline-lg"><div class="max-w-md w-full bg-surface p-inline-lg py-stack-lg rounded-card shadow-sm border border-state-danger/20 text-center"><h2 class="text-h2 font-semibold text-state-danger mb-2">Error</h2><p class="text-ink-secondary mb-6">{{ error }}</p><button @click="loadSession" class="button-primary">Try Again</button></div></div>
    <template v-else-if="session">
      <SessionWorkspaceHeader :session="workspaceSession" />

      <div class="border-b border-border bg-surface px-inline-lg">
        <div class="max-w-4xl mx-auto flex gap-2 py-2" role="tablist" aria-label="Session workspace views">
          <button type="button" role="tab" :aria-selected="activeView === 'summary'" class="px-4 py-2 rounded-control text-body-sm font-medium" :class="activeView === 'summary' ? 'bg-state-selected text-action-link' : 'text-ink-secondary hover:bg-surface-subtle'" @click="activeView = 'summary'">Session Summary</button>
          <button type="button" role="tab" :aria-selected="activeView === 'clinical'" class="px-4 py-2 rounded-control text-body-sm font-medium" :class="activeView === 'clinical' ? 'bg-state-selected text-action-link' : 'text-ink-secondary hover:bg-surface-subtle'" @click="activeView = 'clinical'">Clinical Record</button>
        </div>
      </div>
      
      <div class="flex-1 overflow-auto p-inline-lg py-stack-lg">
        <div class="max-w-4xl mx-auto space-y-12">
          <template v-if="activeView === 'clinical'">
            <div v-if="session.status === 'completed'" class="space-y-6">
              <div data-testid="session-completion-handoff" class="rounded-panel border border-state-success/20 bg-state-success-surface p-6">
                <h2 class="text-h2 font-semibold text-ink">Clinical record approved and locked.</h2>
                <p class="mt-2 text-body-sm text-ink-secondary">The approved record is read-only. Any correction must be added as an amendment.</p>
                <div class="mt-4 flex flex-wrap gap-3">
                  <RouterLink :to="`/clients/${session.clientId}`" class="button-secondary">Return to client</RouterLink>
                  <RouterLink :to="`/schedule?clientId=${session.clientId}`" class="button-primary">Schedule next appointment</RouterLink>
                </div>
              </div>
              <CompletedClinicalRecord :session="session" :therapistName="therapistName" />
            </div>
            <ClinicalSummaryTab v-else :session="session" :therapistName="therapistName" @update:session="handleSessionUpdate" />
          </template>

          <template v-else>
            <section class="space-y-6">
              <div class="flex items-center justify-between">
                <h2 class="font-serif text-h2 text-ink">Session summary</h2>
                <div class="flex items-center gap-3">
                  <span v-if="copySuccess" class="text-body-sm text-state-success" role="status">Copied!</span>
                  <template v-if="summaryDocument?.content?.body && !isGenerating">
                    <button v-if="!isEditingSummary" @click="isEditingSummary = true" class="text-body-sm font-medium text-action-link hover:underline">Edit</button>
                    <button v-else @click="isEditingSummary = false" class="text-body-sm font-medium text-action-link hover:underline">Done reading</button>
                  </template>
                  <button v-if="summaryDocument?.content?.body" @click="generateSummary" :disabled="isGenerating" class="text-body-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50">Regenerate</button>
                  <button @click="copySummary" :disabled="!summaryDocument?.content?.body" class="button-secondary !min-h-0 py-1.5 px-3 text-body-sm shadow-sm">Copy summary</button>
                </div>
              </div>

              <div class="relative min-h-[12rem]">
                <div v-if="isGenerating" class="py-24 text-center text-ink-muted bg-surface rounded-panel border border-dashed border-border flex flex-col items-center gap-3 shadow-sm">
                  <span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
                  <p class="type-body-medium">Preparing session summary…</p>
                </div>
                <div v-else-if="generationError" class="py-12 px-6 text-center bg-state-danger-surface rounded-panel border border-state-danger/20 shadow-sm">
                  <p class="text-state-danger text-body-sm mb-4">{{ generationError }}</p>
                  <button @click="generateSummary" class="button-primary py-stack-xs px-inline-md text-body-sm">Retry</button>
                </div>
                <template v-else-if="summaryDocument">
                  <SessionSummaryDocument v-if="!isEditingSummary" :body="summaryDocument.content.body" :clientName="client?.name" :date="workspaceSession.date" />
                  <div v-else class="bg-surface rounded-panel border border-border p-6 shadow-sm animate-expandIn">
                    <textarea v-model="summaryDocument.content.body" class="w-full min-h-[30rem] p-6 border border-border rounded-control bg-surface-subtle type-body-long focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all resize-y" placeholder="No session summary yet." @input="handleSummaryInput"></textarea>
                    <div v-if="summaryDocument.sourceManifest?.length" class="mt-4 flex items-center justify-end">
                      <span class="type-metadata text-ink-muted">Generated from Zoom summary + transcript</span>
                    </div>
                  </div>
                </template>
                <div v-else class="py-24 text-center text-ink-muted bg-surface rounded-panel border border-dashed border-border shadow-sm">
                  <div v-if="transcript" class="flex flex-col items-center gap-4">
                    <p class="type-body-medium">No session summary yet.</p>
                    <button @click="generateSummary" :disabled="isGenerating" class="button-primary py-stack-xs px-inline-md">Generate summary</button>
                  </div>
                  <p v-else class="type-body-medium">No session transcript or Zoom summary is available yet.</p>
                </div>
              </div>
            </section>

            <div class="space-y-4">
              <section class="rounded-panel border border-border bg-surface overflow-hidden">
                <button @click="showTranscript = !showTranscript" class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-subtle transition-colors" :aria-expanded="showTranscript">
                  <span class="text-body font-semibold text-ink">View transcript</span>
                  <span class="text-ink-muted transition-transform duration-200" :class="{ 'rotate-180': showTranscript }">▼</span>
                </button>
                <div v-if="showTranscript" class="border-t border-border p-6 bg-surface-subtle">
                  <div v-if="transcriptLoading" class="flex items-center justify-center p-8"><span class="w-6 h-6 border-2 border-state-selected border-t-transparent rounded-full animate-spin"></span></div>
                  <div v-else-if="transcriptError" class="text-state-danger text-body-sm p-4 text-center">{{ transcriptError }}</div>
                  <div v-else-if="!transcript" class="text-ink-muted text-body-sm p-8 text-center">Linked transcript is not available yet.</div>
                  <pre v-else class="whitespace-pre-wrap break-words font-mono text-body-sm leading-relaxed text-ink-secondary max-h-[36rem] overflow-auto">{{ transcript.text }}</pre>
                </div>
              </section>

              <section class="rounded-panel border border-border bg-surface overflow-hidden">
                <button @click="showReflection = !showReflection" class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-subtle transition-colors" :aria-expanded="showReflection">
                  <span class="text-body font-semibold text-ink">Therapist reflection</span>
                  <span class="text-ink-muted transition-transform duration-200" :class="{ 'rotate-180': showReflection }">▼</span>
                </button>
                <div v-if="showReflection" class="border-t border-border p-6 bg-surface-subtle">
                  <ReflectionTab :clientId="session.clientId" :sessionId="session.id" />
                </div>
              </section>
            </div>

            <div class="pt-8 border-t border-border flex justify-center">
              <RouterLink :to="`/clients/${session.clientId}`" class="text-body-sm font-medium text-action-link hover:underline">Return to client</RouterLink>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { supabase } from '../lib/supabase.js';
import { getSession } from '../lib/sessions.js';
import { getClient } from '../lib/clients.js';
import { findSessionSummary, createClientDocumentDraft, saveClientDocumentDraft, generateSessionSummary } from '../lib/clientDocuments.js';
import { authenticatedFetch } from '../lib/api.js';
import SessionWorkspaceHeader from '../components/workspace/SessionWorkspaceHeader.vue';
import ReflectionTab from '../components/workspace/ReflectionTab.vue';
import SessionSummaryDocument from '../components/workspace/SessionSummaryDocument.vue';
import ClinicalSummaryTab from '../components/workspace/ClinicalSummaryTab.vue';
import CompletedClinicalRecord from '../components/workspace/CompletedClinicalRecord.vue';

const route = useRoute();
const session = ref(null), client = ref(null), loading = ref(true), error = ref(''), transcript = ref(null), transcriptLoading = ref(false), transcriptError = ref(''), therapistName = ref('');
const summaryDocument = ref(null);
const activeView = ref('summary');
const isEditingSummary = ref(false);
const showTranscript = ref(false);
const showReflection = ref(false);
const copySuccess = ref(false);
const copyError = ref('');
const isGenerating = ref(false);
const generationError = ref('');
let saveTimer = null;

function handleSessionUpdate(updatedSession) {
  session.value = updatedSession;
  activeView.value = 'clinical';
}

async function generateSummary() {
  if (!session.value || isGenerating.value) return;
  isGenerating.value = true;
  generationError.value = '';
  try {
    const transcriptId = transcript.value?.id;
    const result = await generateSessionSummary({ clientId: session.value.clientId, sessionId: session.value.id, transcriptId });
    if (summaryDocument.value) {
      const updated = await saveClientDocumentDraft(summaryDocument.value, {
        content: {
          ...summaryDocument.value.content,
          body: result.draft.body,
          history: [...(summaryDocument.value.content.history || []), { body: summaryDocument.value.content.body, timestamp: new Date().toISOString(), type: 'pre_regeneration' }]
        },
        sourceManifest: result.sources
      });
      summaryDocument.value = updated;
    } else {
      summaryDocument.value = await createClientDocumentDraft({ client: client.value, title: `Session Summary - ${workspaceSession.value.date}`, documentType: 'session_summary', content: { body: result.draft.body }, sourceManifest: result.sources });
    }
  } catch (err) {
    generationError.value = err.message || 'Summary generation failed. Please try again.';
    console.error('Generation failed:', err);
  } finally {
    isGenerating.value = false;
  }
}

async function copySummary() {
  if (!summaryDocument.value?.content?.body) return;
  copyError.value = '';
  try {
    await navigator.clipboard.writeText(summaryDocument.value.content.body);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  } catch (err) {
    copyError.value = 'Failed to copy to clipboard. Please select and copy manually.';
    console.error('Failed to copy summary:', err);
  }
}

async function handleSummaryInput() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!summaryDocument.value) return;
    try {
      const updated = await saveClientDocumentDraft(summaryDocument.value, { content: summaryDocument.value.content });
      summaryDocument.value.version = updated.version;
    } catch (err) {
      console.error('Failed to auto-save summary:', err);
    }
  }, 1000);
}

async function loadTherapistProfile(){if(!supabase)return;try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data:profile}=await supabase.from('profiles').select('full_name').eq('id',user.id).maybeSingle();const metadataName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim():'';therapistName.value=profile?.full_name?.trim()||metadataName||''}catch(e){console.warn('[Session] Could not load therapist identity',e)}}

async function loadSession(){
  loading.value=true;
  error.value='';
  try{
    const {clientId,sessionId}=route.params;
    const [sessionData,clientData]=await Promise.all([getSession({clientId,sessionId}),getClient({clientId}),loadTherapistProfile()]);
    session.value=sessionData;
    client.value=clientData;
    summaryDocument.value = await findSessionSummary({ clientId, sessionId });
    loadTranscript();
  }catch(e){
    error.value='The session could not be loaded.';
  }finally{
    loading.value=false;
  }
}

async function loadTranscript(){if(!session.value?.id||!session.value?.clientId)return;transcriptLoading.value=true;transcriptError.value='';transcript.value=null;try{const params=new URLSearchParams({sessionRef:String(session.value.id),clientId:String(session.value.clientId)});const response=await authenticatedFetch(`/api/zoom/transcripts?${params.toString()}`);const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Unable to load the linked transcript.');transcript.value=data.transcripts?.[0]||null}catch(err){transcriptError.value=err?.message||'Unable to load the linked transcript.'}finally{transcriptLoading.value=false}}

const workspaceSession=computed(()=>{if(!session.value)return null;const dateObj=new Date(session.value.startedAt),isValidDate=!isNaN(dateObj.getTime());return{id:session.value.id,clientId:session.value.clientId,status:session.value.status==='in_progress'?'In Progress':(session.value.status==='completed'?'Completed':session.value.status),clientName:client.value?.display_name||client.value?.name||'Unknown Client',date:isValidDate?dateObj.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'Pending',time:isValidDate?dateObj.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}):'',type:'Clinical session',videoProvider:'zoom',isInPerson:false}});
onMounted(loadSession);
</script>
