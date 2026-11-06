import { isSummaryReviewNotice, isUnusableSummary } from '../../src/lib/summarySafety.js';

export const CLINICAL_RECORD_FIELDS = Object.freeze([
  'presentingConcerns', 'sessionThemes', 'interventionsUsed', 'clientResponse',
  'riskSafeguarding', 'progressGoals', 'planNextSession'
]);

export const CLINICAL_RECORD_FIELD_LABELS = Object.freeze({
  presentingConcerns:'Presenting concerns',sessionThemes:'Session themes',
  interventionsUsed:'Interventions used',clientResponse:'Client response',
  riskSafeguarding:'Risk and safeguarding',progressGoals:'Progress toward goals',
  planNextSession:'Plan for next session'
});

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validUuid(id){return typeof id==='string' && UUID.test(id)}
export function compactSourceText(value,limit=6500){
  return typeof value==='string'?value.trim().slice(0,limit):'';
}
export function parseApprovedRecord(notes){
  if(typeof notes!=='string'||!notes.trim())return '';
  let row;try{row=JSON.parse(notes)}catch{return ''}
  if(!row || typeof row!=='object'||Array.isArray(row))return '';
  return CLINICAL_RECORD_FIELDS.map(key=>{
    const val=compactSourceText(row[key],1100);
    return val?`${CLINICAL_RECORD_FIELD_LABELS[key]}: ${val}`:'';
  }).filter(Boolean).join('\n');
}
export function buildClinicalRecordSources({sessionId,sessions=[],captures=[],summaries=[],careItems=[]}){
  const bySession=new Map(sessions.map(s=>[String(s.id),s]));
  const result=[];
  const seen=new Set();
  function add({id,kind,title,sessionId:linkedSession,recordId,updatedAt,occurredAt,reviewStatus,text}){
    if(!text || !text.trim() || seen.has(id))return;
    seen.add(id);
    result.push({id,kind,title,sessionId:linkedSession||null,recordId:recordId||null,
      updatedAt:updatedAt||null,occurredAt:occurredAt||null,
      reviewStatus:reviewStatus||'secondary',text:compactSourceText(text,7200)});
  }
  for(const capture of captures){
    if(capture.status!=='reviewed'|| !bySession.has(String(capture.session_id)))continue;
    const text=CLINICAL_RECORD_FIELDS.map(key=>{
      const part=compactSourceText(capture.content?.[key],1200);
      return part?`${CLINICAL_RECORD_FIELD_LABELS[key]}: ${part}`:'';
    }).filter(Boolean).join('\n');
    const sess=bySession.get(String(capture.session_id));
    add({id:`capture:${capture.session_id}`,kind:'reviewed_capture',title:'Reviewed Session Capture',
      sessionId:capture.session_id,recordId:capture.session_id,updatedAt:capture.updated_at||capture.reviewed_at,
      occurredAt:sess.occurred_at,reviewStatus:'reviewed',text});
  }
  for(const doc of summaries){
    if(isUnusableSummary(doc.content)||isSummaryReviewNotice(doc.content?.body))continue;
    const anchors=(doc.source_manifest||[]).map(row=>String(row.sessionId||'')).filter(id=>bySession.has(id));
    if(!anchors.length)continue;
    const anchor=anchors[0];
    add({id:`summary:${doc.id}`,kind:'session_summary',title:doc.title||'Saved Session Summary',
      sessionId:anchor,recordId:doc.id,updatedAt:doc.updated_at,occurredAt:bySession.get(anchor)?.occurred_at,
      reviewStatus:doc.status==='completed'?'finalised':'working draft',text:doc.content?.body});
  }
  for(const sess of sessions){
    if(sess.status!=='completed')continue;
    const text=parseApprovedRecord(sess.notes);
    add({id:`record:${sess.id}`,kind:'approved_record',title:'Approved Clinical Record',
      sessionId:sess.id,recordId:sess.id,updatedAt:sess.updated_at,occurredAt:sess.occurred_at,
      reviewStatus:'approved',text});
  }
  for(const item of careItems){
    const text=compactSourceText(item.body,1500);
    add({id:`focus:${item.id}`,kind:'current_focus',title:'Therapist-maintained current focus',
      sessionId:item.provenance_session_id,recordId:item.id,updatedAt:item.updated_at,
      reviewStatus:'therapist-maintained',text});
  }
  return result.sort((a,b)=>{
    const pa=a.sessionId===sessionId?0:a.kind==='current_focus'?1:2;
    const pb=b.sessionId===sessionId?0:b.kind==='current_focus'?1:2;
    return pa-pb || Date.parse(b.occurredAt||b.updatedAt||0)-Date.parse(a.occurredAt||a.updatedAt||0);
  }).slice(0,12);
}

export function validateClinicalRecordSuggestions(raw,sources,focusField=null){
  let obj;try{obj=typeof raw==='string'?JSON.parse(raw):raw}catch{return null}
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||!obj.fields||typeof obj.fields!=='object')return null;
  const allowed=new Map(sources.map(s=>[s.id,s]));
  if(Object.keys(obj.fields).some(k=>!CLINICAL_RECORD_FIELDS.includes(k)))return null;
  const fields={};let supported=0;
  for(const key of CLINICAL_RECORD_FIELDS){
    const field=obj.fields[key];
    if(!field||typeof field!=='object'||typeof field.text!=='string'||!Array.isArray(field.evidence))return null;
    const text=field.text.trim();
    if(text.length>1800 || isSummaryReviewNotice(text) || field.evidence.length>4)return null;
    if(!text && field.evidence.length)return null;
    const evidence=[];
    for(const ref of field.evidence){
      if(typeof ref?.sourceId!=='string'||typeof ref?.quote!=='string'||ref.quote.trim().length<8||ref.quote.length>650)return null;
      const source=allowed.get(ref.sourceId);
      if(!source||!source.text.includes(ref.quote))return null;
      evidence.push({sourceId:source.id,quote:ref.quote,sourceTitle:source.title,kind:source.kind,
        occurredAt:source.occurredAt,recordId:source.recordId,updatedAt:source.updatedAt,
        reviewStatus:source.reviewStatus});
    }
    if(text&&!evidence.length)return null;
    if(text)supported++;
    fields[key]={text,evidence};
  }
  if(focusField && CLINICAL_RECORD_FIELDS.some(key=>key!==focusField && fields[key].text))return null;
  if(!supported)return {fields,outcome:'insufficient_evidence'};
  return {fields,outcome:'ready'};
}