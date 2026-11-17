import { assertDocumentSourcesUsable, assertSourceAvailable } from './source-review.js';
import { buildClinicalRecordSources, validUuid } from './clinical-record-evidence.js';

// Bound every query and disclose the history window instead of silently claiming all history.
export const MATERIAL_LIMIT = 200;
async function rows(query) {
  const {data,error}=await query;
  if(error)throw error;
  return data||[];
}
export async function loadClinicalRecordMaterial(db,userId,clientId,session) {
  const history=await rows(db.from('sessions').select('id,client_id,user_id,status,occurred_at,notes,updated_at')
    .eq('user_id',userId).eq('client_id',clientId).lte('occurred_at',session.occurred_at)
    .order('occurred_at',{ascending:false}).limit(MATERIAL_LIMIT+1));
  const sessions=[session,...history.filter(row=>row.id!==session.id)].slice(0,MATERIAL_LIMIT);
  const ids=sessions.map(row=>row.id);
  const links=await rows(db.from('zoom_transcripts').select('id,client_id,session_ref,source_version,source_review,original_transcript,updated_at')
    .eq('therapist_user_id',userId).eq('client_id',clientId).in('session_ref',ids).is('deleted_at',null).limit(401));
  if(links.length>400)throw Object.assign(new Error('Too many transcript sources to check safely. Review a narrower encounter history before preparing this record.'),{status:409,code:'SOURCE_REVIEW_REQUIRED'});
  const excluded=new Set(links.filter(row=>!row.source_version||['needs_review','separated'].includes(row.source_review?.state)).map(row=>row.session_ref));
  const safeSessions=sessions.filter(row=>!excluded.has(row.id));
  const safeIds=new Set(safeSessions.map(row=>row.id));
  const captures=await rows(db.from('session_capture_drafts').select('session_id,content,status,reviewed_at,updated_at')
    .eq('user_id',userId).eq('client_id',clientId).in('session_id',ids).limit(201));
  const docs=await rows(db.from('documents').select('id,title,status,content,source_manifest,updated_at')
    .eq('user_id',userId).eq('client_id',clientId).eq('document_type','session_summary').is('archived_at',null)
    .order('updated_at',{ascending:false}).limit(401));
  const summaries=[], unavailable=[];
  for(const doc of docs){
    const anchors=(doc.source_manifest||[]).filter(source=>safeIds.has(source.sessionId));
    if(!anchors.length){unavailable.push({id:`summary:${doc.id}`,title:doc.title||'Session Summary',reason:'No usable encounter link within this history window. Open the client documents to check its source.'});continue;}
    try{await assertDocumentSourcesUsable(db,userId,{...doc,user_id:userId,client_id:clientId,document_type:'session_summary'});summaries.push(doc);}
    catch(error){if(error.code!=='SOURCE_REVIEW_REQUIRED')throw error;unavailable.push({id:`summary:${doc.id}`,title:doc.title||'Session Summary',sessionId:anchors[0].sessionId,reason:'Its underlying source needs review.'});}
  }
  const careItems=await rows(db.from('client_care_items').select('id,body,kind,status,updated_at,provenance_session_id')
    .eq('therapist_id',userId).eq('client_id',clientId).eq('status','current')
    .in('kind',['current_focus','shared_understanding','themes','change_noticed'])
    .order('updated_at',{ascending:false}).limit(201));
  const reflections=await rows(db.from('private_reflections').select('id,body,session_ref,created_at,updated_at')
    .eq('user_id',userId).eq('client_id',clientId).lte('created_at',session.occurred_at)
    .order('created_at',{ascending:false}).limit(201));
  // Reflections attached to this encounter are valid even when written after its start.
  const currentReflections=await rows(db.from('private_reflections').select('id,body,session_ref,created_at,updated_at')
    .eq('user_id',userId).eq('client_id',clientId).eq('session_ref',session.id).limit(201));
  const eligibleReflections=[...new Map([...currentReflections,...reflections].map(row=>[row.id,row])).values()]
    .filter(row=>!row.session_ref||safeIds.has(row.session_ref));
  const sources=buildClinicalRecordSources({sessionId:session.id,sessions:safeSessions,captures,summaries,
    careItems:careItems.filter(row=>!row.provenance_session_id||safeIds.has(row.provenance_session_id)),
    reflections:eligibleReflections,transcripts:links.filter(row=>safeIds.has(row.session_ref))});
  for(const capture of captures){
    if(capture.status!=='reviewed')unavailable.push({id:`capture:${capture.session_id}`,title:'Session Capture',sessionId:capture.session_id,reason:'Draft capture: review it before reuse.'});
  }
  for(const link of links){
    if(excluded.has(link.session_ref)||link.source_review?.state!=='confirmed')unavailable.push({id:`transcript:${link.id}`,title:'Session transcript',sessionId:link.session_ref,reason:'Confirm the assigned client and source before reusing its transcript.'});
  }
  return {sources,unavailable,sessionId:session.id,clientId,
    historyLimited:history.length>MATERIAL_LIMIT||docs.length>400||links.length>400||captures.length>200||reflections.length>200||currentReflections.length>200||careItems.length>200,
    sessionsChecked:sessions.length,currentSourceBlocked:excluded.has(session.id),
    snapshot:{sessionId:session.id,links,sessions:safeSessions,captures,summaries,careItems,reflections:eligibleReflections}};
}
export function materialInventory(material){
  return {clientId:material.clientId,sessionId:material.sessionId,sessionsChecked:material.sessionsChecked,
    historyLimited:material.historyLimited,currentSourceBlocked:material.currentSourceBlocked,
    sources:material.sources.map(({text,...source})=>({...source,preview:text.slice(0,1200),requiresSelection:source.kind==='private_reflection'})),
    unavailable:material.unavailable};
}
export function validMaterialSelection(value){
  return value===undefined||(Array.isArray(value)&&value.length<=2000&&new Set(value).size===value.length&&value.every(id=>typeof id==='string'&&/^(capture|summary|record|focus|reflection|transcript):/.test(id)&&validUuid(id.split(':')[1])));
}
export function selectClinicalMaterial(sources,selectedSourceIds){
  const explicit=Array.isArray(selectedSourceIds);
  const selected=new Set(selectedSourceIds||[]);
  if(explicit&&selectedSourceIds.some(id=>!sources.some(source=>source.id===id)))throw Object.assign(new Error('A selected source changed or is no longer available. Refresh the source list. Your draft is unchanged.'),{status:409,code:'SOURCE_CHANGED'});
  return sources.filter(source=>explicit?selected.has(source.id):source.kind!=='private_reflection');
}
