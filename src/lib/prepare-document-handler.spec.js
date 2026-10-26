import { beforeEach, describe, it, expect, vi } from 'vitest'
const state=vi.hoisted(()=>({user:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',db:null,ai:vi.fn()}))
vi.mock('../../api/_lib/supabase.js',()=>({
  requireAuthenticatedUser:async()=>{if(!state.user)throw Object.assign(new Error('Auth'),{status:401});return {user:{id:state.user}}},
  getSupabaseUserClient:()=>state.db
}))
vi.mock('../../api/_lib/ai-execution.js',()=>({AI_FEATURES:{CLIENT_SESSION_SUMMARY:'client.session_summary'},runTextAI:(o)=>state.ai(o)}))
import { handlePreparedDocument } from '../../api/_lib/prepare-document-handler.js'
import { defaultPreparation } from './documentPreparation.js'
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',client='cccccccc-cccc-4ccc-cccc-cccccccccccc'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
function database(){
  const calls=[]
  const tables={clients:[{id:client,user_id:owner}],sessions:[1,2,3,4].map(n=>({id:id(n),client_id:client,user_id:owner,occurred_at:`2026-10-0${n}T10:00:00Z`})),
    session_capture_drafts:[1,2,3].map(n=>({session_id:id(n),client_id:client,user_id:owner,status:'reviewed',reviewed_at:'2026-10-05T10:00:00Z',version:n,
      content:{sessionThemes:`Distinct recorded session material ${n}`,riskSafeguarding:'PRIVATE RISK FIELD',supervision:'DO NOT READ'}})),
    zoom_transcripts:[{id:id(8),session_ref:id(4),client_id:client,therapist_user_id:owner,source:'zoom',deleted_at:null,received_at:'2026-10-04T11:00:00Z',original_transcript:'An original account of the encounter.',zoom_generated_summary:'A derivative account of that same encounter.'}],
    client_care_items:[{id:id(10),client_id:client,therapist_id:owner,status:'current',kind:'current_focus',body:'Current agreed focus',updated_at:'2026-10-05T10:00:00Z'}]}
  return {tables,calls,from(table){
    if(!tables[table])throw Error('Unexpected table '+table)
    const filters=[],orders=[];let cap=Infinity
    const q={select(fields){calls.push({table,fields,filters});return q},eq(k,v){filters.push(r=>r[k]===v);return q},
      is(k,v){filters.push(r=>r[k]===v);return q},in(k,a){filters.push(r=>a.includes(r[k]));return q},order(k,o={}){orders.push([k,o.ascending!==false]);return q},limit(n){cap=n;return q},
      result(){let data=tables[table].filter(r=>filters.every(f=>f(r)));for(const[k,asc]of[...orders].reverse())data=[...data].sort((a,b)=>String(a[k]||'').localeCompare(String(b[k]||''))*(asc?1:-1));return {data:data.slice(0,cap),error:null}},
      maybeSingle(){const r=q.result();return Promise.resolve({...r,data:r.data[0]||null})},then(resolve,reject){return Promise.resolve(q.result()).then(resolve,reject)}}
    return q
  }}
}
const input=(o={})=>({...defaultPreparation(),clientId:client,anchorSessionId:id(3),...o})
async function call(body,method='POST'){
 const r={statusCode:200,setHeader:vi.fn(),status(n){this.statusCode=n;return this},json(data){this.data=data;return this}}
 await handlePreparedDocument({method,body,headers:{}},r);return r
}
async function generate(options=input()){
 const preview=await call({...options,preview:true});expect(preview.statusCode).toBe(200)
 return call({...options,sourceVersion:preview.data.data.sourceVersion})
}
describe('shared document preparation handler',()=>{
 beforeEach(()=>{
  vi.clearAllMocks();state.user=owner;state.db=database()
  state.ai.mockImplementation(async request=>{
    const data=JSON.parse(request.messages[1].content)
    const section=data.documentPurpose==='recent_review'?'current':'focus'
    return {model:'test-model',completion:{choices:[{message:{content:JSON.stringify({claims:[{section,text:'The selected source describes the work discussed during this particular encounter.',sourceIds:[data.sources[0].id],evidenceStrength:'current_observation'}]})}}],usage:{prompt_tokens:100,completion_tokens:50}}}
  })
 })
 it('anonymous users cannot inspect sources or spend an AI action',async()=>{
  state.user=null;expect((await call(input({preview:true}))).statusCode).toBe(401);expect(state.ai).not.toHaveBeenCalled();expect(state.db.calls).toHaveLength(0)
 })
 it('another therapist cannot preview or generate this client material',async()=>{
  state.user=other;expect((await call(input({preview:true}))).statusCode).toBe(404);expect(state.ai).not.toHaveBeenCalled()
 })
 it('catalogue and source preview contain metadata only and use no AI call',async()=>{
  const list=await call(input({catalogue:true}));expect(list.data.data.availableSessions).toHaveLength(4)
  const preview=await call(input({preview:true}));expect(preview.data.data.sourceVersion).toMatch(/^[a-f0-9]{64}$/)
  expect(JSON.stringify(preview.data)).not.toContain('Distinct recorded');expect(state.ai).not.toHaveBeenCalled()
 })
 it('preview must be accepted again if content or any option changes',async()=>{
  const preview=await call(input({preview:true}));state.db.tables.session_capture_drafts[2].content.sessionThemes='Edited capture'
  const stale=await call(input({sourceVersion:preview.data.data.sourceVersion}));expect(stale.statusCode).toBe(409);expect(state.ai).not.toHaveBeenCalled()
 })
 it('a valid generation calls the existing metered feature exactly once',async()=>{
  const result=await generate();expect(result.statusCode).toBe(200);expect(state.ai).toHaveBeenCalledTimes(1)
  const args=state.ai.mock.calls[0][0];expect(args.feature).toBe('client.session_summary');expect(args.userId).toBe(owner)
  expect(args).not.toHaveProperty('skipBudget');expect(args.timeout).toBe(60000)
  expect(result.data.data.sources[0].occurredAt).toBe('2026-10-03T10:00:00Z')
  expect(result.data.data.sources[0].url).toBe(`/clients/${client}/sessions/${id(3)}`)
 })
 it('client-facing captures exclude risk and private fields; therapist captures retain recorded safety',async()=>{
  await generate();expect(JSON.stringify(state.ai.mock.calls[0][0].messages)).not.toContain('PRIVATE RISK FIELD')
  state.ai.mockClear();await generate(input({audience:'therapist'}))
  expect(JSON.stringify(state.ai.mock.calls[0][0].messages)).toContain('PRIVATE RISK FIELD')
  expect(JSON.stringify(state.ai.mock.calls[0][0].messages)).not.toContain('DO NOT READ')
 })
 it('original transcript wins over the derivative and remains explicitly unreviewed',async()=>{
  const result=await generate(input({anchorSessionId:id(4),transcriptId:id(8)}));expect(result.statusCode).toBe(200)
  const data=JSON.parse(state.ai.mock.calls[0][0].messages[1].content);expect(data.sources).toHaveLength(1)
  expect(data.sources[0].kind).toBe('original_transcript');expect(data.sources[0].reviewedAt).toBeNull();expect(data.sources[0].content).not.toContain('derivative')
 })
 it('a transcript from another encounter cannot be used or silently substituted',async()=>{
  expect((await call(input({transcriptId:id(8),preview:true}))).statusCode).toBe(409);expect(state.ai).not.toHaveBeenCalled()
 })
 it('soft-deleted transcripts cannot be listed, selected or charged for',async()=>{
  state.db.tables.zoom_transcripts[0].deleted_at='2026-10-06T10:00:00Z'
  const list=await call(input({catalogue:true}));expect(list.data.data.availableSessions.map(s=>s.sessionId)).not.toContain(id(4))
  expect((await call(input({anchorSessionId:id(4),transcriptId:id(8),preview:true}))).statusCode).toBe(409)
  expect(state.ai).not.toHaveBeenCalled()
 })
 it('multi-session reviews exclude unreviewed and future sources',async()=>{
  const result=await generate(input({...defaultPreparation('recent_review'),anchorSessionId:id(3)}))
  expect(result.data.data.sessionCount).toBe(3)
  expect(result.data.data.selectedSessionIds).toEqual([id(3),id(2),id(1)])
  expect(state.db.calls.every(c=>!c.table.includes('reflection')&&!c.table.includes('supervision'))).toBe(true)
 })
 it('an insufficient review fails before spending; it never invents a third session',async()=>{
  expect((await call(input({...defaultPreparation('recent_review'),anchorSessionId:id(1),preview:true}))).statusCode).toBe(409)
  expect(state.ai).not.toHaveBeenCalled()
 })
 it('Care is opt-in and is labelled current context, not historical evidence',async()=>{
  await generate();expect(state.db.calls.some(c=>c.table==='client_care_items')).toBe(false)
  const result=await generate(input({includeCare:true}));expect(result.data.data.sources.some(s=>s.kind==='accepted_care')).toBe(true)
  expect(result.data.data.warnings.join(' ')).toContain('not a snapshot')
 })
 it('invalid source references reject generated prose without persisting it',async()=>{
  state.ai.mockResolvedValue({model:'test',completion:{choices:[{message:{content:JSON.stringify({claims:[{section:'focus',text:'An invented interpretation that is not supported by an actual selected source.',sourceIds:['invented'],evidenceStrength:'current_observation'}]})}}]}})
  expect((await generate()).statusCode).toBe(502)
  expect(state.db.calls.some(c=>c.table==='documents')).toBe(false)
 })
 it('quota errors preserve the existing user-facing allowance message',async()=>{
  state.ai.mockRejectedValue(Object.assign(new Error('Your five Free AI actions are used.'),{code:'FREE_AI_MONTHLY_LIMIT',status:429}))
  const response=await generate();expect(response.statusCode).toBe(429);expect(response.data.error.message).toContain('five Free')
 })
})
