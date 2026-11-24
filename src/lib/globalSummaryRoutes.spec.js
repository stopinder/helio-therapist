import { beforeEach, describe, it, expect, vi } from 'vitest';
vi.mock('../../api/_lib/supabase.js',()=>({requireAuthenticatedUser:vi.fn()}));
vi.mock('../../api/_lib/ai-execution.js',()=>({AI_FEATURES:{CLIENT_SESSION_SUMMARY:'client.session_summary'},runTextAI:vi.fn()}));
vi.mock('../../api/_lib/summary-resource-check.js',()=>({verifySummaryResource:vi.fn()}));
import { requireAuthenticatedUser } from '../../api/_lib/supabase.js';
import { runTextAI } from '../../api/_lib/ai-execution.js';
import { verifySummaryResource } from '../../api/_lib/summary-resource-check.js';
import directHandler from '../../api/ai/session-summary.js';
import longitudinalHandler from '../../api/ai/client-session-summary.js';
import { CLIENT_SESSION_SUMMARY_FIELDS, CLIENT_SESSION_SUMMARY_LENSES } from '../../api/_lib/ai-client-session-summary.js';
import { SUMMARY_POLICY_VERSION } from './summaryAuthoring.js';
import { renderClientSessionSummary } from '../../api/_lib/ai-client-session-summary.js';
const clientId='11111111-1111-4111-8111-111111111111',sessionId='22222222-2222-4222-8222-222222222222',transcriptId='33333333-3333-4333-8333-333333333333',userId='44444444-4444-4444-8444-444444444444';
const text='The participants described pausing a difficult exchange while returning to it remained unresolved.';
const sourceId='session:'+sessionId;
const output=()=>({outcome:'ready',review:{reason:'',message:'',evidence:[]},sections:{...Object.fromEntries(CLIENT_SESSION_SUMMARY_FIELDS.map(key=>[key,''])),whatWeWorkedOn:text},claims:[{section:'whatWeWorkedOn',text,sourceIds:[sourceId],evidenceStrength:'current_observation'}]});
let rows,db;
function createDatabase(){
  return {rpc:vi.fn(async()=>({data:false,error:null})),from:vi.fn(table=>{
    const filters=[];let start=0,end=Infinity,count=Infinity;
    const query={select(){return query},eq(key,value){filters.push(row=>row[key]===value);return query},is(key,value){filters.push(row=>value===null?row[key]==null:row[key]===value);return query},
      in(key,values){filters.push(row=>values.includes(row[key]));return query},lte(key,value){filters.push(row=>row[key]<=value);return query},not(key,_operator,value){filters.push(row=>row[key]!==value);return query},
      order(){return query},limit(value){count=value;return query},range(a,b){start=a;end=b;return query},
      result(){return structuredClone((rows[table]||[]).filter(row=>filters.every(predicate=>predicate(row))).slice(start,Math.min(end+1,count)))},
      async maybeSingle(){return {data:query.result()[0]||null,error:null}},then(resolve,reject){return Promise.resolve({data:query.result(),error:null}).then(resolve,reject)}};
    return query;
  })};
}
async function invoke(handler,body){const res={statusCode:200,payload:null,setHeader:vi.fn(),status(code){this.statusCode=code;return this},json(payload){this.payload=payload;return this}};await handler({method:'POST',body},res);return res;}
beforeEach(()=>{
  vi.clearAllMocks();
  rows={
    clients:[{id:clientId,user_id:userId,reference:'synthetic',archived:false}],
    sessions:[{id:sessionId,client_id:clientId,user_id:userId,status:'source_ready',occurred_at:'2026-01-01T10:00:00Z',clients:{id:clientId,user_id:userId,display_name:'Synthetic participants'}}],
    zoom_transcripts:[{id:transcriptId,client_id:clientId,therapist_user_id:userId,session_ref:sessionId,original_transcript:text,zoom_generated_summary:'',source_version:1,source_review:{state:'confirmed'},source:'synthetic',received_at:'2026-01-01T11:00:00Z',deleted_at:null}],
    session_capture_drafts:[{session_id:sessionId,client_id:clientId,user_id:userId,status:'reviewed',reviewed_at:'2026-01-01T11:00:00Z',sessions:{id:sessionId,occurred_at:'2026-01-01T10:00:00Z',client_id:clientId,user_id:userId},content:{sessionThemes:text}}],
    documents:[],client_care_items:[]
  };
  db=createDatabase();requireAuthenticatedUser.mockResolvedValue({supabase:db,user:{id:userId}});
  runTextAI.mockImplementation(async()=>({model:'synthetic-model',completion:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(output())}}],usage:{prompt_tokens:20,completion_tokens:20,total_tokens:40}}}));
  verifySummaryResource.mockResolvedValue(null);
});
describe('confirmed note-only encounter summaries',()=>{
  function ambiguousNote() {
    return {outcome:'needs_review',review:{reason:'source_conflict',message:'Possible encounter ambiguity.',evidence:[]},
      sections:Object.fromEntries(CLIENT_SESSION_SUMMARY_FIELDS.map(key=>[key,''])),claims:[]};
  }
  const modelResult=body=>({model:'synthetic-model',completion:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(body)}}]}});

  it('retries unverified ambiguity using the confirmed note and returns an attributed draft',async()=>{
    Object.assign(rows.zoom_transcripts[0],{original_transcript:'',zoom_generated_summary:text});
    runTextAI.mockResolvedValueOnce(modelResult(ambiguousNote()));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.outcome).toBe('ready');
    expect(res.payload.data.sources[0]).toMatchObject({hasTranscript:false,hasZoomSummary:true});
    expect(res.payload.data.reviewCautions[0]).toContain('therapist-confirmed imported Zoom note');
    expect(runTextAI.mock.calls[1][0].messages[0].content).toContain('keep unsupported sections empty');
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('reports a summary generation failure after repeat ambiguity without restarting identity review',async()=>{
    Object.assign(rows.zoom_transcripts[0],{original_transcript:'',zoom_generated_summary:text});
    runTextAI.mockResolvedValue(modelResult(ambiguousNote()));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.statusCode).toBe(502);
    expect(res.payload.error).toMatchObject({code:'AI_RESPONSE_UNVERIFIED'});
    expect(res.payload.error.message).toContain('Your source review is saved');
    expect(runTextAI).toHaveBeenCalledTimes(2);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('still requires confirmation before retrying an ambiguous note-only source',async()=>{
    Object.assign(rows.zoom_transcripts[0],{original_transcript:'',zoom_generated_summary:text,source_review:{}});
    runTextAI.mockResolvedValueOnce(modelResult(ambiguousNote()));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.outcome).toBe('needs_review');
    expect(runTextAI).toHaveBeenCalledTimes(1);
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe('confirmed transcript-backed encounter failures',()=>{
  const result=body=>({model:'synthetic-model',completion:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(body)}}]}});
  const soft=()=>({outcome:'needs_review',review:{reason:'source_conflict',message:'Synthetic unresolved secondary concern.',evidence:[]},
    sections:Object.fromEntries(CLIENT_SESSION_SUMMARY_FIELDS.map(key=>[key,''])),claims:[]});
  const withStyleIssue=()=>{const value=output();value.sections.strengthsAndResources=text;value.claims.push({...value.claims[0],section:'strengthsAndResources'});return value;};
  beforeEach(()=>{rows.zoom_transcripts[0].zoom_generated_summary='Synthetic secondary note that must not enter the transcript-only retry.';});

  it('does not discard a transcript-backed draft for an unverified editorial concern',async()=>{
    runTextAI.mockResolvedValueOnce(result(soft())).mockResolvedValueOnce(result(withStyleIssue())).mockResolvedValueOnce(result(soft()));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.outcome).toBe('ready');
    const packets=runTextAI.mock.calls.map(([request])=>JSON.parse(request.messages[1].content));
    expect(packets[0].sourceBlocks[0]).toMatchObject({transcript:text,zoom_note:rows.zoom_transcripts[0].zoom_generated_summary});
    for(const packet of packets.slice(1))expect(packet.sourceBlocks[0]).toMatchObject({transcript:text,zoom_note:''});
    expect(db.rpc).not.toHaveBeenCalled();
    expect(rows.zoom_transcripts[0].source_review.state).toBe('confirmed');
  });

  it('repairs a malformed transcript-only retry against the same original evidence',async()=>{
    const invalid=output();invalid.claims[0].sourceIds=['not-a-supplied-source'];
    runTextAI.mockResolvedValueOnce(result(soft())).mockResolvedValueOnce(result(invalid)).mockResolvedValueOnce(result(output()));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.outcome).toBe('ready');
    expect(runTextAI).toHaveBeenCalledTimes(3);
    for(const [request] of runTextAI.mock.calls.slice(1))expect(JSON.parse(request.messages[1].content).sourceBlocks[0]).toMatchObject({transcript:text,zoom_note:''});
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('reports the attached transcript and failed stage without clearing saved review or draft',async()=>{
    rows.documents.push({id:'synthetic-existing-draft',content:{body:'Synthetic existing draft.'}});
    const before=structuredClone(rows);
    runTextAI.mockResolvedValue(result(soft()));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.statusCode).toBe(502);
    expect(res.payload.error.message).toContain('original transcript is attached');
    expect(res.payload.error.message).not.toContain('Add the original transcript');
    expect(res.payload.error.diagnosticCode).toBe('SS_RETRY_REVIEW_UNVERIFIED');
    expect(rows).toEqual(before);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('rejects a generation request for an older displayed source version before calling the model',async()=>{
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId,sourceVersion:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
    expect(res.statusCode).toBe(409);
    expect(res.payload.error.code).toBe('SOURCE_CHANGED');
    expect(runTextAI).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('uses the pinned displayed source and returns its matching version in the draft manifest',async()=>{
    const sourceVersion='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    rows.zoom_transcripts[0].source_version=sourceVersion;
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId,sourceVersion});
    expect(res.payload.data.outcome).toBe('ready');
    expect(res.payload.data.sources[0]).toMatchObject({transcriptId,sourceVersion});
  });

  it('still stops for a genuinely new verified transcript passage during editorial review',async()=>{
    const hard=soft();hard.review.evidence=[{sourceId,sourceType:'transcript',quote:text}];
    runTextAI.mockResolvedValueOnce(result(soft())).mockResolvedValueOnce(result(withStyleIssue())).mockResolvedValueOnce(result(hard));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.payload.data.outcome).toBe('needs_review');
    expect(db.rpc).toHaveBeenCalledWith('resolve_transcript_source_review',expect.objectContaining({p_action:'flag'}));
  });

  it('keeps a retry provider failure distinct from an unverifiable review outcome',async()=>{
    runTextAI.mockResolvedValueOnce(result(soft())).mockRejectedValueOnce(Object.assign(new Error('Synthetic private provider detail'),{code:'ETIMEDOUT'}));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.payload.error.diagnosticCode).toBe('SS_RETRY_UNAVAILABLE');
    expect(JSON.stringify(res.payload)).not.toContain('Synthetic private provider detail');
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('does not accept a malformed retry or repair as a ready draft',async()=>{
    const invalid=output();invalid.claims[0].sourceIds=['not-a-supplied-source'];
    runTextAI.mockResolvedValueOnce(result(soft())).mockResolvedValue(result(invalid));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.payload.error.diagnosticCode).toBe('SS_RETRY_INVALID');
    expect(res.payload.data).toBeUndefined();
    expect(runTextAI).toHaveBeenCalledTimes(3);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('rejects truncated retry output even if the partial response happens to parse',async()=>{
    const truncated=result(output());truncated.completion.choices[0].finish_reason='length';
    runTextAI.mockResolvedValueOnce(result(soft())).mockResolvedValueOnce(truncated);
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.payload.error.diagnosticCode).toBe('SS_RETRY_TRUNCATED');
    expect(runTextAI).toHaveBeenCalledTimes(2);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('sends confirmed exact passages as review context and retains a draft when editorial review repeats them',async()=>{
    rows.zoom_transcripts[0].original_transcript='\n\n'+text+'\n';
    rows.zoom_transcripts[0].zoom_generated_summary='';
    const passage={sourceId,sourceType:'transcript',quote:text,verified:true,startLine:3,endLine:3};
    rows.zoom_transcripts[0].source_review.evidence=[passage];
    const repeated=soft();repeated.review.evidence=[{sourceId,sourceType:'transcript',quote:text}];
    runTextAI.mockResolvedValueOnce(result(withStyleIssue())).mockResolvedValueOnce(result(repeated));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.payload.data.outcome).toBe('ready');
    expect(res.payload.data.qualityReview.sourceReviewDecision).toBe('retained_confirmed_transcript_draft');
    expect(JSON.parse(runTextAI.mock.calls[0][0].messages[1].content).sourceBlocks[0].confirmedPrimaryPassages).toEqual([{sourceId,sourceType:'transcript',quote:text,startLine:3,endLine:3}]);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('never retains an original with a blocking unrequested addition after an unverified editorial concern',async()=>{
    rows.zoom_transcripts[0].zoom_generated_summary='';
    const invalidAddition=output();invalidAddition.sections.betweenSession='Optional exercise to consider: Synthetic practice.';
    invalidAddition.claims.push({section:'betweenSession',text:invalidAddition.sections.betweenSession,sourceIds:[sourceId],evidenceStrength:'current_observation'});
    runTextAI.mockResolvedValueOnce(result(invalidAddition)).mockResolvedValueOnce(result(soft()));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.statusCode).toBe(422);
    expect(res.payload.error.code).toBe('SUMMARY_ADDITION_NOT_VERIFIED');
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('does not apply the editorial fallback to a draft that still used a secondary note',async()=>{
    runTextAI.mockResolvedValueOnce(result(withStyleIssue())).mockResolvedValueOnce(result(soft()));
    const res=await invoke(directHandler,{clientId,sessionId,transcriptId});
    expect(res.statusCode).toBe(502);
    expect(res.payload.error.diagnosticCode).toBe('SS_EDITORIAL_REVIEW_UNVERIFIED');
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('logs fixed codes and flags rather than clinical content or source identifiers',async()=>{
    const info=vi.spyOn(console,'info').mockImplementation(()=>{});
    try {
      runTextAI.mockResolvedValue(result(soft()));
      await invoke(directHandler,{clientId,sessionId,transcriptId});
      const record=info.mock.calls.find(([label])=>label==='[Session Summary diagnostic]')[1];
      expect(record).toMatchObject({code:'SS_RETRY_REVIEW_UNVERIFIED',initialTranscriptIncluded:true,retryTranscriptIncluded:true,retryZoomNoteExcluded:true});
      for(const value of Object.values(record))expect(typeof value==='boolean'||['SS_RETRY_REVIEW_UNVERIFIED','unverified_or_secondary_review','not_attempted'].includes(value)).toBe(true);
      const serialized=JSON.stringify(record);
      for(const privateValue of [clientId,sessionId,transcriptId,text,rows.zoom_transcripts[0].zoom_generated_summary])expect(serialized).not.toContain(privateValue);
    } finally {info.mockRestore();}
  });
});
for(const [route,handler,extra] of [['encounter',directHandler,{sessionId,transcriptId}],['longitudinal',longitudinalHandler,{anchorSessionId:sessionId}]])describe(route+' uses global authoring',()=>{
  for(const lens of CLIENT_SESSION_SUMMARY_LENSES)it('uses shared neutral policy for '+lens,async()=>{
    const res=await invoke(handler,{clientId,...extra,lens,summaryOptions:{audience:'shared'}});
    expect(res.statusCode).toBe(200);expect(res.payload.data.outcome).toBe('ready');expect(runTextAI).toHaveBeenCalledTimes(1);
    expect(runTextAI.mock.calls[0][0].messages[0].content).toContain(SUMMARY_POLICY_VERSION);
    expect(runTextAI.mock.calls[0][0].messages[0].content).toContain('Address both/all consistently');
    expect(res.payload.data.resourceSelection).toBeNull();expect(res.payload.data.draft.body).toBe(renderClientSessionSummary(output().sections,lens,route === 'encounter' ? 'session_summary' : 'across_session_review'));
    expect(res.payload.data.qualityReview.kind).toBe('mechanical_editorial_checks');
  });
  it('checks ownership before checking an external resource or calling AI',async()=>{
    rows.clients=[];rows.sessions=[];
    const res=await invoke(handler,{clientId,...extra,summaryOptions:{addition:'resource',resource:{title:'Reference',url:'https://example.com/reference',reviewed:true}}});
    expect(res.statusCode).toBe(404);expect(runTextAI).not.toHaveBeenCalled();expect(verifySummaryResource).not.toHaveBeenCalled();
  });
  it('does not allow caller metadata to bypass a live source concern',async()=>{
    rows.zoom_transcripts[0].source_review.state='needs_review';
    const res=await invoke(handler,{clientId,...extra});
    expect(res.payload.data.outcome).toBe('needs_review');expect(runTextAI).not.toHaveBeenCalled();
  });
  it('rechecks changed source versions after generation',async()=>{
    runTextAI.mockImplementation(async()=>{rows.zoom_transcripts[0].source_version=2;return {model:'synthetic',completion:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(output())}}]}};});
    const res=await invoke(handler,{clientId,...extra});expect(res.statusCode).toBe(409);expect(res.payload.error.code).toBe('SOURCE_CHANGED');
  });
  it('will not append a resource merely because the caller claims it was reviewed',async()=>{
    verifySummaryResource.mockRejectedValue(Object.assign(new Error('The link could not be checked.'),{code:'RESOURCE_NOT_VERIFIED',status:422}));
    const res=await invoke(handler,{clientId,...extra,summaryOptions:{addition:'resource',resource:{title:'Reference',url:'https://example.com/reference',reviewed:true}}});
    expect(res.statusCode).toBe(422);expect(runTextAI).not.toHaveBeenCalled();
  });
  it('adds only an explicitly selected and server-checked resource, outside the clinical evidence',async()=>{
    const resource={title:'Synthetic reference',url:'https://example.com/reference',purpose:'Optional reading.',reviewed:true};
    verifySummaryResource.mockResolvedValue({url:resource.url,title:resource.title,status:'reachable',checkedAt:'2026-01-01',verification:'link_and_metadata_only',clinicalSuitability:'not_assessed'});
    const res=await invoke(handler,{clientId,...extra,summaryOptions:{addition:'resource',resource}});
    expect(res.statusCode).toBe(200);expect(res.payload.data.draft.body).toContain('[Synthetic reference](https://example.com/reference)');
    expect(res.payload.data.resourceSelection.verification.clinicalSuitability).toBe('not_assessed');
    expect(JSON.stringify(runTextAI.mock.calls[0][0].messages)).not.toContain(resource.url);
    expect(res.payload.data.sources.some(source=>source.kind==='resource')).toBe(false);
  });
});

for (const [route,handler,extra] of [['encounter',directHandler,{sessionId,transcriptId,window:'recent'}],['longitudinal',longitudinalHandler,{anchorSessionId:sessionId,window:'last_three'}]])describe(route+' across-session comparison',()=>{
  it('sends the same three dated encounters to all five lenses and renders their own structures',async()=>{
    for (const [index,date] of [[5,'2025-12-18T10:00:00Z'],[6,'2025-12-25T10:00:00Z']]) {
      const id=String(index).repeat(8)+'-5555-4555-8555-'+String(index).repeat(12);
      const tid=String(index+2).repeat(8)+'-7777-4777-8777-'+String(index+2).repeat(12);
      rows.sessions.push({...rows.sessions[0],id,occurred_at:date});
      rows.zoom_transcripts.push({...rows.zoom_transcripts[0],id:tid,session_ref:id,original_transcript:'Fictional earlier encounter: discussion remained difficult, and each participant described a different response.'});
      rows.session_capture_drafts.push({...rows.session_capture_drafts[0],session_id:id,sessions:{...rows.session_capture_drafts[0].sessions,id,occurred_at:date}});
    }
    let firstFrame, firstEvidence;
    const rendered=new Set();
    for (const lens of CLIENT_SESSION_SUMMARY_LENSES) {
      const res=await invoke(handler,{clientId,...extra,lens,summaryOptions:{audience:'shared'}});
      expect(res.statusCode).toBe(200);
      const request=runTextAI.mock.calls.at(-1)[0];
      const packet=JSON.parse(request.messages[1].content);
      expect(packet.comparisonFrame.sessions).toHaveLength(3);
      const evidence=packet.sourceBlocks || packet.evidenceMap;
      if (firstFrame) { expect(packet.comparisonFrame).toEqual(firstFrame);expect(evidence).toEqual(firstEvidence); }
      firstFrame=packet.comparisonFrame;firstEvidence=evidence;
      expect(request.messages[0].content).toContain('ACROSS-SESSION REVIEW — DISTINCT DOCUMENT PURPOSE');
      expect(res.payload.data.draft.body).toBe(renderClientSessionSummary(output().sections,lens,'across_session_review'));
      rendered.add(res.payload.data.draft.body);
    }
    expect(rendered.size).toBe(5);
  });
  it('accepts an older General request as Integrative without exposing a separate General approach',async()=>{
    const res=await invoke(handler,{clientId,...extra,window:'current',lens:'general'});
    expect(res.statusCode).toBe(200);expect(res.payload.data.lens).toBe('integrative');
  });
});
