"""One-time guarded integration. Does not access a database or production records."""
from pathlib import Path

def edit(path, transform):
    p=Path(path);old=p.read_text();new=transform(old);assert new!=old,path;p.write_text(new)
def rep(s,old,new,count=1):
    assert s.count(old)>=count,old[:100]
    return s.replace(old,new,count)

def session_ui(s):
    s=rep(s,"import HelpLink from '../components/help/HelpLink.vue'","import HelpLink from '../components/help/HelpLink.vue'\nimport SourceReviewPanel from '../components/workspace/SourceReviewPanel.vue';\nimport { isUnusableSummary } from '../lib/summarySafety.js';")
    s=rep(s,'saveClientDocumentDraft, generateSessionSummary }','saveClientDocumentDraft, generateSessionSummary, checkSummarySourceSafety }')
    s=rep(s,'const summaryDocument = ref(null);',"""const summaryDocument = ref(null);
const sourceReview=ref(null),reviewTranscriptId=ref('');
const summaryUnsafe=computed(()=>isUnusableSummary(summaryDocument.value?.content));
function openSourceReview(item){reviewTranscriptId.value=item?.transcriptId||transcript.value?.id||''}
async function sourceReviewResolved(result){
  if(result.action==='confirm'){
    reviewTranscriptId.value='';sourceReview.value={resolved:true,message:'Source review saved. Generate a fresh summary before copying or sharing. Your earlier draft is unchanged.',sources:[]};await loadTranscript();
  }else{sourceReview.value={message:'The original was separated. Open one of the reviewed encounters below.',sources:[]};transcript.value=null;}
}
async function verifySavedSummary(){
  if(!summaryDocument.value?.id)return !summaryUnsafe.value;
  try{const safety=await checkSummarySourceSafety(summaryDocument.value.id);if(!safety.safe){sourceReview.value=safety.review;return false}return true}
  catch{sourceReview.value={message:'Source safety could not be verified. Review before copying or sharing.',sources:[]};return false}
}""")
    s=rep(s,'            <section class="space-y-6">',"""            <section v-if="sourceReview || summaryUnsafe" class="rounded-panel border border-border bg-surface-elevated p-5 space-y-3" data-testid="source-review-notice">
              <h2 class="text-h3 font-semibold">{{ sourceReview?.resolved ? 'Source review saved' : 'Source needs review' }}</h2>
              <p>{{ sourceReview?.message || 'The earlier output is a source-review notice, not a usable summary. Review its original source and regenerate.' }}</p>
              <p class="text-body-sm">Your previous draft and imported Zoom note have been preserved. No new summary was saved by this review.</p>
              <div v-if="!sourceReview?.resolved" class="flex flex-wrap gap-2"><button v-for="(item,index) in sourceReview?.sources || []" :key="index" v-show="item.transcriptId" class="button-primary" @click="openSourceReview(item)">Review flagged source {{ index+1 }}</button><button v-if="!sourceReview?.sources?.length && transcript?.id" class="button-primary" @click="openSourceReview()">Review original source</button></div>
            </section>
            <SourceReviewPanel v-if="reviewTranscriptId" :transcript-id="reviewTranscriptId" @close="reviewTranscriptId=''" @resolved="sourceReviewResolved" />
            <section class="space-y-6">""")
    s=rep(s,':disabled="!summaryDocument?.content?.body"',':disabled="!summaryDocument?.content?.body || !!sourceReview || summaryUnsafe"')
    s=rep(s,'<template v-else-if="summaryDocument">','<template v-else-if="summaryDocument && !summaryUnsafe">')
    s=rep(s,"if (!summaryDocument.value?.content?.body) return;","if (!summaryDocument.value?.content?.body || sourceReview.value || summaryUnsafe.value) return;\n  if(!await verifySavedSummary())return;")
    s=rep(s,'      id: result.generationId,',"      outcome:'ready',\n      id: result.generationId,")
    s=rep(s,'    showSummaryOptions.value = false;','    sourceReview.value=null;\n    showSummaryOptions.value = false;')
    s=rep(s,"    generationError.value = err.message || 'Summary generation failed. Please try again.';","    if(err.code==='SOURCE_REVIEW_REQUIRED'){sourceReview.value=err.review||{message:err.message,sources:[]};return;}\n    generationError.value = err.message || 'Summary generation failed. Please try again.';")
    s=rep(s,'    summaryDocument.value = await findSessionSummary({ clientId, sessionId });','    summaryDocument.value = await findSessionSummary({ clientId, sessionId });\n    await verifySavedSummary();')
    return s
edit('src/views/SessionWorkspace.vue',session_ui)

