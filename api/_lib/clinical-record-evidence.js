import { summaryClinicalEvidence } from '../../src/lib/summaryEvidence.js';
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
      reviewStatus:doc.status==='completed'?'finalised':'working draft',text:summaryClinicalEvidence(doc.content?.body)});
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

// Fixed messages only: never echo rejected model text, quotations or unknown source IDs.
const FIELD_PROBLEMS = Object.freeze({
  MISSING_FIELD: 'No suggestion was returned for this field. It has been left blank.',
  INVALID_FIELD: 'The suggestion had an invalid format. It has been left blank.',
  TEXT_TOO_LONG: 'The suggested wording exceeded the field limit. It has been left blank, not truncated.',
  SOURCE_REVIEW_TEXT: 'The response contained a source-review warning rather than clinical wording. It has been left blank.',
  TOO_MANY_QUOTES: 'More than four supporting passages were supplied. The field has been left blank.',
  EMPTY_WITH_EVIDENCE: 'Passages were supplied without suggested wording. The field has been left blank.',
  MISSING_EVIDENCE: 'The suggested wording had no supporting passage. It has been left blank.',
  INVALID_QUOTE: 'A supporting passage was malformed or outside the permitted length. The field has been left blank.',
  UNKNOWN_SOURCE: 'A cited source was not among the permitted records for this request. The field has been left blank.',
  QUOTE_NOT_FOUND: 'A supporting passage was not an exact quotation from its cited record. The field has been left blank.',
  OUTSIDE_REQUEST: 'This field was not requested. Its suggestion has not been used.'
});
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Envelope failures cannot be salvaged safely. Field failures are isolated below. */
export function clinicalRecordResponseProblem(raw){
  let obj;
  try { obj=typeof raw==='string'?JSON.parse(raw):raw; }
  catch { return {code:'INVALID_JSON',message:'The AI response was not readable JSON. No suggestions were used.'}; }
  if(!plainObject(obj) || Object.keys(obj).length!==1 || !Object.hasOwn(obj,'fields') || !plainObject(obj.fields)){
    return {code:'INVALID_ENVELOPE',message:'The AI response did not contain the expected clinical fields object. No suggestions were used.'};
  }
  if(Object.keys(obj.fields).some(key=>!CLINICAL_RECORD_FIELDS.includes(key))){
    return {code:'UNKNOWN_FIELD',message:'The AI response contained an unrecognised clinical field. No suggestions were used.'};
  }
  return null;
}

/**
 * Checks quotation provenance, NOT clinical truth or entailment. The therapist must
 * review the wording and the cited passages. Sources must already be owner/client
 * scoped and source-review checked by the caller; this function never fetches data.
 * A single invalid citation blanks its WHOLE field, not merely the bad citation.
 */
export function validateClinicalRecordSuggestions(raw,sources,focusField=null){
  if(clinicalRecordResponseProblem(raw) || (focusField!==null && !CLINICAL_RECORD_FIELDS.includes(focusField)))return null;
  if(!Array.isArray(sources) || sources.some(source=>!plainObject(source)||typeof source.id!=='string'||!source.id||typeof source.text!=='string'))return null;
  const allowed=new Map(sources.map(source=>[source.id,source]));
  if(allowed.size!==sources.length)return null; // Ambiguous provenance is never guessed.
  const obj=typeof raw==='string'?JSON.parse(raw):raw;
  const fields={},fieldResults={},issues=[];
  let supported=0,rejected=0;
  function withhold(key,code){
    const message=FIELD_PROBLEMS[code];
    fieldResults[key]={state:'withheld',code,message};
    issues.push({field:key,label:CLINICAL_RECORD_FIELD_LABELS[key],code,message});
    rejected++;
  }
  for(const key of CLINICAL_RECORD_FIELDS){
    fields[key]={text:'',evidence:[]};
    const field=obj.fields[key];
    if(focusField && key!==focusField){
      fieldResults[key]={state:'not_requested'};
      if(plainObject(field) && (field.text || field.evidence?.length)){
        issues.push({field:key,label:CLINICAL_RECORD_FIELD_LABELS[key],code:'OUTSIDE_REQUEST',message:FIELD_PROBLEMS.OUTSIDE_REQUEST});
      }
      continue;
    }
    if(!Object.hasOwn(obj.fields,key)){withhold(key,'MISSING_FIELD');continue;}
    if(!plainObject(field)||typeof field.text!=='string'||!Array.isArray(field.evidence)||Object.keys(field).some(name=>!['text','evidence'].includes(name))){withhold(key,'INVALID_FIELD');continue;}
    const text=field.text.trim();
    if(text.length>1800){withhold(key,'TEXT_TOO_LONG');continue;}
    if(isSummaryReviewNotice(text)){withhold(key,'SOURCE_REVIEW_TEXT');continue;}
    if(field.evidence.length>4){withhold(key,'TOO_MANY_QUOTES');continue;}
    if(!text){
      if(field.evidence.length){withhold(key,'EMPTY_WITH_EVIDENCE');continue;}
      fieldResults[key]={state:'empty',code:'NO_SUPPORTED_SUGGESTION',message:'No source-backed suggestion was returned. Left blank; this is not a negative clinical finding.'};
      continue;
    }
    if(!field.evidence.length){withhold(key,'MISSING_EVIDENCE');continue;}
    const evidence=[];
    let problem=null;
    for(const ref of field.evidence){
      if(!plainObject(ref)||Object.keys(ref).some(name=>!['sourceId','quote'].includes(name))||typeof ref.sourceId!=='string'||typeof ref.quote!=='string'||ref.quote.trim().length<8||ref.quote.length>650){problem='INVALID_QUOTE';break;}
      const source=allowed.get(ref.sourceId);
      if(!source){problem='UNKNOWN_SOURCE';break;}
      // Deliberately no fuzzy matching or quote rewriting, including punctuation.
      if(!source.text.includes(ref.quote)){problem='QUOTE_NOT_FOUND';break;}
      evidence.push({sourceId:source.id,quote:ref.quote,sourceTitle:source.title,kind:source.kind,
        occurredAt:source.occurredAt,recordId:source.recordId,updatedAt:source.updatedAt,
        reviewStatus:source.reviewStatus});
    }
    if(problem){withhold(key,problem);continue;}
    supported++;
    fields[key]={text,evidence};
    fieldResults[key]={state:'supported'};
  }
  return {
    fields,fieldResults,issues,supportedFieldCount:supported,
    verification:'source_quotes_only',
    outcome:supported?(rejected?'partial':'ready'):'insufficient_evidence'
  };
}

/** A closed schema so the provider returns the envelope expected by the validator. */
export function clinicalRecordSuggestionsResponseFormat(sourceIds){
  const ids=[...new Set(sourceIds.filter(id=>typeof id==='string' && id))];
  if(!ids.length)throw new Error('Clinical Record suggestions require evidence sources.');
  const fieldShape={type:'object',additionalProperties:false,properties:{
    text:{type:'string'},
    evidence:{type:'array',items:{type:'object',additionalProperties:false,properties:{
      sourceId:{type:'string',enum:ids},quote:{type:'string'}
    },required:['sourceId','quote']}}
  },required:['text','evidence']};
  const keys=[...CLINICAL_RECORD_FIELDS];
  return {type:'json_schema',json_schema:{name:'clinical_record_suggestions_v2',strict:true,schema:{
    type:'object',additionalProperties:false,properties:{
      fields:{type:'object',additionalProperties:false,
        properties:Object.fromEntries(keys.map(key=>[key,structuredClone(fieldShape)])),required:keys}
    },required:['fields']
  }}};
}
