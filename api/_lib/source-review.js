import { isUnusableSummary } from '../../src/lib/summarySafety.js';
export const SOURCE_REVIEW_FIELDS='id,therapist_user_id,client_id,session_ref,original_transcript,zoom_generated_summary,source_version,source_review,source_parent_id,source_parent_version,source_occurred_at,updated_at';
/**
 * The therapist's explicit checked acknowledgement is the review evidence.
 * A free-text participant explanation is optional, not an artificial ten-character gate.
 * The existing source-review RPC still requires a nonempty, auditable context.
 */
export const SOURCE_CONFIRMATION_ATTESTATION='Therapist confirmed the reviewed source represents one encounter for the assigned client.';
export function sourceConfirmationContext(extra=''){
  if(typeof extra!=='string')throw Object.assign(new Error('Invalid participant context.'),{code:'INVALID_REVIEW',status:400});
  const detail=extra.trim();
  const context=detail ? SOURCE_CONFIRMATION_ATTESTATION+' Additional therapist context: '+detail : SOURCE_CONFIRMATION_ATTESTATION;
  if(context.length>4000)throw Object.assign(new Error('Participant context is too long.'),{code:'INVALID_REVIEW',status:400});
  return context;
}

export function reviewRequired(message='Review the source before sharing or generating this summary.',review=null){
  return Object.assign(new Error(message),{status:409,code:'SOURCE_REVIEW_REQUIRED',review});
}
export function presentReview(row){return {transcriptId:row.id,sessionId:row.session_ref,clientId:row.client_id,sourceVersion:row.source_version,state:row.source_review?.state||'unreviewed',message:row.source_review?.context||'Check the original source before continuing.',evidence:row.source_review?.evidence||[]}}
export function assertSourceAvailable(row){
  if(!row?.source_version)throw Object.assign(new Error('Source-review migration is required before generation.'),{status:503,code:'SOURCE_REVIEW_UNAVAILABLE'});
  if(['needs_review','separated'].includes(row.source_review?.state))throw reviewRequired(undefined,presentReview(row));
}
export async function flagSourceReview(db,userId,row,review){
  const {data,error}=await db.rpc('resolve_transcript_source_review',{p_user_id:userId,p_transcript_id:row.id,p_expected_version:row.source_version,p_action:'flag',p_context:review.message,p_evidence:review.evidence||[],p_segments:[]});
  if(error)throw Object.assign(new Error('The source changed during review. Reload it before retrying.'),{status:409,code:'SOURCE_CHANGED'});
  return {...review,transcriptId:row.id,sessionId:row.session_ref,sourceVersion:data.sourceVersion,state:'needs_review'};
}
export async function assertSourcesUnchanged(db,userId,sources){
  for(const source of sources){
    const {data,error}=await db.from('zoom_transcripts').select('id,source_version,source_review,client_id,session_ref').eq('id',source.id).eq('therapist_user_id',userId).is('deleted_at',null).maybeSingle();
    if(error)throw error;
    if(!data || data.source_version!==source.source_version || (source.client_id && data.client_id!==source.client_id) || data.session_ref!==source.session_ref)throw Object.assign(new Error('The source changed during generation. Your previous draft is unchanged.'),{status:409,code:'SOURCE_CHANGED'});
    assertSourceAvailable(data);
  }
}
/** Follow saved evidence recursively within the same owner/client, including legacy summaries. */
export async function assertDocumentSourcesUsable(db,userId,document,visited=new Set()){
  if(document.document_type!=='session_summary')return;
  if(isUnusableSummary(document.content))throw reviewRequired('This saved item is a source-review notice, not a usable summary. Review its source and regenerate.');
  if(visited.has(document.id)||visited.size>=12)throw reviewRequired('The summary evidence chain needs review.');
  visited.add(document.id);
  try{
    for(const source of document.source_manifest||[]){
      if(source.kind==='session_summary'&&source.documentId){
        const {data,error}=await db.from('documents').select('id,user_id,client_id,document_type,content,source_manifest').eq('id',source.documentId).eq('user_id',userId).eq('client_id',document.client_id).maybeSingle();
        if(error)throw error;if(!data)throw reviewRequired('An underlying summary is unavailable.');
        await assertDocumentSourcesUsable(db,userId,data,visited);
      }
      if(!source.sessionId)continue;
      let query=db.from('zoom_transcripts').select(SOURCE_REVIEW_FIELDS).eq('therapist_user_id',userId).eq('client_id',document.client_id).eq('session_ref',source.sessionId).is('deleted_at',null);
      if(source.transcriptId)query=query.eq('id',source.transcriptId);
      const {data:rows,error}=await query;if(error)throw error;
      if(source.kind==='zoom_transcript'&&!rows?.length)throw reviewRequired('The linked source is unavailable or was reassigned.');
      for(const row of rows||[]){assertSourceAvailable(row);if(source.sourceVersion&&source.sourceVersion!==row.source_version)throw reviewRequired('The source changed after this draft was generated. Review and regenerate.',presentReview(row));}
    }
  }finally{visited.delete(document.id)}
}
export async function documentReviewStatus(db,userId,document){
  try{await assertDocumentSourcesUsable(db,userId,document);return {safe:true}}
  catch(error){
    if(error.code!=='SOURCE_REVIEW_REQUIRED')throw error;
    let sources=error.review?[error.review]:[];
    const ids=[...new Set((document.source_manifest||[]).map(s=>s.sessionId).filter(Boolean))];
    if(!sources.length&&ids.length){
      const {data, error:readError}=await db.from('zoom_transcripts').select('id,session_ref,client_id,source_version,source_review').eq('therapist_user_id',userId).eq('client_id',document.client_id).in('session_ref',ids).is('deleted_at',null);
      if(readError)throw readError;sources=(data||[]).map(presentReview);
    }
    return {safe:false,review:{message:error.message,sources}};
  }
}

/** New drafts need an explicit therapist review before finalisation. */
export function assertTherapistApprovedSummary(document){
  if(document?.document_type!=='session_summary')return;
  const generation=document?.content?.summaryGeneration;
  if(generation?.reviewRequired!==true)return; // Do not retrospectively gate legacy records.
  if(typeof generation.reviewedAt!=='string'||!Number.isFinite(Date.parse(generation.reviewedAt))){
    throw Object.assign(new Error('Review and approve the editable session summary before finalising.'),{status:409,code:'THERAPIST_REVIEW_REQUIRED'});
  }
}
