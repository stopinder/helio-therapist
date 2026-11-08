import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../api/_lib/supabase.js',()=>({requireAuthenticatedUser:vi.fn()}));
import { requireAuthenticatedUser } from '../../api/_lib/supabase.js';
import handler from '../../api/zoom/source-review.js';
import { SOURCE_CONFIRMATION_ATTESTATION, sourceConfirmationContext } from '../../api/_lib/source-review.js';

const transcriptId='11111111-1111-4111-8111-111111111111';
const sourceVersion='22222222-2222-4222-8222-222222222222';
const userId='33333333-3333-4333-8333-333333333333';
const clientId='44444444-4444-4444-8444-444444444444';
const sessionId='55555555-5555-4555-8555-555555555555';
let db;
function mockDatabase(row){
  const request={select:vi.fn(),eq:vi.fn(),is:vi.fn(),maybeSingle:vi.fn()};
  request.select.mockReturnValue(request);
  request.eq.mockReturnValue(request);
  request.is.mockReturnValue(request);
  request.maybeSingle.mockResolvedValue({data:row,error:null});
  return {from:vi.fn(()=>request),rpc:vi.fn(async()=>({data:{review:{state:'confirmed'},sourceVersion},error:null})),request};
}
async function invoke(body){
  const res={statusCode:200,payload:null,setHeader:vi.fn(),status(n){this.statusCode=n;return this},json(data){this.payload=data;return this}};
  await handler({method:'POST',body},res);
  return res;
}
const request=(changes={})=>({action:'confirm',transcriptId,sourceVersion,reviewed:true,context:'',segments:[],...changes});
beforeEach(()=>{
  vi.clearAllMocks();
  db=mockDatabase({id:transcriptId,client_id:clientId,session_ref:sessionId,therapist_user_id:userId,source_version:sourceVersion,source_review:{state:'needs_review'},original_transcript:'A synthetic discussion about one session',deleted_at:null});
  requireAuthenticatedUser.mockResolvedValue({supabase:db,user:{id:userId}});
});
describe('explicit one-click encounter confirmation',()=>{
  it('accepts a checked attestation with no typed narrative and passes the minimum-length database constraint',async()=>{
    const response=await invoke(request());
    expect(response.statusCode).toBe(200);
    expect(db.rpc).toHaveBeenCalledOnce();
    const [fn,args]=db.rpc.mock.calls[0];
    expect(fn).toBe('resolve_transcript_source_review');
    expect(args).toMatchObject({p_user_id:userId,p_transcript_id:transcriptId,p_expected_version:sourceVersion,p_action:'confirm',p_evidence:[],p_segments:[]});
    expect(args.p_context).toBe(SOURCE_CONFIRMATION_ATTESTATION);
    expect(args.p_context.length).toBeGreaterThanOrEqual(10);
  });
  it('preserves optional therapist context without treating it as a prerequisite',async()=>{
    const response=await invoke(request({context:'Partner mentioned, not present.'}));
    expect(response.statusCode).toBe(200);
    expect(db.rpc.mock.calls[0][1].p_context).toBe(sourceConfirmationContext('Partner mentioned, not present.'));
  });
  it('reassigns a reviewed source only to a different chosen client through the atomic RPC',async()=>{
    const target='66666666-6666-4666-8666-666666666666';
    db.rpc.mockResolvedValueOnce({data:{id:transcriptId,sourceVersion:'77777777-7777-4777-8777-777777777777',clientId:target,sessionId,previousClientId:clientId,review:{state:'confirmed'}},error:null});
    const response=await invoke(request({action:'reassign',targetClientId:target,reviewed:true}));
    expect(response.statusCode).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith('reassign_reviewed_transcript_source',{
      p_user_id:userId,p_transcript_id:transcriptId,p_expected_version:sourceVersion,
      p_target_client_id:target,p_acknowledged:true,p_context:''
    });
    expect(response.payload.data.clientId).toBe(target);
  });
  it('rejects reassignment without explicit review or with the same client, without invoking the RPC',async()=>{
    const target='66666666-6666-4666-8666-666666666666';
    expect((await invoke(request({action:'reassign',targetClientId:target,reviewed:false}))).statusCode).toBe(400);
    expect((await invoke(request({action:'reassign',targetClientId:clientId}))).statusCode).toBe(400);
    expect((await invoke(request({action:'reassign',targetClientId:'bad-id'}))).statusCode).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('blocks reassignment safely when dependent clinical material exists',async()=>{
    db.rpc.mockResolvedValueOnce({data:null,error:{code:'23514',message:'This encounter has existing clinical material.'}});
    const response=await invoke(request({action:'reassign',targetClientId:'66666666-6666-4666-8666-666666666666'}));
    expect(response.statusCode).toBe(409);
    expect(response.payload.error.code).toBe('REASSIGNMENT_BLOCKED');
    expect(response.payload.error.message).toContain('clinical material');
  });
  it('refuses a stale reassignment before changing any client',async()=>{
    db.rpc.mockResolvedValueOnce({data:null,error:{code:'40001',message:'Source changed'}});
    const response=await invoke(request({action:'reassign',targetClientId:'66666666-6666-4666-8666-666666666666'}));
    expect(response.statusCode).toBe(409);
    expect(response.payload.error.code).toBe('SOURCE_CHANGED');
  });
  it('never confirms without the explicit therapist checkbox',async()=>{
    const response=await invoke(request({reviewed:false}));
    expect(response.statusCode).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('rejects an unauthenticated or unowned transcript before calling the RPC',async()=>{
    db.request.maybeSingle.mockResolvedValueOnce({data:null,error:null});
    const response=await invoke(request());
    expect(response.statusCode).toBe(404);
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.request.eq).toHaveBeenCalledWith('therapist_user_id',userId);
  });
  it('does not silently confirm after source version changes',async()=>{
    db.rpc.mockResolvedValueOnce({data:null,error:{code:'40001',message:'Source changed. Review the current version.'}});
    const response=await invoke(request());
    expect(response.statusCode).toBe(409);
    expect(response.payload.error.code).toBe('SOURCE_CHANGED');
  });
  it('reports forbidden server action as a distinct, useful error code',async()=>{
    db.rpc.mockResolvedValueOnce({data:null,error:{code:'42501',message:'Forbidden'}});
    const response=await invoke(request());
    expect(response.statusCode).toBe(403);
    expect(response.payload.error.code).toBe('SOURCE_REVIEW_FORBIDDEN');
    expect(response.payload.error.message).toContain('server refused');
    expect(response.payload.error.message).not.toContain('Forbidden');
  });
  it('still refuses malformed versions or an overlong optional note',async()=>{
    const invalid=await invoke(request({sourceVersion:'not-a-uuid'}));
    expect(invalid.statusCode).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
    const long=await invoke(request({context:'x'.repeat(3990)}));
    expect(long.statusCode).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