def composer(s):
    s=rep(s,'<script setup>',"<script setup>\nimport SourceReviewPanel from './SourceReviewPanel.vue'\nimport { isUnusableSummary } from '../../lib/summarySafety.js'")
    s=rep(s,'listDocumentSourceSessions, saveClientDocumentDraft }','listDocumentSourceSessions, saveClientDocumentDraft, checkSummarySourceSafety }')
    s=rep(s,'summarySources = ref(props.document?.content?.clinicalIntelligence?.sources || [])','summarySources = ref(props.document?.content?.clinicalIntelligence?.sources || props.document?.sourceManifest || [])')
    s=rep(s,'summaryGeneration = ref(props.document?.content?.clinicalIntelligence?.generation || null)','summaryGeneration = ref(props.document?.content?.clinicalIntelligence?.generation || props.document?.content?.summaryGeneration || null)')
    a=s.index('const identity =')
    s=s[:a]+"""const sourceReview=ref(null),reviewTranscriptId=ref(''),confirmedSource=ref(null)
const sourceSafetyChecking=ref(Boolean(props.document?.id && initialType==='session_summary'))
const summaryUnsafe=computed(()=>isUnusableSummary({body:form.body,summaryGeneration:summaryGeneration.value}))
const reviewSources=computed(()=>sourceReview.value?.sources || currentDocument.value?.sourceManifest?.filter(item=>item.transcriptId) || [])
const confirmedEncounterUrl=computed(()=>{
  const source=confirmedSource.value
  return source?.clientId&&source?.sessionId&&source?.id?`/clients/${encodeURIComponent(source.clientId)}/sessions/${encodeURIComponent(source.sessionId)}?view=summary&transcriptId=${encodeURIComponent(source.id)}`:''
})
function handleSourceReviewResolved(result){
  if(result.action==='confirm'){
    confirmedSource.value=result;reviewTranscriptId.value=''
    sourceReview.value={resolved:true,message:'Source review saved. Regenerate this encounter summary before using it in a longer-term summary. The earlier draft is not ready to share.',sources:[]}
  }else{sourceReview.value={message:'Open a reviewed conversation below to prepare its session summary.',sources:[]}}
}
onMounted(async()=>{
  if(!currentDocument.value?.id||!isSessionSummary.value){sourceSafetyChecking.value=false;return}
  try{const safety=await checkSummarySourceSafety(currentDocument.value.id);sourceReview.value=safety.safe?null:safety.review}
  catch{sourceReview.value={message:'Source safety could not be verified. Review before copying or sharing.',sources:[]}}
  finally{sourceSafetyChecking.value=false}
})
"""+s[a:]
    needle='        <div v-if="finalised"'
    s=rep(s,needle,"""        <p v-if="sourceSafetyChecking" role="status" class="p-4">Checking summary source before sharing...</p>
        <section v-if="sourceReview || summaryUnsafe" class="p-4 border-b border-border bg-surface-elevated" data-testid="composer-source-review">
          <h3 class="font-semibold">{{ sourceReview?.resolved ? 'Source review saved' : 'Source needs review' }}</h3><p>{{ sourceReview?.message || 'This saved item is a source-review notice, not clinical evidence. Review its original and regenerate.' }}</p><p class="text-body-sm">Your previous draft is unchanged.</p>
          <button v-for="(item,index) in reviewSources" :key="index" class="button-secondary mt-2" :disabled="!item.transcriptId" @click="reviewTranscriptId=item.transcriptId">Review source {{index+1}}</button>
          <a v-if="sourceReview?.resolved && confirmedEncounterUrl" :href="confirmedEncounterUrl" class="button-primary">Open this encounter to regenerate</a>
        </section>
        <div v-if="reviewTranscriptId" class="overflow-auto max-h-[70vh] p-4"><SourceReviewPanel :transcript-id="reviewTranscriptId" @close="reviewTranscriptId=''" @resolved="handleSourceReviewResolved" /></div>
"""+needle)
    for old in [':disabled="saving || !form.title.trim() || !form.body.trim()"',':disabled="copySummaryState === \'copying\'"',':disabled="generatingSummary || copySummaryState === \'copying\'"']:
        s=rep(s,old,old[:-1]+' || !!sourceReview || summaryUnsafe || sourceSafetyChecking"')
    s=rep(s,'async function copySummary(){','async function copySummary(){\n  if(sourceReview.value||summaryUnsafe.value||sourceSafetyChecking.value)return;')
    s=rep(s,'async function finaliseDocument() {','async function finaliseDocument() { if(sourceReview.value||summaryUnsafe.value||sourceSafetyChecking.value)return;')
    s=rep(s,'async function downloadFinalised() {','async function downloadFinalised() { if(sourceReview.value||summaryUnsafe.value||sourceSafetyChecking.value)return;')
    s=rep(s,'summaryGeneration.value={id:result.generationId,',"summaryGeneration.value={outcome:'ready',id:result.generationId,")
    s=rep(s,'if (generatingSummary.value) return;','if (generatingSummary.value || sourceSafetyChecking.value) return;')
    s=rep(s,' if(currentBody)previousSummaryVersions.value=', ' sourceReview.value=null; if(currentBody)previousSummaryVersions.value=')
    s=rep(s,'} catch (e) { summaryGenerationError.value = true;',"} catch (e) { if(e.code==='SOURCE_REVIEW_REQUIRED'){sourceReview.value=e.review||{message:e.message,sources:[]};summaryGenerationMessage.value='Source needs review. Previous draft unchanged.';return;} summaryGenerationError.value = true;")
    s=s.replace('<button class="button-primary" @click="downloadFinalised">','<button class="button-primary" :disabled="sourceSafetyChecking || !!sourceReview || summaryUnsafe" @click="downloadFinalised">')
    return s
