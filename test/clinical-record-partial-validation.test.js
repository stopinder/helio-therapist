import test from 'node:test';
import assert from 'node:assert/strict';
import { CLINICAL_RECORD_FIELDS, validateClinicalRecordSuggestions, clinicalRecordResponseProblem } from '../api/_lib/clinical-record-evidence.js';
import { generateValidatedClinicalRecordSuggestions } from '../api/_lib/clinical-record-generation.js';
import { mergeClinicalRecordSuggestionResult } from '../src/lib/clinicalRecordSuggestionState.js';

const quote='The fictional client described persistent anxiety at work.';
const otherQuote='We explored responses to workplace stress.';
const sources=[{id:'record:synthetic',recordId:'synthetic',kind:'approved_record',reviewStatus:'approved',updatedAt:'2026-11-01',title:'Synthetic approved record',text:quote+'\n'+otherQuote}];
const empty=()=>Object.fromEntries(CLINICAL_RECORD_FIELDS.map(key=>[key,{text:'',evidence:[]}]));
const supported=()=>({text:'The client initially described work-related anxiety.',evidence:[{sourceId:sources[0].id,quote}]});
function mixed(bad){const fields=empty();fields.presentingConcerns=supported();fields.riskSafeguarding=bad;return {fields};}
const inspect=raw=>validateClinicalRecordSuggestions(raw,sources);

test('partial recovery retains exact valid wording and evidence without mutating input',()=>{
  const raw=mixed({text:'No risk identified.',evidence:[]});
  const before=structuredClone(raw);
  const result=inspect(raw);
  assert.equal(result.outcome,'partial');
  assert.equal(result.supportedFieldCount,1);
  assert.equal(result.fields.presentingConcerns.text,raw.fields.presentingConcerns.text);
  assert.equal(result.fields.presentingConcerns.evidence[0].quote,quote);
  assert.deepEqual(result.fields.riskSafeguarding,{text:'',evidence:[]});
  assert.equal(result.fieldResults.riskSafeguarding.code,'MISSING_EVIDENCE');
  assert.equal(result.verification,'source_quotes_only');
  assert.deepEqual(raw,before);
  assert.ok(!JSON.stringify(result).includes('No risk identified.'));
});

for(const [name,bad,code] of [
  ['paraphrased quotation',{text:'Rejected statement.',evidence:[{sourceId:sources[0].id,quote:'Client was anxious at work.'}]},'QUOTE_NOT_FOUND'],
  ['unknown source',{text:'Foreign candidate text.',evidence:[{sourceId:'other-client-secret-id',quote:'Confidential other client passage.'}]},'UNKNOWN_SOURCE'],
  ['short quotation',{text:'Rejected statement.',evidence:[{sourceId:sources[0].id,quote:'Anxiety'}]},'INVALID_QUOTE'],
  ['overlong quotation',{text:'Rejected statement.',evidence:[{sourceId:sources[0].id,quote:'x'.repeat(651)}]},'INVALID_QUOTE'],
  ['overlong wording',{text:'x'.repeat(1801),evidence:supported().evidence},'TEXT_TOO_LONG'],
  ['five quotes',{text:'Rejected statement.',evidence:Array.from({length:5},()=>supported().evidence[0])},'TOO_MANY_QUOTES'],
  ['invalid evidence type',{text:'Rejected statement.',evidence:'not-an-array'},'INVALID_FIELD'],
  ['array field',[],'INVALID_FIELD'],
  ['unexpected field property',{...supported(),approved:true},'INVALID_FIELD'],
  ['extra citation property',{text:'Rejected statement.',evidence:[{...supported().evidence[0],approved:true}]},'INVALID_QUOTE'],
  ['empty wording with citation',{text:'',evidence:supported().evidence},'EMPTY_WITH_EVIDENCE']
]){
  test(name+' blanks only its field with a specific non-sensitive explanation',()=>{
    const result=inspect(mixed(bad));
    assert.equal(result.outcome,'partial');
    assert.equal(result.fieldResults.riskSafeguarding.code,code);
    assert.deepEqual(result.fields.riskSafeguarding,{text:'',evidence:[]});
    assert.equal(result.fields.presentingConcerns.text,supported().text);
    assert.ok(!JSON.stringify(result).includes('other-client-secret-id'));
    assert.ok(!JSON.stringify(result).includes('Foreign candidate text.'));
    assert.ok(!JSON.stringify(result).includes('Confidential other client passage.'));
  });
}

