import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/ai/clinical-record-suggestions.js';
import { requireAuthenticatedUser } from '../../api/_lib/supabase.js';
import { runTextAI } from '../../api/_lib/ai-execution.js';
import { CLINICAL_RECORD_FIELDS } from '../../api/_lib/clinical-record-evidence.js';
vi.mock('../../api/_lib/supabase.js',()=>({requireAuthenticatedUser:vi.fn()}));
vi.mock('../../api/_lib/ai-execution.js',()=>({AI_FEATURES:{TRANSCRIPT_DRAFT_CLINICAL_NOTE:'synthetic'},runTextAI:vi.fn()}));
const clientId='11111111-1111-4111-8111-111111111111';
const sessionId='22222222-2222-4222-8222-222222222222';
const otherClient='33333333-3333-4333-8333-333333333333';
const userId='44444444-4444-4444-8444-444444444444';
const quote='We explored responses to workplace stress.';
const passageId='passage_1';
const fields=()=>Object.fromEntries(CLINICAL_RECORD_FIELDS.map(key=>[key,{text:'',evidence:[]}]));
function output(){const result=fields();result.sessionThemes={text:'Workplace stress was explored.',evidence:[{passageId}]};result.riskSafeguarding={text:'UNSUPPORTED_CANDIDATE',evidence:[]};return {fields:result};}
const completion=raw=>({model:'synthetic-model',completion:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]}});
function fakeDb(records){
  const calls=[];
  return {calls,from(table){
    const call={table,filters:[]};calls.push(call);
    let count=Infinity;
    const resolve=single=>{
      const rows=(records[table]||[]).filter(row=>call.filters.every(([op,key,value])=>{
        if(op==='in')return value.includes(row[key]);
        if(op==='lte')return row[key]<=value;
        if(op==='is')return (row[key]??null)===value;
        return row[key]===value;
      })).slice(0,count);
      return {data:structuredClone(single?(rows[0]||null):rows),error:null};
    };
    const query={
      select(value){call.select=value;return query;},
      eq(key,value){call.filters.push(['eq',key,value]);return query;},
      is(key,value){call.filters.push(['is',key,value]);return query;},
      in(key,value){call.filters.push(['in',key,value]);return query;},
      lte(key,value){call.filters.push(['lte',key,value]);return query;},
      order(){return query;},limit(value){count=value;return query;},
      maybeSingle(){return Promise.resolve(resolve(true));},
      then(onResolve,onReject){return Promise.resolve(resolve(false)).then(onResolve,onReject);},
      insert(){throw new Error('Unexpected write');},update(){throw new Error('Unexpected write');},delete(){throw new Error('Unexpected write');}
    };return query;
  }};
}
async function invoke(body={clientId,sessionId}){
  const res={statusCode:200,setHeader:vi.fn(),status(code){this.statusCode=code;return this;},json(payload){this.payload=payload;return this;}};
  await handler({method:'POST',body},res);return res;
}
describe('Clinical Record field-level recovery API and confidentiality',()=>{
  let records,db;
  beforeEach(()=>{
    vi.clearAllMocks();
    records={
      clients:[{id:clientId,user_id:userId,archived:false}],
      sessions:[{id:sessionId,client_id:clientId,user_id:userId,status:'source_ready',occurred_at:'2026-11-01T10:00:00Z',updated_at:'v1',notes:''}],
      zoom_transcripts:[{id:'synthetic-transcript',therapist_user_id:userId,client_id:clientId,session_ref:sessionId,source_version:'source-v1',source_review:{state:'confirmed'},deleted_at:null}],
      session_capture_drafts:[{session_id:sessionId,user_id:userId,client_id:clientId,status:'reviewed',content:{sessionThemes:quote},reviewed_at:'review-v1',updated_at:'capture-v1'}],
      documents:[],client_care_items:[]
    };
    db=fakeDb(records);
    requireAuthenticatedUser.mockResolvedValue({supabase:db,user:{id:userId}});
    runTextAI.mockResolvedValue(completion(output()));
  });
  it('returns validated fields and per-field reasons in one call, without saving anything',async()=>{
    const res=await invoke();
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.outcome).toBe('partial');
    expect(res.payload.data.fields.sessionThemes.text).toBe('Workplace stress was explored.');
    expect(res.payload.data.fields.riskSafeguarding).toEqual({text:'',evidence:[]});
    expect(res.payload.data.fieldResults.riskSafeguarding.code).toBe('MISSING_EVIDENCE');
    expect(JSON.stringify(res.payload)).not.toContain('UNSUPPORTED_CANDIDATE');
    expect(runTextAI).toHaveBeenCalledTimes(1);
    expect(records.sessions[0].notes).toBe('');
    expect(res.payload.data.verification).toBe('source_quotes_only');
    expect(res.payload.data.fields.sessionThemes.evidence[0].quote).toContain(quote);
    expect(res.payload.data.fields.sessionThemes.evidence[0].quote).toContain('Session themes:');
    expect(runTextAI.mock.calls[0][0].responseFormat.json_schema.name).toBe('clinical_record_passage_suggestions_v1');
  });
  it('does not read or return another client source to repair a fabricated citation',async()=>{
    records.session_capture_drafts.push({...records.session_capture_drafts[0],client_id:otherClient,content:{sessionThemes:'OTHER_CLIENT_PRIVATE_TEXT'}});
    const result=output();result.fields.riskSafeguarding={text:'OTHER_CLIENT_CANDIDATE',evidence:[{passageId:'foreign-record'}]};
    runTextAI.mockResolvedValue(completion(result));
    const res=await invoke();
    expect(res.statusCode).toBe(200);expect(res.payload.data.fields.riskSafeguarding.text).toBe('');
    expect(res.payload.data.fieldResults.riskSafeguarding.code).toBe('UNKNOWN_SOURCE');
    expect(JSON.stringify(res.payload)).not.toContain('OTHER_CLIENT');
    expect(runTextAI.mock.calls[0][0].messages[1].content).not.toContain('OTHER_CLIENT');
    expect(JSON.stringify(db.calls)).not.toContain('foreign-record');
  });
  it('rejects a non-owned encounter before any AI call',async()=>{
    records.sessions[0].user_id='different-user';
    const res=await invoke();expect(res.statusCode).toBe(409);expect(runTextAI).not.toHaveBeenCalled();
  });
  it('rejects arbitrary caller-supplied evidence',async()=>{
    const res=await invoke({clientId,sessionId,sources:['untrusted']});expect(res.statusCode).toBe(400);expect(runTextAI).not.toHaveBeenCalled();
  });
  it('hard-stops a flagged current source before generation',async()=>{
    records.zoom_transcripts[0].source_review.state='needs_review';
    const res=await invoke();expect(res.statusCode).toBe(409);expect(res.payload.error.code).toBe('SOURCE_REVIEW_REQUIRED');expect(runTextAI).not.toHaveBeenCalled();
  });
  it('hard-stops source contamination flagged during generation rather than returning partial results',async()=>{
    runTextAI.mockImplementation(async()=>{records.zoom_transcripts[0].source_review.state='needs_review';return completion(output());});
    const res=await invoke();expect(res.statusCode).toBe(409);expect(res.payload.error.code).toBe('SOURCE_REVIEW_REQUIRED');expect(res.payload.data).toBeUndefined();
  });
  it('rejects changed transcript versions even when some fields passed quotation checks',async()=>{
    runTextAI.mockImplementation(async()=>{records.zoom_transcripts[0].source_version='source-v2';return completion(output());});
    const res=await invoke();expect(res.statusCode).toBe(409);expect(res.payload.error.code).toBe('SOURCE_CHANGED');
  });
  it('rejects a reviewed capture whose content changes while generation runs',async()=>{
    runTextAI.mockImplementation(async()=>{records.session_capture_drafts[0].content.sessionThemes='Newly edited source';return completion(output());});
    const res=await invoke();expect(res.statusCode).toBe(409);expect(res.payload.error.code).toBe('SOURCE_CHANGED');expect(res.payload.data).toBeUndefined();
  });
  it('rejects a reassigned source instead of looking it up outside client scope',async()=>{
    runTextAI.mockImplementation(async()=>{records.session_capture_drafts[0].client_id=otherClient;return completion(output());});
    const res=await invoke();expect(res.statusCode).toBe(409);expect(res.payload.error.code).toBe('SOURCE_CHANGED');
  });
  it('rechecks client availability after generation',async()=>{
    runTextAI.mockImplementation(async()=>{records.clients[0].archived=true;return completion(output());});
    const res=await invoke();expect(res.statusCode).toBe(409);expect(res.payload.data).toBeUndefined();
  });
  it('reports malformed output specifically after one bounded format retry',async()=>{
    runTextAI.mockResolvedValue({model:'synthetic-model',completion:{choices:[{finish_reason:'stop',message:{content:'UNREADABLE_PRIVATE_OUTPUT'}}]}});
    const res=await invoke();expect(res.statusCode).toBe(502);expect(runTextAI).toHaveBeenCalledTimes(2);
    expect(res.payload.error.reason).toBe('INVALID_JSON');expect(JSON.stringify(res.payload)).not.toContain('UNREADABLE_PRIVATE_OUTPUT');
  });
  it('returns blank fields as insufficient evidence rather than a technical failure',async()=>{
    runTextAI.mockResolvedValue(completion({fields:fields()}));
    const res=await invoke();expect(res.statusCode).toBe(200);expect(res.payload.data.outcome).toBe('insufficient_evidence');expect(runTextAI).toHaveBeenCalledTimes(1);
  });
});
