<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div v-if="loading" class="flex-1 flex items-center justify-center"><div class="text-ink-muted flex flex-col items-center gap-2"><span class="w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span><p>Loading session…</p></div></div>
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-inline-lg"><div class="max-w-md w-full bg-surface p-inline-lg py-stack-lg rounded-card shadow-sm border border-state-danger/20 text-center"><h2 class="text-h2 font-semibold text-state-danger mb-2">Error</h2><p class="text-ink-secondary mb-6">{{ error }}</p><button @click="loadSession" class="button-primary">Try Again</button></div></div>
    <template v-else-if="session">
      <SessionWorkspaceHeader :session="workspaceSession" :joiningMeeting="joiningMeeting" :meetingError="meetingError" @join-meeting="joinMeeting" />
      
      <div class="flex-1 overflow-auto p-inline-lg py-stack-lg">
        <div class="max-w-4xl mx-auto space-y-12">
          
          <!-- Primary Section: Session Summary -->
          <section class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-h2 font-semibold text-ink">Session summary</h2>
              <div class="flex items-center gap-3">
                <span v-if="copySuccess" class="text-body-sm text-state-success" role="status">Copied!</span>
                <button 
                  @click="copySummary" 
                  :disabled="!session.notes" 
                  class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle disabled:opacity-50"
                >
                  Copy summary
                </button>
              </div>
            </div>

            <div class="bg-surface rounded-panel border border-border p-6 shadow-sm">
              <div v-if="session.notes" class="prose prose-sm max-w-none">
                <textarea 
                  v-model="session.notes" 
                  class="w-full min-h-[20rem] p-4 border border-border rounded-control bg-surface-subtle text-body focus:border-action-link focus:ring-1 focus:ring-action-link outline-none transition-all"
                  placeholder="No session summary yet."
                  @input="handleNotesInput"
                ></textarea>
              </div>
              <div v-else class="py-12 text-center text-ink-muted bg-surface-subtle rounded-panel border border-dashed border-border">
                <p>No session summary yet.</p>
              </div>
            </div>
          </section>

          <!-- Secondary Actions / Collapsible Areas -->
          <div class="space-y-4">
            <!-- Transcript -->
            <section class="rounded-panel border border-border bg-surface overflow-hidden">
              <button 
                @click="showTranscript = !showTranscript" 
                class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-subtle transition-colors"
                :aria-expanded="showTranscript"
              >
                <span class="text-body font-semibold text-ink">View transcript</span>
                <span class="text-ink-muted transition-transform duration-200" :class="{ 'rotate-180': showTranscript }">▼</span>
              </button>
              <div v-if="showTranscript" class="border-t border-border p-6 bg-surface-subtle">
                <TranscriptTab 
                  :transcript="transcript" 
                  :clientId="session.clientId" 
                  :sessionId="session.id" 
                  :loading="transcriptLoading" 
                  :error="transcriptError" 
                  activeTab="Session Capture" 
                  @retry="loadTranscript" 
                />
              </div>
            </section>

            <!-- Reflection -->
            <section class="rounded-panel border border-border bg-surface overflow-hidden">
              <button 
                @click="showReflection = !showReflection" 
                class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-subtle transition-colors"
                :aria-expanded="showReflection"
              >
                <span class="text-body font-semibold text-ink">Therapist reflection</span>
                <span class="text-ink-muted transition-transform duration-200" :class="{ 'rotate-180': showReflection }">▼</span>
              </button>
              <div v-if="showReflection" class="border-t border-border p-6 bg-surface-subtle">
                <ReflectionTab :clientId="session.clientId" :sessionId="session.id" />
              </div>
            </section>
          </div>

          <div class="pt-8 border-t border-border flex justify-center">
            <RouterLink :to="`/clients/${session.clientId}`" class="text-body-sm font-medium text-action-link hover:underline">
              Return to client
            </RouterLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'; 
