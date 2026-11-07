// One-time, exact-baseline source refactor. Removed before release.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const repo='stopinder/helio-therapist';
const branch='refactor/global-summary-authoring-20261107';
const paths=['api/_lib/ai-client-session-summary.js','api/ai/session-summary.js','api/ai/client-session-summary.js','src/lib/clientDocuments.js','src/views/SessionWorkspace.vue','src/components/workspace/ClientDocumentComposer.vue','api/_lib/clinical-record-evidence.js','scripts/evaluate-clinical-intelligence.mjs'];
if(process.argv.includes('--publish')) {
  if(process.env.GITHUB_REPOSITORY!==repo || process.env.GITHUB_REF!=='refs/heads/'+branch || !process.env.GITHUB_TOKEN)throw new Error('Wrong publishing context');
  const changed=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  if(!changed.length || changed.some(path=>!paths.includes(path)))throw new Error('Unexpected source change set');
  async function api(path,method='GET',body){
    const response=await fetch('https://api.github.com/repos/'+repo+path,{method,headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    if(!response.ok)throw new Error('GitHub source publication failed: '+response.status);
    return response.json();
  }
  const head=process.env.GITHUB_SHA;
  const ref=await api('/git/ref/heads/'+branch);
  if(ref.object.sha!==head)throw new Error('Branch changed during source verification');
  const parent=await api('/git/commits/'+head);
  const tree=await api('/git/trees','POST',{base_tree:parent.tree.sha,tree:changed.map(path=>({path,mode:'100644',type:'blob',content:fs.readFileSync(path,'utf8')}))});
  const commit=await api('/git/commits','POST',{message:'Unify summary writing, optional resources and review-before-replace across all summary paths',tree:tree.sha,parents:[head]});
  const fresh=await api('/git/ref/heads/'+branch);if(fresh.object.sha!==head)throw new Error('Branch changed before publication');
  await api('/git/refs/heads/'+branch,'PATCH',{sha:commit.sha,force:false});
  console.log('summary_source_commit='+commit.sha);
  process.exit(0);
}
const files=new Map(paths.map(path=>[path,fs.readFileSync(path,'utf8')]));
function edit(path,fn){files.set(path,fn(files.get(path)));}
function one(text,old,replacement){if(!text.includes(old)||text.indexOf(old)!==text.lastIndexOf(old))throw new Error('Missing or ambiguous refactor anchor: '+old.slice(0,100));return text.replace(old,replacement);}
function span(text,start,end,replacement){const a=text.indexOf(start),b=text.indexOf(end,a+start.length);if(a<0||b<0)throw new Error('Missing refactor block: '+start);return text.slice(0,a)+replacement+text.slice(b);}

edit(paths[0],s=>{
  const validator=s.slice(s.indexOf('export function normalizeClientSessionSummaryResponse'),s.indexOf('export function renderClientSessionSummary'));
  s="import { summaryAuthoringPrompt, SUMMARY_POLICY_VERSION } from './summary-authoring-policy.js';\nimport { renderSummarySections } from '../../src/lib/summaryAuthoring.js';\nimport { summaryClinicalEvidence } from '../../src/lib/summaryEvidence.js';\n"+s;
  s=one(s,"export const CLIENT_SESSION_SUMMARY_PROMPT_VERSION = 'client-session-summary-v14-therapist-refinement';","export const CLIENT_SESSION_SUMMARY_PROMPT_VERSION = SUMMARY_POLICY_VERSION + '/longitudinal';");
  s=span(s,'const sharedRules = `','const lensRules = {','');
  s=span(s,'export function clientSessionSummarySystemPrompt','export function clientSessionSummaryResponseFormat',"export function clientSessionSummarySystemPrompt(lens = 'general', options = {}) { return summaryAuthoringPrompt(clientSessionSummaryLensRule(lens), options); }\n\n");
  s=one(s,"therapistGuidance = '', refinementRequest = '', previousDraft = '' })", "therapistGuidance = '', refinementRequest = '', previousDraft = '', summaryOptions = {} })");
  s=one(s,'    reasoningInstructions: {',"    editorialPreferences: { audience: summaryOptions.audience || 'auto', addition: summaryOptions.addition || 'none' },\n    reasoningInstructions: {");
  s=one(s,"content: capture.content && typeof capture.content === 'object' ? capture.content : {}","content: capture.content && typeof capture.content === 'object' ? {...capture.content, ...(typeof capture.content.existingSessionSummary === 'string' ? {existingSessionSummary:summaryClinicalEvidence(capture.content.existingSessionSummary)} : {})} : {}");
  const index=s.indexOf('export function renderClientSessionSummary');
  s=s.slice(0,index)+"export function renderClientSessionSummary(sections, lens='general') { return renderSummarySections(sections); }\n";
  if(!s.includes(validator))throw new Error('Clinical source validator changed unexpectedly');
  return s;
});
const serverImports="import { normalizeSummaryOptions, resourceAppendix, wantsSummaryExercise } from '../../src/lib/summaryAuthoring.js';\nimport { SUMMARY_POLICY_VERSION } from '../_lib/summary-authoring-policy.js';\nimport { reviewSummaryDraft } from '../_lib/summary-quality-review.js';\nimport { verifySummaryResource } from '../_lib/summary-resource-check.js';\n";
edit(paths[1],s=>{
  s=serverImports+s;
  s=one(s,'  clientSessionSummaryLensRule,','  clientSessionSummarySystemPrompt,');
  s=one(s,"const PROMPT_VERSION = 'session-summary-direct-v8-formulation-and-refinement';","const PROMPT_VERSION = SUMMARY_POLICY_VERSION + '/encounter';");
  s=one(s,'    const { data: session, error: sessionError } = await supabase',"    const summaryOptions = normalizeSummaryOptions(req.body?.summaryOptions ?? {});\n    const { data: session, error: sessionError } = await supabase");
  s=one(s,"    const guidance = [therapistGuidance.trim(),", "    const resourceVerification = await verifySummaryResource(summaryOptions.resource);\n    const guidance = [wantsSummaryExercise(summaryOptions) ? 'Therapist requests an optional future exercise for consideration, not an intervention performed or agreed in session.' : '', therapistGuidance.trim(),");
  s=span(s,'    const lensRule = clientSessionSummaryLensRule(lens);','    const sourceBlocks=',String.raw`    const validSourceIds = new Set(selectedSources.map(source => source.id));
    if (guidance) validSourceIds.add('therapist:guidance');
    const systemPrompt = clientSessionSummarySystemPrompt(lens,summaryOptions)
      .replace('Return JSON only with exactly two fields:','For a ready outcome, supply these clinical fields:')
      + '\nEvidence window: ' + window + '\n' + SUMMARY_OUTCOME_RULES;

`);
  s=one(s,'sessionId,sourceBlocks,therapistGuidance:guidance,','sessionId,sourceBlocks,therapistGuidance:guidance,editorialPreferences:{audience:summaryOptions.audience,addition:summaryOptions.addition},');
  s=one(s,'    await assertSourcesUnchanged(supabase,user.id,usedSources.map(source=>source.row));',String.raw`    let qualityReview={policyVersion:SUMMARY_POLICY_VERSION,kind:'mechanical_editorial_checks',revisionAttempted:false,warnings:[]};
    if(structured.outcome==='ready') {
      const qualityIds=new Set(usedSources.map(source=>source.id));
      if(guidance)qualityIds.add('therapist:guidance');
      const qualityInput=JSON.parse(userInput);
      qualityInput.sourceBlocks=usedSources.map((source,index)=>sourceBlock(source,{isCurrent:index===0,suppressZoomNote:(reviewCautions.length>0&&!!source.original_transcript?.trim())||(excludeEarlierZoomNotes&&index>0)}));
      const qualityEvidence=qualityInput.sourceBlocks.map(source=>({id:source.id,transcript:source.transcript,zoom_note:source.zoom_note}));
      const reviewed=await reviewSummaryDraft({request:{...request,responseFormat:summaryOutcomeResponseFormat(qualityIds),messages:[{role:'system',content:systemPrompt},{role:'user',content:JSON.stringify(qualityInput)}]},completion,model,structured,validSourceIds:qualityIds,evidenceSources:qualityEvidence,summaryOptions});
      structured=reviewed.structured;completion=reviewed.completion;model=reviewed.model;qualityReview=reviewed.qualityReview;
    }
    await assertSourcesUnchanged(supabase,user.id,usedSources.map(source=>source.row));`);
  s=one(s,'    const body = renderClientSessionSummary(structured.sections, lens);','    const body = renderClientSessionSummary(structured.sections, lens) + resourceAppendix(summaryOptions.resource,resourceVerification);');
  s=one(s,'        promptVersion: PROMPT_VERSION,','        promptVersion: PROMPT_VERSION,\n        summaryOptions, resourceSelection:summaryOptions.resource?{...summaryOptions.resource,verification:resourceVerification}:null, qualityReview,');
  s=one(s,'  } catch (error) {\n    if(error.code',"  } catch (error) {\n    if(['INVALID_SUMMARY_OPTIONS','RESOURCE_NOT_VERIFIED','SUMMARY_ADDITION_NOT_VERIFIED'].includes(error.code))return res.status(error.status||422).json({success:false,error:{code:error.code,message:error.message}});\n    if(error.code");
  return s;
});
edit(paths[2],s=>{
  s=serverImports+s;
  s=one(s,'    const { data: ownedClient, error: clientError } = await supabase',"    const summaryOptions=normalizeSummaryOptions(req.body?.summaryOptions ?? {});\n    const { data: ownedClient, error: clientError } = await supabase");
  s=one(s,'    const approvedGuidance = refinementRequest.trim()',"    const resourceVerification=await verifySummaryResource(summaryOptions.resource);\n    const exerciseGuidance=wantsSummaryExercise(summaryOptions)?'Therapist requests an optional future exercise for consideration, not performed or agreed in session.':'';\n    const approvedGuidance = refinementRequest.trim()");
  s=one(s,"? [therapistGuidance, 'Therapist-approved editorial request", "? [exerciseGuidance,therapistGuidance, 'Therapist-approved editorial request");
  s=one(s,'      : therapistGuidance;','      : [exerciseGuidance,therapistGuidance].filter(Boolean).join("\\n\\n");');
  s=one(s,'    const { completion, model } = await runTextAI({','    const request = {');
  s=one(s,"clientSessionSummarySystemPrompt(lens).replace", "clientSessionSummarySystemPrompt(lens,summaryOptions).replace");
  s=one(s,'therapistGuidance:approvedGuidance,refinementRequest,previousDraft})','therapistGuidance:approvedGuidance,refinementRequest,previousDraft,summaryOptions})');
  s=one(s,'    });\n    const finishReason = completion.choices?', '    };\n    let { completion, model } = await runTextAI(request);\n    const finishReason = completion.choices?');
  s=one(s,'    const structured=validateSummaryOutcome(', '    let structured=validateSummaryOutcome(');
  s=one(s,'    await assertSourcesUnchanged(supabase,user.id,selectedTranscriptRows);',String.raw`    const reviewed=await reviewSummaryDraft({request,completion,model,structured,validSourceIds,evidenceSources,summaryOptions});
    structured=reviewed.structured;completion=reviewed.completion;model=reviewed.model;
    const qualityReview=reviewed.qualityReview;
    await assertSourcesUnchanged(supabase,user.id,selectedTranscriptRows);`);
  s=one(s,'    const body = renderClientSessionSummary(structured.sections, lens);','    const body = renderClientSessionSummary(structured.sections, lens) + resourceAppendix(summaryOptions.resource,resourceVerification);');
  s=one(s,'sessionCount:selectedCaptures.length,promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,model,usage:', 'sessionCount:selectedCaptures.length,promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,summaryOptions,resourceSelection:summaryOptions.resource?{...summaryOptions.resource,verification:resourceVerification}:null,qualityReview,model,usage:');
  s=one(s,'  } catch (error) {\n    if(error.code',"  } catch (error) {\n    if(['INVALID_SUMMARY_OPTIONS','RESOURCE_NOT_VERIFIED','SUMMARY_ADDITION_NOT_VERIFIED'].includes(error.code))return res.status(error.status||422).json({success:false,error:{code:error.code,message:error.message}});\n    if(error.code");
  return s;
});
edit(paths[3],s=>{
  s=one(s,"refinementRequest='',previousDraft='',anchorSessionId=null}","refinementRequest='',previousDraft='',summaryOptions={},anchorSessionId=null}");
  s=one(s,'therapistGuidance,refinementRequest,previousDraft,anchorSessionId})','therapistGuidance,refinementRequest,previousDraft,summaryOptions,anchorSessionId})');
  s=one(s,"therapistGuidance='',refinementRequest='',previousDraft=''})","therapistGuidance='',refinementRequest='',previousDraft='',summaryOptions={}})");
  s=one(s,'therapistGuidance,refinementRequest,previousDraft})','therapistGuidance,refinementRequest,previousDraft,summaryOptions})');
  return s;
});

edit(paths[4],s=>{
  s=one(s,'<script setup>',"<script setup>\nimport SummaryRefinementPanel from '../components/workspace/SummaryRefinementPanel.vue';\nimport { candidateMatches, summaryContextKey } from '../lib/summaryAuthoring.js';");
  s=span(s,'              <section v-if="summaryDocument?.content?.body && summaryDocument.status', '              <div v-if="summaryDocument?.content?.summaryGeneration?.reviewRequired"',String.raw`              <SummaryRefinementPanel v-if="summaryDocument?.content?.body && summaryDocument.status !== 'completed'"
                :body="summaryDocument.content.body" :context-key="refinementContext" :busy="isGenerating || reviewSaveBusy"
                :disabled="!!sourceReview || summaryUnsafe || transcriptLoading || !!transcriptError || !transcript"
                :candidate="pendingSummary" :error="generationError"
                @generate="requestSummaryRefinement" @accept="acceptSummaryRevision" @discard="pendingSummary=null" />

`);
  s=span(s,"const refinementInput = ref('');",'const showSummaryOptions = ref(true);',String.raw`const pendingSummary=ref(null);
const refinementContext=computed(()=>summaryContextKey([session.value?.clientId,session.value?.id,transcript.value?.id,transcript.value?.sourceVersion,summaryLens.value,summaryWindow.value,excludeEarlierZoomNotes.value,therapistGuidance.value]));
watch(refinementContext,()=>{pendingSummary.value=null;});
`);
  s=span(s,'function reviewRefinement() {','async function approveSummaryDraft()',String.raw`async function requestSummaryRefinement(payload) {
  if(payload.baseBody!==summaryDocument.value?.content?.body || payload.contextKey!==refinementContext.value)return;
  await generateSummary(payload);
}
async function generateSummary(payload = null) {
  if(!session.value || !transcript.value || transcriptLoading.value || transcriptError.value || isGenerating.value || reviewSaveBusy.value || summaryDocument.value?.status==='completed')return;
  const refinement=payload && typeof payload.instruction==='string'?payload:null;
  const baseBody=summaryDocument.value?.content?.body||'';
  const contextKey=refinementContext.value;
  isGenerating.value=true;generationError.value='';pendingSummary.value=null;
  try{
    const result=await generateSessionSummary({clientId:session.value.clientId,sessionId:session.value.id,transcriptId:transcript.value.id,
      lens:summaryLens.value,window:summaryWindow.value,excludeEarlierZoomNotes:excludeEarlierZoomNotes.value,therapistGuidance:therapistGuidance.value,
      refinementRequest:refinement?.instruction||'',previousDraft:refinement?baseBody.slice(0,10000):'',summaryOptions:refinement?.summaryOptions||{}});
    if(disposed)return;
    if(contextKey!==refinementContext.value || baseBody!==(summaryDocument.value?.content?.body||''))throw new Error('The draft or evidence selection changed. Prepare a new preview; nothing has been replaced.');
    if(baseBody){pendingSummary.value={result,baseBody,contextKey,instruction:refinement?.instruction||''};return;}
    await installSummaryResult(result,refinement?.instruction||'');
  }catch(err){
    if(err.code==='SOURCE_REVIEW_REQUIRED'){sourceReview.value=err.review||{message:err.message,sources:[]};return;}
    if(!disposed)generationError.value=err.message||'Summary generation failed. The current draft is unchanged.';
  }finally{isGenerating.value=false;}
}
async function acceptSummaryRevision(){
  if(isGenerating.value||reviewSaveBusy.value||summaryDocument.value?.status==='completed')return;
  const candidate=pendingSummary.value;
  if(!candidateMatches(candidate,summaryDocument.value?.content?.body||'',refinementContext.value)){pendingSummary.value=null;generationError.value='The current draft changed. Prepare a new preview.';return;}
  isGenerating.value=true;generationError.value='';
  try{
    if(sourceReview.value || !await verifySavedSummary())throw new Error('Resolve the source concern before accepting a revision.');
    if(!candidateMatches(candidate,summaryDocument.value?.content?.body||'',refinementContext.value))throw new Error('The current draft changed. Prepare a new preview.');
    await installSummaryResult(candidate.result,candidate.instruction);
    pendingSummary.value=null;
  }catch(error){generationError.value=error.message||'The revised draft could not be saved. Your current draft remains available.';}
  finally{isGenerating.value=false;}
}
async function installSummaryResult(result,instruction=''){
  clearTimeout(saveTimer);
  const generation={outcome:'ready',id:result.generationId,generatedAt:result.generatedAt,promptVersion:result.promptVersion,model:result.model,
    lens:result.lens||summaryLens.value,window:result.window||summaryWindow.value,sessionCount:result.sessionCount||1,
    reviewCautions:result.reviewCautions||[],qualityReview:result.qualityReview||null,summaryOptions:result.summaryOptions||{},resourceSelection:result.resourceSelection||null,
    reviewRequired:true,reviewedAt:null,refinedWith:instruction||undefined};
  const existing=summaryDocument.value?.content||{};
  const previous=existing.clinicalIntelligence?.history||existing.history||[];
  const snapshot={body:existing.body,richContent:existing.richContent||null,generation:existing.summaryGeneration||existing.clinicalIntelligence?.generation||null,
    sources:summaryDocument.value?.sourceManifest||[],claims:existing.clinicalIntelligence?.claims||[],lastGeneratedBody:existing.clinicalIntelligence?.lastGeneratedBody||'',timestamp:new Date().toISOString(),type:'pre_regeneration'};
  const history=existing.body?[...previous,snapshot].slice(-5):previous;
  const content={...existing,body:result.draft.body,richContent:null,summaryGeneration:generation,
    clinicalIntelligence:{generation,claims:result.claims||[],sources:result.sources||[],history,lastGeneratedBody:result.draft.body},history};
  if(summaryDocument.value){
    summaryDocument.value=await saveClientDocumentDraft(summaryDocument.value,{content,sourceManifest:result.sources});
  }else{
    summaryDocument.value=await createClientDocumentDraft({client:client.value,title:'Session Summary - '+workspaceSession.value.date,documentType:'session_summary',content,sourceManifest:result.sources});
  }
  sourceReview.value=null;summaryReviewError.value='';isEditingSummary.value=false;
  showSummaryOptions.value=prepareRequested.value;showSummaryGuidance.value=false;therapistGuidance.value='';
}

`);
  return s;
});

edit(paths[5],s=>{
  s=one(s,'<script setup>',"<script setup>\nimport SummaryRefinementPanel from './SummaryRefinementPanel.vue'\nimport { candidateMatches, summaryContextKey, summaryBodyToRichContent } from '../../lib/summaryAuthoring.js'");
  s=span(s,'            <div v-if="hasExistingSummary && !finalised"','            <div v-if="summarySources.length"',String.raw`            <SummaryRefinementPanel v-if="hasExistingSummary && !finalised" :body="form.body" :context-key="refinementContext"
              :busy="generatingSummary || saving" :disabled="!!sourceReview || summaryUnsafe || sourceSafetyChecking || loadingEvidence || !anchorSessionId || !!evidenceError || guidanceDictation.busy.value"
              :candidate="pendingSummary" :error="summaryGenerationError ? summaryGenerationMessage : ''"
              @generate="requestSummaryRefinement" @accept="acceptSummaryRevision" @discard="pendingSummary=null" />

`);
  s=span(s,'const SUMMARY_SECTION_HEADINGS = new Set([','const props = defineProps(','');
  s=one(s,"summaryLens = ref(props.document?.content?.clinicalIntelligence?.generation?.lens || 'general')", "summaryLens = ref(props.document?.content?.summaryGeneration?.lens || props.document?.content?.clinicalIntelligence?.generation?.lens || 'general')");
  s=one(s,"summaryWindow = ref(props.document?.content?.clinicalIntelligence?.generation?.window || 'last_three')", "summaryWindow = ref(props.document?.content?.summaryGeneration?.window || props.document?.content?.clinicalIntelligence?.generation?.window || 'last_three')");
  s=span(s,"const refinementInput=ref('')",'const initialBody = ',String.raw`const pendingSummary=ref(null)
const refinementContext=computed(()=>summaryContextKey([props.client.id,currentDocument.value?.id,summaryLens.value,summaryWindow.value,anchorSessionId.value,therapistGuidance.value]))
watch(refinementContext,()=>{pendingSummary.value=null})
const guidanceDictation=useWhisperDictation({onText:text=>{therapistGuidance.value=appendDictation(therapistGuidance.value,text,'\n')}})
`);
  s=span(s,'async function generateSummary(refinement =','async function copySummary()',String.raw`async function requestSummaryRefinement(payload){
  if(payload.baseBody!==form.body || payload.contextKey!==refinementContext.value)return
  await generateSummary(payload)
}
async function generateSummary(payload=null){
  if(generatingSummary.value || saving.value || sourceSafetyChecking.value || finalised.value || loadingEvidence.value || !anchorSessionId.value || evidenceError.value || guidanceDictation.busy.value)return
  const refinement=payload&&typeof payload.instruction==='string'?payload:null
  const baseBody=form.body,contextKey=refinementContext.value
  generatingSummary.value=true;summaryGenerationError.value=false;summaryGenerationMessage.value='Preparing an editable summary...';pendingSummary.value=null
  try{
    const result=await generateClientSessionSummary({clientId:props.client.id,lens:summaryLens.value,window:summaryWindow.value,therapistGuidance:therapistGuidance.value,
      refinementRequest:refinement?.instruction||'',previousDraft:refinement?baseBody.slice(0,10000):'',summaryOptions:refinement?.summaryOptions||{},anchorSessionId:anchorSessionId.value})
    if(contextKey!==refinementContext.value || baseBody!==form.body)throw new Error('The draft or evidence selection changed. Prepare a new preview; nothing has been replaced.')
    if(hasExistingSummary.value){pendingSummary.value={result,baseBody,contextKey,instruction:refinement?.instruction||''};summaryGenerationMessage.value='Revised draft ready to preview. Your current draft is unchanged.';return}
    installSummaryResult(result,refinement?.instruction||'')
  }catch(error){
    if(error.code==='SOURCE_REVIEW_REQUIRED'){sourceReview.value=error.review||{message:error.message,sources:[]};summaryGenerationMessage.value='Source review is required. The existing draft is unchanged.';return}
    summaryGenerationError.value=true;summaryGenerationMessage.value=(error.message||'Generation failed.')+' The current draft is unchanged.'
  }finally{generatingSummary.value=false}
}
function acceptSummaryRevision(){
  if(generatingSummary.value||saving.value||finalised.value||sourceReview.value||sourceSafetyChecking.value)return
  const candidate=pendingSummary.value
  if(!candidateMatches(candidate,form.body,refinementContext.value)){pendingSummary.value=null;summaryGenerationError.value=true;summaryGenerationMessage.value='The current draft changed. Prepare a new preview.';return}
  installSummaryResult(candidate.result,candidate.instruction);pendingSummary.value=null
}
function installSummaryResult(result,instruction=''){
  if(hasExistingSummary.value)previousSummaryVersions.value=[...previousSummaryVersions.value,{body:form.body,richContent:form.richContent,savedAt:new Date().toISOString(),generation:summaryGeneration.value,sources:summarySources.value,claims:summaryClaims.value,lastGeneratedBody:lastGeneratedBody.value}].slice(-5)
  form.body=result.draft.body;form.richContent=summaryBodyToRichContent(result.draft.body);lastGeneratedBody.value=result.draft.body
  summarySources.value=result.sources||[];summaryClaims.value=result.claims||[]
  summaryGeneration.value={outcome:'ready',id:result.generationId,generatedAt:result.generatedAt,promptVersion:result.promptVersion,model:result.model,lens:result.lens,window:result.window,
    anchorSessionId:anchorSessionId.value,usage:result.usage,sample:Boolean(result.sample),refinementRequest:instruction||undefined,summaryOptions:result.summaryOptions||{},
    resourceSelection:result.resourceSelection||null,qualityReview:result.qualityReview||null,reviewRequired:true,reviewedAt:null}
  sourceReview.value=null;summaryGenerationMessage.value=result.sample?'Synthetic example prepared. No AI allowance used.':'Draft ready. Review and edit before saving or finalising.'
}
`);
  s=one(s,'...(clinicalIntelligence?{clinicalIntelligence}:{})','...(clinicalIntelligence?{clinicalIntelligence,summaryGeneration:summaryGeneration.value}:{})');
  s=one(s,"try { const draft = await persistDraft(); currentDocument.value = await finaliseClientDocument(draft);", "try { if(isSessionSummary.value && summaryGeneration.value?.reviewRequired)summaryGeneration.value={...summaryGeneration.value,reviewedAt:new Date().toISOString()}; const draft = await persistDraft(); currentDocument.value = await finaliseClientDocument(draft);");
  s=one(s,'const identity = computed(',"watch(()=>form.body,()=>{if(summaryGeneration.value?.reviewedAt && currentDocument.value?.status!=='completed')summaryGeneration.value={...summaryGeneration.value,reviewedAt:null}})\nconst identity = computed(");
  return s;
});
edit(paths[6],s=>{
  s="import { summaryClinicalEvidence } from '../../src/lib/summaryEvidence.js';\n"+s;
  return one(s,"text:doc.content?.body});","text:summaryClinicalEvidence(doc.content?.body)});");
});
edit(paths[7],s=>{
  s="import { buildTokenLimitParams, buildTemperatureParams } from '../api/_lib/ai-execution.js';\n"+s;
  return one(s,'temperature:0.2,max_tokens:8000','...buildTemperatureParams(model,0.2),...buildTokenLimitParams(model,8000)');
});
for(const [path,text] of files)fs.writeFileSync(path,text);
for(const path of paths.filter(path=>/\.(?:js|mjs)$/.test(path)))execFileSync('node',['--check',path],{stdio:'inherit'});
execFileSync('git',['diff','--check'],{stdio:'inherit'});
console.log('Shared summary source refactor assembled for review and tests.');
