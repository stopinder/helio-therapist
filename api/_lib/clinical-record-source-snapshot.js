import { assertDocumentSourcesUsable, assertSourcesUnchanged } from './source-review.js';

function changed(){
  return Object.assign(new Error('A supporting record changed or became unavailable during preparation. Reload before retrying. Your draft is unchanged.'),{status:409,code:'SOURCE_CHANGED'});
}
function equalSnapshot(before,after,keys){
  return Boolean(before && after && keys.every(key=>JSON.stringify(before[key]??null)===JSON.stringify(after[key]??null)));
}

/** Recheck the same owned/client-scoped evidence before exposing any suggestions. */
export async function assertClinicalRecordSourceSnapshot(db,userId,clientId,selected,snapshot){
  const {data:client,error:clientError}=await db.from('clients').select('id,archived').eq('id',clientId).eq('user_id',userId).maybeSingle();
  if(clientError)throw clientError;
  if(!client || client.archived)throw changed();
  const selectedSessions=new Set([snapshot.sessionId,...selected.map(source=>source.sessionId)].filter(Boolean));
  const links=[...new Map((snapshot.links||[]).filter(row=>selectedSessions.has(row.session_ref)).map(row=>[row.id,row])).values()];
  await assertSourcesUnchanged(db,userId,links);
  for(const source of selected){
    if(source.kind==='session_summary'){
      const before=snapshot.summaries.find(row=>row.id===source.recordId);
      const {data:after,error}=await db.from('documents').select('id,title,status,content,source_manifest,updated_at')
        .eq('id',source.recordId).eq('user_id',userId).eq('client_id',clientId).eq('document_type','session_summary').is('archived_at',null).maybeSingle();
      if(error)throw error;
      if(!equalSnapshot(before,after,['updated_at','status','content','source_manifest']))throw changed();
      await assertDocumentSourcesUsable(db,userId,{...after,user_id:userId,client_id:clientId,document_type:'session_summary'});
    }else if(source.kind==='reviewed_capture'){
      const before=snapshot.captures.find(row=>row.session_id===source.recordId);
      const {data:after,error}=await db.from('session_capture_drafts').select('session_id,content,status,reviewed_at,updated_at')
        .eq('session_id',source.recordId).eq('user_id',userId).eq('client_id',clientId).eq('status','reviewed').maybeSingle();
      if(error)throw error;
      if(!equalSnapshot(before,after,['updated_at','reviewed_at','status','content']))throw changed();
    }else if(source.kind==='approved_record'){
      const before=snapshot.sessions.find(row=>row.id===source.recordId);
      const {data:after,error}=await db.from('sessions').select('id,status,notes,updated_at')
        .eq('id',source.recordId).eq('user_id',userId).eq('client_id',clientId).eq('status','completed').maybeSingle();
      if(error)throw error;
      if(!equalSnapshot(before,after,['updated_at','status','notes']))throw changed();
    }else if(source.kind==='current_focus'){
      const before=snapshot.careItems.find(row=>row.id===source.recordId);
      const {data:after,error}=await db.from('client_care_items').select('id,body,kind,status,updated_at,provenance_session_id')
        .eq('id',source.recordId).eq('therapist_id',userId).eq('client_id',clientId).eq('status','current').maybeSingle();
      if(error)throw error;
      if(!equalSnapshot(before,after,['updated_at','status','kind','body','provenance_session_id']))throw changed();
    }else{
      throw changed();
    }
  }
}
