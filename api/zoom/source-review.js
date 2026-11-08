import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { SOURCE_REVIEW_FIELDS,presentReview,sourceConfirmationContext } from '../_lib/source-review.js';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const {supabase,user}=await requireAuthenticatedUser(req);
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:{message:'Method not allowed'}})}
    const id=req.method==='GET'?req.query.id:req.body?.transcriptId;
    if(!uuid(id))return res.status(400).json({error:{code:'INVALID_REQUEST',message:'Choose a valid transcript.'}});
    const {data:row,error}=await supabase.from('zoom_transcripts').select(SOURCE_REVIEW_FIELDS).eq('id',id).eq('therapist_user_id',user.id).is('deleted_at',null).maybeSingle();
    if(error)throw error;if(!row)return res.status(404).json({error:{code:'SOURCE_NOT_FOUND',message:'Source not found.'}});
    if(req.method==='GET'){
      let segments=[];
      if(row.source_review?.state==='separated'){
        const {data:children,error:childError}=await supabase.from('zoom_transcripts').select('id,client_id,session_ref,source_start_line,source_end_line').eq('therapist_user_id',user.id).eq('source_parent_id',id).is('deleted_at',null).order('source_start_line');
        if(childError)throw childError;segments=(children||[]).map(child=>({id:child.id,clientId:child.client_id,sessionId:child.session_ref,startLine:child.source_start_line,endLine:child.source_end_line}));
      }
      return res.status(200).json({data:{...presentReview(row),text:row.original_transcript,zoomNote:row.zoom_generated_summary,occurredAt:row.source_occurred_at,parentId:row.source_parent_id,segments}});
    }
    const {action,sourceVersion,context='',segments=[],reviewed=false}=req.body||{};
    if(!['confirm','split'].includes(action)||!uuid(sourceVersion)||reviewed!==true||typeof context!=='string'||context.length>4000||!Array.isArray(segments))return res.status(400).json({error:{code:'INVALID_REVIEW',message:'Review the source and confirm the selected action.'}});
    if(action==='split'&&(segments.length<2||segments.length>10||segments.some(s=>s?.reviewed!==true||!Number.isInteger(s.startLine)||!Number.isInteger(s.endLine)||!uuid(s.clientId)||typeof s.occurredAt!=='string'||!Number.isFinite(Date.parse(s.occurredAt)))))return res.status(400).json({error:{code:'INVALID_SEGMENTS',message:'Choose valid conversation ranges, clients and dates.'}});
    // The checked therapist attestation is sufficient for a one-encounter confirmation.
    // Preserve optional details, but never demand arbitrary filler just to pass the SQL context length check.
    const reviewContext=action==='confirm'?sourceConfirmationContext(context):context;
    const {data,error:saveError}=await supabase.rpc('resolve_transcript_source_review',{p_user_id:user.id,p_transcript_id:id,p_expected_version:sourceVersion,p_action:action,p_context:reviewContext,p_evidence:[],p_segments:segments});
    if(saveError){
      const status=saveError.code==='40001'?409:saveError.code==='42501'?403:400;
      const code=saveError.code==='40001'?'SOURCE_CHANGED':saveError.code==='42501'?'SOURCE_REVIEW_FORBIDDEN':'INVALID_REVIEW';
      // Server-side diagnostic contains no client identity or transcript content.
      console.warn('[Source review save rejected]',{action,dbCode:saveError.code||'unknown',status});
      const message=code==='SOURCE_REVIEW_FORBIDDEN'
        ? 'The server refused to save this confirmation. Your session material is unchanged. Contact support with the SOURCE_REVIEW_FORBIDDEN error code.'
        : code==='SOURCE_CHANGED'
          ? 'The session source changed. Reload and review the current source before confirming.'
          : (saveError.message||'The confirmation could not be saved.');
      return res.status(status).json({error:{code,message}});
    }
    return res.status(200).json({data});
  }catch(error){console.error('[Source review]',error.code||'unavailable');return res.status(error.status||500).json({error:{code:error.code||'SOURCE_REVIEW_UNAVAILABLE',message:error.status===401?'Please sign in again.':'Source review is unavailable. Nothing has been changed.'}})}
}