import { useRoute, useRouter, RouterLink } from 'vue-router'; 
import { supabase } from '../lib/supabase.js'; 
import { getSession, saveSessionDraft } from '../lib/sessions.js'; 
import { getClient } from '../lib/clients.js'; 
import { authenticatedFetch } from '../lib/api.js'; 
import SessionWorkspaceHeader from '../components/workspace/SessionWorkspaceHeader.vue'; 
import TranscriptTab from '../components/workspace/TranscriptTab.vue'; 
import ReflectionTab from '../components/workspace/ReflectionTab.vue'; 

const route = useRoute(); 
const session = ref(null), client = ref(null), loading = ref(true), error = ref(''), transcript = ref(null), transcriptLoading = ref(false), transcriptError = ref(''), joiningMeeting = ref(false), meetingError = ref(''), therapistName = ref('');
const showTranscript = ref(false);
const showReflection = ref(false);
const copySuccess = ref(false);
const aiClinicalNoteDraft = ref(null);
let saveTimer = null;

async function copySummary() {
  if (!session.value?.notes) return;
  try {
    await navigator.clipboard.writeText(session.value.notes);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  } catch (err) {
    console.error('Failed to copy summary:', err);
  }
}

function handleNotesInput() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!session.value) return;
    try {
      const updated = await saveSessionDraft(session.value, session.value.notes);
      session.value.version = updated.version;
    } catch (err) {
      console.error('Failed to auto-save summary:', err);
    }
  }, 1000);
}
async function joinMeeting(){if(!session.value?.id||!session.value?.clientId||joiningMeeting.value)return;joiningMeeting.value=true;meetingError.value='';try{const response=await authenticatedFetch('/api/zoom/start-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:session.value.clientId,sessionRef:session.value.id})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Unable to open Zoom for this session.');if(!data.startUrl)throw new Error('Zoom did not return a meeting link.');window.open(data.startUrl,'_blank','noopener,noreferrer')}catch(err){meetingError.value=err?.message||'Unable to open Zoom for this session.'}finally{joiningMeeting.value=false}}
async function loadTherapistProfile(){if(!supabase)return;try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data:profile}=await supabase.from('profiles').select('full_name').eq('id',user.id).maybeSingle();const metadataName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim():'';therapistName.value=profile?.full_name?.trim()||metadataName||''}catch(e){console.warn('[Session] Could not load therapist identity',e)}} async function loadSession(){loading.value=true;error.value='';aiClinicalNoteDraft.value=null;try{const {clientId,sessionId}=route.params;const [sessionData,clientData]=await Promise.all([getSession({clientId,sessionId}),getClient({clientId}),loadTherapistProfile()]);session.value=sessionData;client.value=clientData;loadTranscript()}catch(e){error.value='The session could not be loaded.'}finally{loading.value=false}}
async function loadTranscript(){if(!session.value?.id||!session.value?.clientId)return;transcriptLoading.value=true;transcriptError.value='';transcript.value=null;try{const params=new URLSearchParams({sessionRef:String(session.value.id),clientId:String(session.value.clientId)});const response=await authenticatedFetch(`/api/zoom/transcripts?${params.toString()}`);const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Unable to load the linked transcript.');transcript.value=data.transcripts?.[0]||null}catch(err){transcriptError.value=err?.message||'Unable to load the linked transcript.'}finally{transcriptLoading.value=false}}
const workspaceSession=computed(()=>{if(!session.value)return null;const dateObj=new Date(session.value.startedAt),isValidDate=!isNaN(dateObj.getTime());return{id:session.value.id,clientId:session.value.clientId,status:session.value.status==='in_progress'?'In Progress':(session.value.status==='completed'?'Completed':session.value.status),clientName:client.value?.display_name||client.value?.name||'Unknown Client',date:isValidDate?dateObj.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'Pending',time:isValidDate?dateObj.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}):'',type:'Clinical session',videoProvider:'zoom',isInPerson:false}}); onMounted(loadSession);
</script>
