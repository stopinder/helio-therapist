import { describe,it,expect,vi,beforeEach } from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import Composer from '../components/workspace/ClientDocumentComposer.vue';
import {recentSessionFixture,recentSessionProvider,RECENT_CASES} from '../../test/fixtures/recent-session-generation.js';
import {authenticatedFetch} from './api.js';
import handler from '../../api/ai/modality-summary.js';
import {requireAuthenticatedUser} from '../../api/_lib/supabase.js';
import {createTextAIWorkflow} from '../../api/_lib/ai-execution.js';
import {loadModalitySources} from '../../api/_lib/modality-intelligence/sources.js';
import {verifySummaryResource} from '../../api/_lib/summary-resource-check.js';
import {packFixture,evidenceFixture,passageEvidenceFixture,formulationFixture,compositionFixture,completed,SOURCE_ID} from '../../test/fixtures/modality-intelligence.js';

vi.mock('./api.js',()=>({authenticatedFetch:vi.fn()}));
vi.mock('./documentProfile.js',()=>({loadDocumentProfile:vi.fn(async()=>({})),profileDisplay:()=>({heading:'Synthetic practice',footer:'Helios'})}));
vi.mock('../../api/_lib/supabase.js',()=>({requireAuthenticatedUser:vi.fn()}));
vi.mock('../../api/_lib/ai-execution.js',()=>({createTextAIWorkflow:vi.fn(),AI_FEATURES:{CLIENT_SESSION_SUMMARY:'client.session_summary'}}));
vi.mock('../../api/_lib/summary-resource-check.js',()=>({verifySummaryResource:vi.fn(async()=>null)}));
const user='ffffffff-ffff-4fff-8fff-ffffffffffff',clientId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sessionId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',transcriptId=SOURCE_ID.slice('transcript:'.length);
let tables,queries,db,run,requests;
function query(table) {
  const filters=[],q={table,filters,sort:null,n:Infinity};queries.push(q);
  const builder={select:vi.fn(()=>builder),eq:(key,value)=>{filters.push(['eq',key,value]);return builder},is:(key,value)=>{filters.push(['is',key,value]);return builder},in:(key,value)=>{filters.push(['in',key,value]);return builder},not:(key,op,value)=>{filters.push(['not',key,value]);return builder},lte:(key,value)=>{filters.push(['lte',key,value]);return builder},order:(key,options)=>{q.sort=[key,options.ascending];return builder},limit:n=>{q.n=n;return builder},
    then:(resolve,reject)=>Promise.resolve({data:result(),error:null}).then(resolve,reject),maybeSingle:async()=>({data:result()[0]||null,error:null})};
  function result(){let rows=(tables[table]||[]).filter(row=>filters.every(([op,key,value])=>op==='eq'?row[key]===value:op==='is'?(row[key]??null)===value:op==='in'?value.includes(row[key]):op==='not'?(row[key]??null)!==value:op==='lte'?row[key]<=value:true));if(q.sort)rows=[...rows].sort((a,b)=>String(a[q.sort[0]]).localeCompare(String(b[q.sort[0]]))*(q.sort[1]?1:-1));return rows.slice(0,q.n);}
  return builder;
}
async function invoke(body,method='POST') {const res={statusCode:200,setHeader:vi.fn(),status(code){this.statusCode=code;return this},json(payload){this.payload=payload;return this}};await handler({method,body},res);return res;}
beforeEach(()=>{
 vi.clearAllMocks();queries=[];requests=[];
 tables={clients:[{id:clientId,user_id:user,display_name:'Synthetic client',reference:'TEST',archived:false}],sessions:[{id:sessionId,user_id:user,client_id:clientId,occurred_at:'2026-01-01T10:00:00Z'}],zoom_transcripts:[{id:transcriptId,therapist_user_id:user,client_id:clientId,session_ref:sessionId,original_transcript:packFixture().sources[0].text,zoom_generated_summary:'Zoom-only private test phrase.',source_version:1,source_review:{state:'unreviewed'},received_at:'2026-01-01T11:00:00Z',deleted_at:null}],session_capture_drafts:[],documents:[],client_care_items:[]};
 db={from:vi.fn(query),rpc:vi.fn(async()=>({data:false,error:null}))};requireAuthenticatedUser.mockResolvedValue({supabase:db,user:{id:user}});
 let index=0;run=vi.fn(async req=>{requests.push(req);return completed(index++===0?passageEvidenceFixture(req):index===2?formulationFixture('gentle_cbt'):compositionFixture('gentle_cbt'));});createTextAIWorkflow.mockResolvedValue(run);
});
describe('source-aware modality gateway',()=>{
 const base={clientId,sessionId,transcriptId,lens:'gentle_cbt'};
 for(const scope of ['encounter','longitudinal'])it(`${scope} uses the same verified three-stage pipeline`,async()=>{
  const res=await invoke({...base,scope});expect(res.statusCode).toBe(200);expect(res.payload.data.mode).toBe('client_summary');expect(run).toHaveBeenCalledTimes(3);expect(createTextAIWorkflow).toHaveBeenCalledTimes(1);expect(db.from).not.toHaveBeenCalledWith('private_reflections');expect(res.payload.data.reviewRequired).toBe(true);
 });
 it('reads Zoom summaries on explicit request without a model call or credit reservation',async()=>{
  const res=await invoke({...base,action:'sources'});expect(res.statusCode).toBe(200);expect(res.payload.data.zoomSummaries[0].text).toBe('Zoom-only private test phrase.');expect(createTextAIWorkflow).not.toHaveBeenCalled();expect(run).not.toHaveBeenCalled();
 });
 it('offers raw transcript sessions in the longitudinal picker even without captures',async()=>{
  const res=await invoke({clientId,scope:'longitudinal',action:'availability'});expect(res.payload.data.availableSessions[0].sessionId).toBe(sessionId);expect(createTextAIWorkflow).not.toHaveBeenCalled();
 });
 it('excludes Zoom text by default and includes it only as a separately typed secondary source',async()=>{
  await invoke(base);expect(JSON.stringify(requests)).not.toContain('Zoom-only private test phrase.');
  requests.length=0;run.mockImplementationOnce(async req=>{requests.push(req);return completed(passageEvidenceFixture(req))}).mockImplementationOnce(async()=>completed(formulationFixture('gentle_cbt'))).mockImplementationOnce(async()=>completed(compositionFixture('gentle_cbt')));
  const res=await invoke({...base,intelligenceOptions:{includeZoomSummary:true}});expect(res.statusCode).toBe(200);const input=JSON.parse(requests[0].messages[1].content);const zoom=input.sources.find(s=>s.type==='zoom_summary');expect(zoom.secondary).toBe(true);expect(zoom.encounterId).toBe(sessionId);expect(zoom.id).not.toBe(SOURCE_ID);
 });
 it('ownership filters bind every clinical table before generation',async()=>{
  await invoke(base);
  for(const q of queries.filter(q=>['sessions','zoom_transcripts','documents','client_care_items','session_capture_drafts'].includes(q.table))){expect(q.filters).toContainEqual(['eq',q.table==='zoom_transcripts'?'therapist_user_id':q.table==='client_care_items'?'therapist_id':'user_id',user]);expect(q.filters).toContainEqual(['eq','client_id',clientId]);}
 });
 it('rejects a client or transcript from another tenant without invoking AI',async()=>{
  tables.clients[0].user_id='someone-else';const res=await invoke(base);expect(res.statusCode).toBe(404);expect(createTextAIWorkflow).not.toHaveBeenCalled();
 });
 it('rejects reassigned transcript before invoking the model',async()=>{
  tables.zoom_transcripts[0].client_id='another-client';const res=await invoke(base);expect(res.statusCode).toBe(404);expect(createTextAIWorkflow).not.toHaveBeenCalled();
 });
 it('source review remains blocking even when Zoom inclusion is off',async()=>{
  tables.zoom_transcripts[0].source_review={state:'needs_review',message:'Review source assignment.'};const res=await invoke(base);expect(res.payload.data.outcome).toBe('needs_review');expect(createTextAIWorkflow).not.toHaveBeenCalled();
 });
 it('rejects changed versions after generation, preserving the previous draft',async()=>{
  let index=0;run.mockImplementation(async req=>{const value=index++===0?passageEvidenceFixture(req):index===2?formulationFixture('gentle_cbt'):compositionFixture('gentle_cbt');if(index===3)tables.zoom_transcripts[0].source_version=2;return completed(value);});
  const res=await invoke(base);expect(res.statusCode).toBe(409);expect(res.payload.error.code).toBe('SOURCE_CHANGED');expect(res.payload.data).toBeUndefined();
 });
 it('does not send private reflection, risk or supervision care items to any stage',async()=>{
  tables.client_care_items=[{id:'secret',therapist_id:user,client_id:clientId,kind:'supervision',status:'current',body:'THERAPIST PRIVATE SPECULATION'}];await invoke(base);expect(JSON.stringify(requests)).not.toContain('THERAPIST PRIVATE SPECULATION');
 });
 it('therapist-only mode returns no client body and never invokes persistence',async()=>{
  const res=await invoke({...base,intelligenceOptions:{mode:'therapist_formulation'}});expect(res.statusCode).toBe(200);expect(res.payload.data.formulation.visibility).toBe('therapist_only');expect(res.payload.data.draft).toBeUndefined();expect(run).toHaveBeenCalledTimes(2);expect(queries.some(q=>q.table==='documents')).toBe(true);
 });
 it('never charges for unverified external resources',async()=>{
  verifySummaryResource.mockRejectedValueOnce(Object.assign(new Error('Resource is not verified.'),{code:'RESOURCE_NOT_VERIFIED',status:422}));const res=await invoke(base);expect(res.statusCode).toBe(422);expect(createTextAIWorkflow).not.toHaveBeenCalled();
 });
 it('default sample pathway is explicitly unavailable rather than pretending fixtures are model output',async()=>{
  db.rpc.mockResolvedValue({data:true,error:null});const res=await invoke(base);expect(res.payload.error.code).toBe('SAMPLE_MODALITY_PREVIEW_UNAVAILABLE');expect(createTextAIWorkflow).not.toHaveBeenCalled();
 });
 it('quota failures precede every model request',async()=>{
  createTextAIWorkflow.mockRejectedValueOnce(Object.assign(new Error('Existing allowance exceeded.'),{code:'FREE_AI_INPUT_TOO_LARGE',status:413}));const res=await invoke(base);expect(res.statusCode).toBe(413);expect(run).not.toHaveBeenCalled();
 });
 it('does not count one derivative summary as independent evidence for multiple encounters',async()=>{
  const olderId='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  tables.sessions.push({...tables.sessions[0],id:olderId,occurred_at:'2025-12-20T10:00:00Z'});
  tables.zoom_transcripts=[];
  tables.documents=[{id:'doc-one',user_id:user,client_id:clientId,document_type:'session_summary',content:{body:'An earlier combined summary of the work.'},source_manifest:[{sessionId},{sessionId:olderId}],updated_at:'2026-01-02'}];
  const pack=await loadModalitySources(db,user,{clientId,anchorSessionId:sessionId,window:'last_three',intelligenceOptions:{includeZoomSummary:false},therapistGuidance:'',refinementRequest:''},{forViewing:true});
  expect(pack.sources.map(source=>source.id)).toEqual(['document:doc-one']);
  expect(pack.manifest.filter(source=>source.documentId==='doc-one')).toHaveLength(1);
  expect(pack.sessionCount).toBe(1);
 });
 it('source viewer shows only the chosen transcript note, not an unrelated duplicate import',async()=>{
  tables.zoom_transcripts.unshift({...tables.zoom_transcripts[0],id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',zoom_generated_summary:'Other import note',received_at:'2026-01-02'});const res=await invoke({...base,action:'sources'});expect(res.payload.data.zoomSummaries.map(note=>note.id)).toEqual([transcriptId]);
 });
 it('recent sessions above the former cap reach every extraction batch using one allowance reservation',async()=>{
  const seed=tables.sessions[0],transcript=tables.zoom_transcripts[0];
  tables.sessions=Array.from({length:3},(_,i)=>({...seed,id:i?`0000000${i}-bbbb-4bbb-8bbb-bbbbbbbbbbbb`:sessionId,occurred_at:`2025-12-${30-i}T10:00:00Z`}));
  tables.zoom_transcripts=tables.sessions.map((session,i)=>({...transcript,id:i?`0000000${i}-cccc-4ccc-8ccc-cccccccccccc`:transcriptId,session_ref:session.id,original_transcript:('A synthetic session observation. ').repeat(2800)+`Final marker ${i}.`}));
  run.mockImplementation(async req=>{
    requests.push(req);const input=JSON.parse(req.messages[1].content),schema=req.responseFormat.json_schema.schema;
    if(schema.properties.observations){const v=evidenceFixture();v.observations[0].citations=[{passageId:input.sources[0].passages.at(-1).id}];return completed(v);}
    if(schema.properties.priorities&&!schema.properties.fields)return completed({priorities:[{observationIds:['e1'],importance:'Observed clinical priority.'}]});
    return completed(schema.properties.fields?formulationFixture('gentle_cbt'):compositionFixture('gentle_cbt'));
  });
  const res=await invoke({...base,window:'recent'});
  expect(res.statusCode).toBe(200);expect(res.payload.data.architecture.evidenceCoverage.batchCount).toBe(3);expect(res.payload.data.sessionCount).toBe(3);
  expect(createTextAIWorkflow).toHaveBeenCalledTimes(1);expect(createTextAIWorkflow.mock.calls[0][0].maxCalls).toBe(7);
  const input=requests.filter(req=>req.responseFormat.json_schema.schema.properties.observations).map(req=>req.messages[1].content).join('');
  for(let i=0;i<3;i++)expect(input).toContain(`Final marker ${i}.`);
  expect(JSON.stringify(requests)).not.toContain('Zoom-only private test phrase.');
 });
 it('over-cap selections fail before any allowance reservation and leave source viewing available',async()=>{
  tables.zoom_transcripts[0].original_transcript='x'.repeat(600001);
  const res=await invoke(base);expect(res.statusCode).toBe(413);expect(res.payload.error.code).toBe('EVIDENCE_WINDOW_TOO_LARGE');expect(createTextAIWorkflow).not.toHaveBeenCalled();expect(run).not.toHaveBeenCalled();
  const viewer=await invoke({...base,action:'sources'});expect(viewer.statusCode).toBe(200);expect(viewer.payload.data.zoomSummaries).toHaveLength(1);
 });

});

// Real composer -> clientDocuments -> request projection -> real API handler ->
// real source selection, batching, passage checks, formulation and composition.
// Only authentication/database and the external provider are controlled fixtures.
describe('complete recent-session generation and recovery',()=>{
 const editor={props:['modelValue'],emits:['update:modelValue'],template:'<textarea data-testid="integration-editor" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'};
 async function openComposer(){
   const fixture=recentSessionFixture();tables.sessions=fixture.sessions;tables.zoom_transcripts=fixture.transcripts;
   authenticatedFetch.mockImplementation(async(url,options)=>{
     expect(url).toBe('/api/ai/modality-summary');
     const response=await invoke(JSON.parse(options.body));
     return {ok:response.statusCode<400,status:response.statusCode,json:async()=>response.payload};
   });
   run.mockImplementation(recentSessionProvider({requests}));
   const wrapper=mount(Composer,{props:{client:{id:clientId,display_name:'Synthetic couple'},initialDocumentType:'session_summary'},global:{stubs:{teleport:true,RichDocumentEditor:editor,HelpLink:true}}});
   await flushPromises();
   const select=wrapper.findAll('select').find(el=>el.find('option[value="gentle_cbt"]').exists());
   await select.setValue('gentle_cbt');await flushPromises();
   return wrapper;
 }
 it('renders an editable supported draft for all three long recent sessions without saving',async()=>{
   const wrapper=await openComposer();
   try{
     const generate=wrapper.findAll('button').find(b=>b.text()==='Generate client summary');
     expect(generate.element.disabled).toBe(false);await generate.trigger('click');await flushPromises();
     const body=wrapper.get('[data-testid="integration-editor"]').element.value;
     for(const item of RECENT_CASES)expect(body).toContain(item.sentence);
     expect(body).toContain('Understanding the pattern');
     expect(createTextAIWorkflow).toHaveBeenCalledTimes(1);
     const request=authenticatedFetch.mock.calls.map(([,options])=>JSON.parse(options.body)).find(req=>req.action==='generate');
     expect(request).toMatchObject({scope:'longitudinal',window:'last_three',anchorSessionId:tables.sessions[0].id});
     expect(wrapper.text()).toContain('Draft ready. Review and edit before saving or finalising.');
     expect(wrapper.emitted('saved')).toBeUndefined();
     expect(queries.filter(q=>q.table==='zoom_transcripts').length).toBeGreaterThan(1);
     const evidenceCalls=requests.filter(req=>req.responseFormat.json_schema.schema.properties.observations);
     expect(evidenceCalls).toHaveLength(3);
     for(const transcript of tables.zoom_transcripts){
       const source=evidenceCalls.flatMap(req=>JSON.parse(req.messages[1].content).sources).find(item=>item.id==='transcript:'+transcript.id);
       expect(source.passages.map(p=>p.text).join('')).toBe(transcript.original_transcript.trim()); // Loader trims only outer whitespace; internal text is exact.
     }
   }finally{wrapper.unmount();}
 });
 it('keeps the editable draft on invalid references, then offers a reviewable replacement after explicit retry',async()=>{
   const wrapper=await openComposer();
   try{
     const button=text=>wrapper.findAll('button').find(b=>b.text()===text);
     await button('Generate client summary').trigger('click');await flushPromises();
     const previous=wrapper.get('[data-testid="integration-editor"]').element.value;
     run.mockImplementation(recentSessionProvider({fault:'invalid_reference',requests}));
     await button('Regenerate client summary').trigger('click');await flushPromises();
     expect(wrapper.get('[data-testid="summary-evidence-limit"]').text()).toMatch(/unchanged/);
     expect(wrapper.get('[data-testid="integration-editor"]').element.value).toBe(previous);
     expect(wrapper.emitted('saved')).toBeUndefined();
     run.mockImplementation(recentSessionProvider({requests}));
     await button('Try again').trigger('click');await flushPromises();
     expect(wrapper.find('[data-testid="summary-evidence-limit"]').exists()).toBe(false);
     expect(wrapper.text()).toContain('Revised draft ready to preview. Your current draft is unchanged.');
     expect(wrapper.get('[data-testid="integration-editor"]').element.value).toBe(previous);
     expect(wrapper.emitted('saved')).toBeUndefined();
   }finally{wrapper.unmount();}
 });
 for(const fault of ['needs_review','truncated'])it(`never renders a partial draft when a batch reports ${fault}`,async()=>{
   const fixture=recentSessionFixture();tables.sessions=fixture.sessions;tables.zoom_transcripts=fixture.transcripts;
   run.mockImplementation(recentSessionProvider({requests,fault}));
   const res=await invoke({clientId,anchorSessionId:fixture.sessions[0].id,scope:'longitudinal',window:'last_three',lens:'gentle_cbt'});
   expect(res.payload.data?.draft).toBeUndefined();
   if(fault==='needs_review')expect(res.payload.data.outcome).toBe('needs_review');
   else expect(res.statusCode).toBe(502);
   expect(requests.every(req=>req.responseFormat.json_schema.schema.properties.observations)).toBe(true);
 });
});
