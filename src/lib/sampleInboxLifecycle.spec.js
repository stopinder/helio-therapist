import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import transcriptsHandler from '../../api/zoom/transcripts.js'
import sampleHandler from '../../api/sample-workspace.js'
import { visibleInboxTranscripts } from '../../api/_lib/sample-transcript-visibility.js'
const mocks=vi.hoisted(()=>({context:vi.fn(),seedRpc:vi.fn()}))
vi.mock('../../api/_lib/supabase.js',()=>({requireAuthenticatedUser:mocks.context,getSupabaseUserClient:()=>({rpc:mocks.seedRpc})}))
const source={id:'demo',therapist_user_id:'owner',source:'sample_zoom_my_notes',zoom_note_id:'SAMPLE-NOTE-ALEX-INBOX-004',client_id:null,session_ref:null,status:'unassigned',deleted_at:null,original_transcript:'Synthetic original'}
const alex={id:'sample-alex',user_id:'owner',reference:'SAMPLE-001',archived:true}
function database({rows=[source],clients=[alex],verified=true}={}) {
 const calls=[]
 const db={calls,from:vi.fn(table=>{
  const filters=[];let single=false
  const call={table,filters:[]};calls.push(call)
  const query={
   select(){return query},order(){return query},
   eq(key,value){call.filters.push([key,value]);filters.push(row=>row[key]===value);return query},
   is(key,value){filters.push(row=>value===null?row[key]==null:row[key]===value);return query},
   in(key,values){filters.push(row=>values.includes(row[key]));return query},
   maybeSingle(){single=true;return query},
   then(resolve,reject){const data=(table==='clients'?clients:rows).filter(row=>filters.every(fn=>fn(row)));return Promise.resolve({data:single?(data[0]||null):data,error:null}).then(resolve,reject)}
  };return query
 }),rpc:vi.fn(async(name,args)=>{
  if(name==='is_sample_workspace')return {data:true,error:null}
  if(name==='is_sample_client')return {data:verified,error:null}
  throw Error('Unexpected RPC '+name)
 })};return db
}
function response(){return {statusCode:200,setHeader:vi.fn(),status(code){this.statusCode=code;return this},json(value){this.payload=value;return this},end:vi.fn()}}
beforeEach(()=>{vi.clearAllMocks();vi.spyOn(console,'error').mockImplementation(()=>{})})
afterEach(()=>vi.restoreAllMocks())
describe('archived sample lifecycle',()=>{
 it('omits the unassigned seed of a verified archived sample, scoped to its owner',async()=>{
  const db=database();expect(await visibleInboxTranscripts({supabase:db,userId:'owner',rows:[source]})).toEqual([])
  expect(db.rpc).toHaveBeenCalledWith('is_sample_client',{p_user_id:'owner',p_client_id:alex.id})
  expect(db.calls.every(call=>call.filters.some(([key,value])=>key==='user_id'&&value==='owner'))).toBe(true)
 })
 it('keeps active sample imports',async()=>{
  const db=database({clients:[{...alex,archived:false}]})
  expect(await visibleInboxTranscripts({supabase:db,userId:'owner',rows:[source]})).toEqual([source]);expect(db.rpc).not.toHaveBeenCalled()
 })
 it('does not trust an editable sample reference or an archived client from another account',async()=>{
  for(const options of [{verified:false},{clients:[{...alex,user_id:'another-owner'}]}]){
   expect(await visibleInboxTranscripts({supabase:database(options),userId:'owner',rows:[source]})).toEqual([source])
  }
 })
 it('preserves real transcripts, unknown sources and sample sources moved to another client',async()=>{
  const real={...source,id:'real',source:'zoom_manual',client_id:alex.id,session_ref:'real-encounter'},moved={...source,id:'moved',client_id:'real-client',session_ref:'encounter'},unknown={...source,id:'unknown',zoom_note_id:'SAMPLE-NOTE-UNRECOGNISED'}
  const rows=[real,moved,unknown]
  expect(await visibleInboxTranscripts({supabase:database(),userId:'owner',rows})).toEqual(rows)
  const db=database();expect(await visibleInboxTranscripts({supabase:db,userId:'owner',rows:[real]})).toEqual([real]);expect(db.from).not.toHaveBeenCalled()
 })
 it('also omits linked demo history of an archived sample from the Inbox',async()=>{
  const linked={...source,client_id:alex.id,session_ref:'encounter'}
  expect(await visibleInboxTranscripts({supabase:database(),userId:'owner',rows:[linked]})).toEqual([])
 })
 it('filters the real list endpoint and refuses a stale Inbox deep link',async()=>{
  const db=database();mocks.context.mockResolvedValue({supabase:db,user:{id:'owner'}})
  const list=response();await transcriptsHandler({method:'GET',query:{}},list)
  expect(list.statusCode).toBe(200);expect(list.payload.transcripts).toEqual([])
  const detail=response();await transcriptsHandler({method:'GET',query:{id:source.id}},detail)
  expect(detail.statusCode).toBe(404);expect(detail.payload.transcript).toBeUndefined()
  expect(db.calls.every(call=>call.table==='clients'||call.filters.some(([key,value])=>key==='therapist_user_id'&&value==='owner'))).toBe(true)
 })
 it('preserves explicit archived encounter reads and does not delete or edit the source',async()=>{
  const linked={...source,client_id:alex.id,session_ref:'encounter'}
  const db=database({rows:[linked]});mocks.context.mockResolvedValue({supabase:db,user:{id:'owner'}})
  const res=response();await transcriptsHandler({method:'GET',query:{clientId:alex.id,sessionRef:'encounter'}},res)
  expect(res.statusCode).toBe(200);expect(res.payload.transcripts[0].text).toBe('Synthetic original');expect(db.rpc).not.toHaveBeenCalled()
  expect(linked.original_transcript).toBe('Synthetic original')
 })
 it('does not reveal a retired source when sample verification fails',async()=>{
  const db=database();db.rpc.mockResolvedValue({error:{message:'Verification unavailable'}});mocks.context.mockResolvedValue({supabase:db,user:{id:'owner'}})
  const res=response();await transcriptsHandler({method:'GET',query:{}},res)
  expect(res.statusCode).toBe(500);expect(res.payload.transcripts).toBeUndefined()
 })
 it('a repeated sample setup does not seed any work for archived sample clients',async()=>{
  const clients=[alex,...['002','003','004'].map(ref=>({id:'sample-'+ref,user_id:'owner',reference:'SAMPLE-'+ref,archived:true}))]
  const db=database({clients});mocks.context.mockResolvedValue({supabase:db,user:{id:'owner'}})
  const res=response();await sampleHandler({method:'POST',body:{}},res)
  expect(res.statusCode).toBe(200);expect(res.payload.data).toMatchObject({transcriptInboxItems:0,transcriptHistoryItems:0,reviewedSessionCaptures:0,inboxTranscriptId:null,longitudinalSummaryReady:false})
  expect(db.calls.every(call=>call.table==='clients')).toBe(true);expect(mocks.seedRpc).not.toHaveBeenCalled()
 })
})
