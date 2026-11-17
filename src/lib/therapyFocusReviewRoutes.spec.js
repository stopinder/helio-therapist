import { beforeEach, describe, it, expect, vi } from 'vitest';
vi.mock('../../api/_lib/supabase.js',()=>({requireAuthenticatedUser:vi.fn()}));
vi.mock('../../api/_lib/ai-execution.js',()=>({AI_FEATURES:{CARE_SUGGESTIONS:'care.suggestions'},runTextAI:vi.fn()}));
import { requireAuthenticatedUser } from '../../api/_lib/supabase.js';
import { runTextAI } from '../../api/_lib/ai-execution.js';
import handler from '../../api/ai/care-suggestions.js';
const clientId='11111111-1111-4111-8111-111111111111',userId='22222222-2222-4222-8222-222222222222';
let tables, finish, output;
const sessionId=i=>String(i).repeat(8)+'-3333-4333-8333-'+String(i).repeat(12);
function database(){return {from(table){
 const filters=[];let from=0,to=Infinity;
 const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},neq(k,v){filters.push(r=>r[k]!==v);return q},is(k,v){filters.push(r=>r[k]==v);return q},not(k,op,v){filters.push(r=>r[k]!==v);return q},order(){return q},range(a,b){from=a;to=b;return q},limit(n){to=n-1;return q},
 result(){return structuredClone((tables[table]||[]).filter(r=>filters.every(f=>f(r))).slice(from,to+1))},async maybeSingle(){return {data:q.result()[0]||null,error:null}},then(resolve,reject){return Promise.resolve({data:q.result(),error:null}).then(resolve,reject)}};return q;
}}}
async function invoke(body={}){const res={code:200,payload:null,setHeader:vi.fn(),status(n){this.code=n;return this},json(p){this.payload=p;return this}};await handler({method:'POST',body:{clientId,sourceMode:'history',window:'history',lensId:'clinical',reviewGoal:'review_updates',...body}},res);return res}
beforeEach(()=>{
 vi.clearAllMocks();finish='stop';output={suggestions:[{kind:'shared_understanding',body:'A provisional understanding based on a fictional session.',sourceIds:['session:'+sessionId(1)],evidenceStrength:'current_observation',action:'add',basis:'clinical_history',epistemic:'clinical_inference',targetItemId:null,reason:'Supported by the supplied source.'}]};
 tables={clients:[{id:clientId,user_id:userId}],client_care_items:[],sessions:[],session_capture_drafts:[],documents:[],zoom_transcripts:[]};
 for(let i=1;i<=9;i++){
  const date='2026-10-'+String(i).padStart(2,'0');
  tables.sessions.push({id:sessionId(i),client_id:clientId,user_id:userId,occurred_at:date});
  tables.session_capture_drafts.push({session_id:sessionId(i),client_id:clientId,user_id:userId,status:'reviewed',reviewed_at:date,sessions:{occurred_at:date},content:{sessionThemes:'Fictional account of difficulty staying connected during disagreement.'}});
 }
 requireAuthenticatedUser.mockResolvedValue({supabase:database(),user:{id:userId}});
 runTextAI.mockImplementation(async()=>({completion:{choices:[{finish_reason:finish,message:{content:JSON.stringify(output)}}]}}));
});
describe('Therapy Focus history API',()=>{
 it('builds an initial Clinical Focus from nine eligible sessions even if the caller requests updates',async()=>{
  const r=await invoke();expect(r.code).toBe(200);expect(r.payload.reviewGoal).toBe('fill_empty');expect(r.payload.coverage.selectedSessions).toBe(9);expect(r.payload.suggestions).toHaveLength(1);
  const request=runTextAI.mock.calls[0][0];expect(request.messages[1].content).toContain('establish provisional starting points');expect(request.messages[1].content).toContain('formal, provisional clinical formulation');
 });
 it('constrains generation to the actual kinds, evidence and update targets',async()=>{
  await invoke({lensId:'internal_family_systems'});
  const request=runTextAI.mock.calls[0][0];
  expect(request.messages[1].content).toContain('Use IFS distinctions');expect(request.responseFormat.type).toBe('json_schema');expect(request.responseFormat.json_schema.strict).toBe(true);
  const item=request.responseFormat.json_schema.schema.properties.suggestions.items;
  expect(item.additionalProperties).toBe(false);expect(item.required).toEqual(Object.keys(item.properties));
  expect(item.properties.kind.enum).toContain('shared_understanding');expect(item.properties.sourceIds.items.enum).toHaveLength(9);
  expect(item.properties.sourceIds.items.enum).toContain('session:'+sessionId(1));expect(item.properties.targetItemId.enum).toEqual([null]);
  expect(item.properties.action.enum).toEqual(['add']);expect(request.timeout).toBe(45000);expect(request.maxRetries).toBe(0);
 });
 it('provides content-free diagnostics when rejecting unverified evidence',async()=>{
  const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
  output.suggestions[0].sourceIds=['session:invented'];const r=await invoke();
  expect(r.payload.error.detail).toBe('INVALID_SOURCE_REFERENCE');expect(r.payload.error.requestId).toBeTruthy();
  expect(JSON.stringify(warning.mock.calls)).not.toContain(output.suggestions[0].body);warning.mockRestore();
 });
 it('can establish a starting view from nine transcript-backed draft summaries when no captures exist',async()=>{
  tables.session_capture_drafts=[];
  tables.documents=tables.sessions.map((session,index)=>({id:'draft-'+index,client_id:clientId,user_id:userId,document_type:'session_summary',status:'draft',archived_at:null,updated_at:session.occurred_at,content:{body:'Fictional draft summary: the participants described difficulty staying connected during disagreements and a recent instance of asking for specific help.'},source_manifest:[{kind:'zoom_transcript',id:'transcript-'+index,sessionId:session.id}]}));
  tables.zoom_transcripts=tables.sessions.map((session,index)=>({id:'transcript-'+index,client_id:clientId,therapist_user_id:userId,session_ref:session.id,deleted_at:null}));
  const r=await invoke();expect(r.code).toBe(200);expect(r.payload.reviewGoal).toBe('fill_empty');expect(r.payload.sources).toHaveLength(9);expect(r.payload.sources.every(s=>s.reviewStatus==='draft')).toBe(true);expect(r.payload.suggestions).toHaveLength(1);
 });
 it('reports invalid source references as a failed review rather than a successful empty result',async()=>{
  output.suggestions[0].sourceIds=['session:invented'];const r=await invoke();expect(r.code).toBe(502);expect(r.payload.success).toBe(false);expect(r.payload.suggestions).toBeUndefined();
 });
 it('rejects invalid categories rather than treating them as no changes',async()=>{
  output.suggestions[0].kind='invented';const r=await invoke();expect(r.code).toBe(502);
 });
 it('rejects truncated model output even if its partial content happens to parse',async()=>{
  finish='length';const r=await invoke();expect(r.code).toBe(502);expect(r.payload.error.code).toBe('THERAPY_FOCUS_REVIEW_INCOMPLETE');
 });
 it('preserves a genuine supported-empty result without inventing starting points',async()=>{
  output.suggestions=[];const r=await invoke();expect(r.code).toBe(200);expect(r.payload.suggestions).toEqual([]);expect(r.payload.reviewGoal).toBe('fill_empty');
 });
 it('keeps update mode when existing therapist material is present, including legacy kinds',async()=>{
  tables.client_care_items.push({id:'old',client_id:clientId,therapist_id:userId,kind:'narrative',body:'Existing therapist formulation',status:'current'});
  const r=await invoke();expect(r.code).toBe(200);expect(r.payload.reviewGoal).toBe('review_updates');expect(runTextAI.mock.calls[0][0].messages[1].content).toContain('Existing therapist formulation');
 });
});