test('one bad citation blanks the whole field rather than laundering it through a good citation',()=>{
  const raw=mixed({text:'Valid and unsupported claims combined.',evidence:[...supported().evidence,{sourceId:sources[0].id,quote:'Invented additional intervention.'}]});
  assert.deepEqual(inspect(raw).fields.riskSafeguarding,{text:'',evidence:[]});
});
test('no fuzzy quote matching or punctuation rewriting is introduced',()=>{
  const fields=empty();fields.sessionThemes={text:'Suggested interpretation.',evidence:[{sourceId:sources[0].id,quote:quote.replace('.','!')}]};
  assert.equal(inspect({fields}).fieldResults.sessionThemes.code,'QUOTE_NOT_FOUND');
});
test('missing one field does not discard valid fields',()=>{
  const raw=mixed({text:'',evidence:[]});delete raw.fields.sessionThemes;
  const result=inspect(raw);assert.equal(result.outcome,'partial');
  assert.equal(result.fieldResults.sessionThemes.code,'MISSING_FIELD');
  assert.equal(result.fields.presentingConcerns.text,supported().text);
});
test('all unsupported fields produce explicit blanks, never inferred negative findings',()=>{
  const result=inspect({fields:empty()});
  assert.equal(result.outcome,'insufficient_evidence');
  assert.equal(result.fieldResults.riskSafeguarding.state,'empty');
  assert.equal(result.fields.riskSafeguarding.text,'');
  assert.match(result.fieldResults.riskSafeguarding.message,/not a negative clinical finding/);
});
test('malformed envelopes fail closed and report no clinical content',()=>{
  for(const [raw,code] of [['{broken','INVALID_JSON'],[{presentingConcerns:supported()},'INVALID_ENVELOPE'],[{fields:[]},'INVALID_ENVELOPE'],[{fields:{...empty(),otherClient:supported()}},'UNKNOWN_FIELD'],[{fields:empty(),extra:'private'},'INVALID_ENVELOPE']]){
    assert.equal(inspect(raw),null);
    assert.equal(clinicalRecordResponseProblem(raw).code,code);
  }
  assert.equal(validateClinicalRecordSuggestions({fields:empty()},[...sources,...sources]),null);
});
test('focused request does not expose or apply other generated fields',()=>{
  const raw=mixed({text:'An unrequested statement.',evidence:supported().evidence});
  const result=validateClinicalRecordSuggestions(raw,sources,'presentingConcerns');
  assert.equal(result.outcome,'ready');
  assert.equal(result.fields.presentingConcerns.text,supported().text);
  assert.equal(result.fields.riskSafeguarding.text,'');
  assert.equal(result.fieldResults.riskSafeguarding.state,'not_requested');
  assert.ok(!JSON.stringify(result).includes('An unrequested statement.'));
});

const completion=(raw,finish='stop')=>({model:'synthetic-model',completion:{choices:[{finish_reason:finish,message:{content:typeof raw==='string'?raw:JSON.stringify(raw)}}]}});
const request={messages:[{role:'system',content:'Synthetic source-constrained request.'}]};
test('partial field success returns on the first call without an automatic regeneration loop',async()=>{
  let calls=0;
  const result=await generateValidatedClinicalRecordSuggestions({request,sources,run:async()=>{calls++;return completion(mixed({text:'Unverified risk claim',evidence:[]}));}});
  assert.equal(calls,1);assert.equal(result.attempts,1);assert.equal(result.checked.outcome,'partial');
});
test('one format repair can return partial results without discarding supported fields',async()=>{
  let calls=0;
  const result=await generateValidatedClinicalRecordSuggestions({request,sources,run:async(next)=>{
    calls++;
    if(calls===1)return completion('invalid_json');
    assert.equal(next.messages.some(message=>message.role==='assistant'),false);
    return completion(mixed({text:'Unverified risk claim',evidence:[]}));
  }});
  assert.equal(calls,2);assert.equal(result.checked.outcome,'partial');
});
test('failed envelope repair remains bounded and does not return rejected prose',async()=>{
  let calls=0;
  const result=await generateValidatedClinicalRecordSuggestions({request,sources,run:async()=>{calls++;return completion('REJECTED_PRIVATE_OUTPUT');}});
  assert.equal(calls,2);assert.equal(result.checked,null);assert.equal(result.problem.code,'INVALID_JSON');
  assert.ok(!JSON.stringify(result).includes('REJECTED_PRIVATE_OUTPUT'));
});
test('valid but entirely unsupported response is not retried as a technical failure',async()=>{
  let calls=0;
  const result=await generateValidatedClinicalRecordSuggestions({request,sources,run:async()=>{calls++;return completion({fields:empty()});}});
  assert.equal(calls,1);assert.equal(result.checked.outcome,'insufficient_evidence');
});

function uiResult(raw,focusField=null){return {...validateClinicalRecordSuggestions(raw,sources,focusField),sources:sources.map(({text,...metadata})=>metadata),clientId:'synthetic-client',sessionId:'synthetic-session'};}
test('retry of a single field preserves other current suggestions and their evidence',()=>{
  const first=uiResult(mixed({text:'Failed candidate',evidence:[]}));
  const next=uiResult({fields:empty()},'riskSafeguarding');
  const merged=mergeClinicalRecordSuggestionResult(first,next,'riskSafeguarding');
  assert.deepEqual(merged.fields.presentingConcerns,first.fields.presentingConcerns);
  assert.equal(merged.fieldResults.riskSafeguarding.state,'empty');
  assert.equal(merged.issues.length,0);
});
test('focused retry does not retain suggestions whose sources have changed or disappeared',()=>{
  const first=uiResult(mixed({text:'',evidence:[]}));
  const next=uiResult({fields:empty()},'riskSafeguarding');next.sources=[];
  const merged=mergeClinicalRecordSuggestionResult(first,next,'riskSafeguarding');
  assert.equal(merged.fields.presentingConcerns.text,'');
  assert.equal(merged.fieldResults.presentingConcerns.code,'SOURCE_CHANGED');
});