edit('src/components/workspace/ClientDocumentComposer.vue',composer)

def inbox(s):
    s=rep(s,"import StatusIndicator from './ui/StatusIndicator.vue'","import StatusIndicator from './ui/StatusIndicator.vue'\nimport SourceReviewPanel from './workspace/SourceReviewPanel.vue'\nconst reviewSourceId=ref('')\nasync function handleSourceReviewed(result){if(result.action==='confirm')reviewSourceId.value='';await load()}")
    s=rep(s,'<section ref="inboxRoot" class="transcript-inbox">','<section ref="inboxRoot" class="transcript-inbox">\n    <SourceReviewPanel v-if="reviewSourceId" :transcript-id="reviewSourceId" @close="reviewSourceId=\'\'" @resolved="handleSourceReviewed" />')
    s=rep(s,'            <div v-if="filterMode === \'attention\' && !transcript.clientId && !transcript.sessionRef"',"""            <div v-if="transcript.sourceReview?.state==='needs_review'" class="matched-note"><span>Check the original before preparing or sharing a summary.</span><button class="button-primary" @click="reviewSourceId=transcript.id">Review source</button></div>
            <div v-else-if="transcript.sourceReview?.state==='separated'" class="matched-note"><span>Original retained. Use its reviewed conversation segments.</span><button class="button-secondary" @click="reviewSourceId=transcript.id">View separation</button></div>
            <div v-else-if="filterMode === 'attention' && !transcript.clientId && !transcript.sessionRef'""".replace('sessionRef\'', 'sessionRef'))
    return s
edit('src/components/TranscriptInbox.vue',inbox)

def workflow(s):
    s=rep(s,'export function transcriptWorkflowState(transcript) {',"""export function transcriptWorkflowState(transcript) {
  if(transcript?.sourceReview?.state==='separated')return{id:'separated',label:'Separated original',tone:'neutral'};
  if(transcript?.sourceReview?.state==='needs_review')return{id:'source-review',label:'Source needs review',tone:'warning'};""")
    s=rep(s,'return Boolean(transcript && !hasLinkedEncounter(transcript) && !transcript.completedAt && !transcript.attentionClearedAt);',"return Boolean(transcript && transcript.sourceReview?.state!=='separated' && (transcript.sourceReview?.state==='needs_review' || (!hasLinkedEncounter(transcript) && !transcript.completedAt && !transcript.attentionClearedAt)));")
    s=rep(s,'  if (!hasLinkedEncounter(transcript)) return null;',"  if (!hasLinkedEncounter(transcript) || ['needs_review','separated'].includes(transcript?.sourceReview?.state)) return null;")
    return s
edit('src/lib/transcriptWorkflow.js',workflow)

# Remount only when the clinical encounter/source changes, including reviewed-child links.
# This prevents reusing the old session component with another client's route parameters.
edit('src/AuthGate.vue',lambda s:rep(s,'<AppShell data-testid="workspace-shell"><router-view /></AppShell>', '<AppShell data-testid="workspace-shell"><router-view :key="route.name === \'SessionWorkspace\' ? [route.params.clientId,route.params.sessionId,route.query.transcriptId || \'\'].join(\':\') : undefined" /></AppShell>'))

# Update existing source-contract tests, retaining their behaviour and security assertions.
def update_test(path, pairs):
    p=Path(path);s=p.read_text()
    for old,new in pairs:s=rep(s,old,new)
    p.write_text(s)
update_test('test/transcript-clear-behaviour.test.js',[('clients: props.clients, inboxRoot,','clients: props.clients, inboxRoot, reviewSourceId,')])
update_test('test/session-summary-generation-ui.test.js',[
 ('/original_transcript_excerpt/','/transcript:transcriptForPrompt, zoom_note:zoomSummary/'),
 ('/clientSessionSummaryResponseFormat\\(validSourceIds\\)/','/summaryOutcomeResponseFormat\\(validSourceIds\\)/'),
 ('/normalizeClientSessionSummaryResponse/','/validateSummaryOutcome/'),
 ('/session-summary-direct-v5/','/session-summary-direct-v6-source-review/'),
 ('/<template v-else-if="summaryDocument">/','/<template v-else-if="summaryDocument && !summaryUnsafe">/')])
update_test('test/session-workspace-simplified.test.js',[
 ('/:disabled="!summaryDocument\\?\\.content\\?\\.body"/', '/:disabled="!summaryDocument\\?\\.content\\?\\.body \\|\\| !!sourceReview \\|\\| summaryUnsafe"/')])

print('Connected source review to all summary views and preserved sharing boundaries.')
