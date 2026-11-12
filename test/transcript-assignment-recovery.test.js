import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssignmentHandler } from '../api/zoom/transcript-assignment.js';
import { transcriptNeedsAttention, transcriptWorkflowState, sessionSummaryDestination } from '../src/lib/transcriptWorkflow.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',version='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const updatedAt='2026-11-12T12:00:00Z';
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}}}
test('archive visibility remains independent of source safety and normal assignment',()=>{
  const t={id,clientId:'client',sessionRef:'session',attentionClearedAt:updatedAt,sourceReview:{state:'needs_review'}};
  assert.equal(transcriptNeedsAttention(t),true);
  assert.equal(transcriptNeedsAttention({...t,inboxArchivedAt:updatedAt}),false);
  assert.equal(transcriptWorkflowState({...t,inboxArchivedAt:updatedAt}).id,'archived');
  assert.equal(sessionSummaryDestination({...t,inboxArchivedAt:updatedAt}),null);
  assert.equal(transcriptWorkflowState({...t,sourceReview:{state:'confirmed'}}).id,'assigned');
});
test('API authenticates, validates attestation and passes the verified owner to the transaction',async()=>{
  const calls=[];const handler=createAssignmentHandler(async()=>({user:{id:'verified-owner'},supabase:{rpc:async(name,args)=>{calls.push({name,args});return {data:{id}}}}}));
  let res=response();await handler({method:'POST',body:{id,action:'detach'}},res);assert.equal(res.statusCode,400);assert.equal(calls.length,0);
  res=response();await handler({method:'POST',body:{id,action:'detach',sourceVersion:version,expectedUpdatedAt:updatedAt,confirmed:true,userId:'attacker'}},res);
  assert.equal(res.statusCode,200);assert.equal(calls[0].args.p_user_id,'verified-owner');assert.equal(calls[0].args.p_expected_version,version);assert.equal(calls[0].args.p_action,'detach');
});
test('API returns stale, protected and authentication failures without claiming success',async()=>{
  for(const [code,status] of [['40001',409],['23514',409],['P0002',404],['42501',403]]){
    const handler=createAssignmentHandler(async()=>({user:{id},supabase:{rpc:async()=>({error:{code,message:'Nothing changed.'}})}}));const res=response();
    await handler({method:'POST',body:{id,action:'detach_archive',sourceVersion:version,expectedUpdatedAt:updatedAt,confirmed:true}},res);assert.equal(res.statusCode,status);assert.ok(res.body.error);assert.equal(res.body.data,undefined);
  }
  const res=response();await createAssignmentHandler(async()=>{throw Object.assign(new Error(),{status:401})})({method:'GET',query:{id}},res);assert.equal(res.statusCode,401);
});
test('API rejects invalid target encounters and undo references before calling the DB',async()=>{
  let calls=0;const handler=createAssignmentHandler(async()=>({user:{id},supabase:{rpc:async()=>{calls++;return {data:{}}}}}));
  for(const extra of [{action:'reassign',targetClientId:'bad'},{action:'reassign',targetClientId:id,targetSessionId:'bad'},{action:'undo',eventId:'bad'}]){
    const res=response();await handler({method:'POST',body:{id,sourceVersion:version,expectedUpdatedAt:updatedAt,confirmed:true,...extra}},res);assert.equal(res.statusCode,400);
  }assert.equal(calls,0);
});
