import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  CLINICAL_RECORD_FIELDS,buildClinicalRecordPassages,clinicalRecordAnchoredResponseFormat,
  materializeClinicalRecordPassages,validateClinicalRecordSuggestions
} from '../api/_lib/clinical-record-evidence.js';
import { generateValidatedClinicalRecordSuggestions } from '../api/_lib/clinical-record-generation.js';

const clientOne=[
  {id:'summary:one',kind:'session_summary',reviewStatus:'working draft',title:'Current session',
    text:'Session themes: The client described prolonged unemployment and continuing concern about work.\nClient response: The client noticed being caught in thought and experienced a powerful difference when speaking clearly.'},
  {id:'record:one',kind:'approved_record',reviewStatus:'approved',title:'Historical record',
    text:'Presenting concerns: The client initially sought help after a difficult period with family conflict.\nInterventions used: The therapist explored the client\'s experience through sensing and reflection.'}
];
const empty=()=>Object.fromEntries(CLINICAL_RECORD_FIELDS.map(key=>[key,{text:'',evidence:[]}]));
const chosen=(passageId,text='The client described prolonged unemployment.')=>{
  const fields=empty();
  fields.sessionThemes={text,evidence:[{passageId}]};
  return {fields};
};
const completion=raw=>({model:'synthetic',completion:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]}});

test('builds a bounded exact-source catalog without paraphrasing or losing earlier records',()=>{
  const list=buildClinicalRecordPassages(clientOne);
  assert.ok(list.length>=4);
  assert.equal(list[0].sourceId,clientOne[0].id);
  assert.equal(list[1].sourceId,clientOne[1].id);
  assert.equal(list[0].id,'passage_1');
  assert.equal(list[1].id,'passage_2');
  for(const item of list){
    const source=clientOne.find(row=>row.id===item.sourceId);
    assert.ok(source.text.includes(item.text));
    assert.ok(item.text.length>=8 && item.text.length<=420);
  }
  assert.deepEqual(buildClinicalRecordPassages(clientOne),list);
});

test('long single-line clinical material splits into source-exact bounded passage spans',()=>{
  const text=Array.from({length:90},(_,i)=>'Clinical note '+i+' described a subjective experience.').join(' ');
  const passages=buildClinicalRecordPassages([{id:'current',text}],{maxPassages:12,maxLength:170});
  assert.ok(passages.length>1);
  for(const item of passages){
    assert.ok(text.includes(item.text));
    assert.ok(item.text.length<=170);
  }
});

test('structured provider contract permits ONLY enumerated passage IDs, not model-authored quotes',()=>{
  const passages=buildClinicalRecordPassages(clientOne);
  const schema=clinicalRecordAnchoredResponseFormat(passages).json_schema;
  assert.equal(schema.strict,true);
  assert.equal(schema.schema.additionalProperties,false);
  assert.deepEqual(schema.schema.properties.fields.required,CLINICAL_RECORD_FIELDS);
  for(const key of CLINICAL_RECORD_FIELDS){
    const citation=schema.schema.properties.fields.properties[key].properties.evidence.items;
    assert.deepEqual(citation.required,['passageId']);
    assert.deepEqual(citation.properties.passageId.enum,passages.map(x=>x.id));
    assert.equal(citation.additionalProperties,false);
  }
});

test('model citations become actual saved-source quotes, with existing strict validation intact',()=>{
  const passages=buildClinicalRecordPassages(clientOne);
  const raw=chosen(passages[0].id);
  const before=structuredClone(raw);
  const converted=materializeClinicalRecordPassages(raw,passages);
  assert.deepEqual(raw,before);
  assert.deepEqual(converted.fields.sessionThemes.evidence,
    [{sourceId:passages[0].sourceId,quote:passages[0].text}]);
  const verified=validateClinicalRecordSuggestions(converted,clientOne);
  assert.equal(verified.fieldResults.sessionThemes.state,'supported');
  assert.equal(verified.fields.sessionThemes.evidence[0].quote,passages[0].text);
  assert.equal(verified.verification,'source_quotes_only');
});

test('invented passage ID is withheld without a fuzzy source fallback or leakage',()=>{
  const passages=buildClinicalRecordPassages(clientOne);
  const raw=chosen('other-clients-private-record','SECRET_UNSUPPORTED_CANDIDATE');
  const result=validateClinicalRecordSuggestions(materializeClinicalRecordPassages(raw,passages),clientOne);
  assert.equal(result.fieldResults.sessionThemes.code,'UNKNOWN_SOURCE');
  assert.equal(result.fields.sessionThemes.text,'');
  assert.ok(!JSON.stringify(result).includes('SECRET_UNSUPPORTED_CANDIDATE'));
  assert.ok(!JSON.stringify(result).includes('other-clients-private-record'));
});

test('using IDs from the correct catalogue cannot sneak in an additional invented citation',()=>{
  const passages=buildClinicalRecordPassages(clientOne);
  const raw=chosen(passages[0].id);
  raw.fields.sessionThemes.evidence.push({passageId:'outside_catalog'});
  const result=validateClinicalRecordSuggestions(materializeClinicalRecordPassages(raw,passages),clientOne);
  assert.equal(result.fieldResults.sessionThemes.code,'UNKNOWN_SOURCE');
});

test('a focused request leaves every nonrequested field blank while preserving matching quote provenance',()=>{
  const passages=buildClinicalRecordPassages(clientOne);
  const raw=chosen(passages[0].id);
  const result=validateClinicalRecordSuggestions(materializeClinicalRecordPassages(raw,passages),clientOne,'presentingConcerns');
  assert.equal(result.fields.sessionThemes.text,'');
  assert.equal(result.fieldResults.sessionThemes.state,'not_requested');
});

test('AI passage selection is repaired server-side before validation in one bounded model call',async()=>{
  const passages=buildClinicalRecordPassages(clientOne);
  let calls=0;
  const result=await generateValidatedClinicalRecordSuggestions({
    request:{messages:[{role:'system',content:'synthetic'}]},sources:clientOne,passages,
    run:async()=>{calls++;return completion(chosen(passages[0].id));}
  });
  assert.equal(calls,1);
  assert.equal(result.checked.outcome,'ready');
  assert.equal(result.checked.fields.sessionThemes.evidence[0].quote,passages[0].text);
});
