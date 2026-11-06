import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {buildClinicalRecordSources,validateClinicalRecordSuggestions,parseApprovedRecord,CLINICAL_RECORD_FIELDS} from '../api/_lib/clinical-record-evidence.js';

const sessionId='11111111-1111-4111-8111-111111111111', prior='22222222-2222-4222-8222-222222222222';
const sessions=[{id:sessionId,status:'source_ready',occurred_at:'2026-11-01T12:00:00Z'},{id:prior,status:'completed',notes:JSON.stringify({presentingConcerns:'Client described persistent anxiety at work.',riskSafeguarding:'Risk was not discussed in this encounter.'}),occurred_at:'2026-10-01T12:00:00Z'}];
const capture={session_id:sessionId,status:'reviewed',content:{sessionThemes:'We explored responses to workplace stress.'},reviewed_at:'2026-11-01T13:00:00Z'};
const summary={id:'summary1',title:'Earlier review',content:{body:'Client described persistent anxiety and difficulty switching off after work.'},source_manifest:[{sessionId:prior}],status:'draft',updated_at:'2026-10-02T12:00:00Z'};
const sources=buildClinicalRecordSources({sessionId,sessions,captures:[capture],summaries:[summary,{...summary,id:'bad',content:{body:'Please confirm which client conversation.'}}],careItems:[]});
const fields=()=>Object.fromEntries(CLINICAL_RECORD_FIELDS.map(k=>[k,{text:'',evidence:[]}]))

test('prior presentation is distinguishable from current session and unsafe summaries are excluded',()=>{
  assert.equal(sources[0].id,`capture:${sessionId}`);
  assert.ok(sources.some(x=>x.id==='summary:summary1'));
  assert.ok(sources.some(x=>x.id===`record:${prior}`));
  assert.ok(!sources.some(x=>x.id==='summary:bad'));
  assert.equal(sources.find(x=>x.id===`record:${prior}`).text.includes('Risk and safeguarding:'),true);
});
test('evidence validator accepts exact source quotes only',()=>{
  const out=fields();out.presentingConcerns={text:'Client initially described anxiety at work.',evidence:[{sourceId:`record:${prior}`,quote:'Client described persistent anxiety at work.'}]};
  const valid=validateClinicalRecordSuggestions({fields:out},sources);assert.equal(valid.outcome,'ready');
  const falseQuote=structuredClone(out);falseQuote.presentingConcerns.evidence[0].quote='Imagined evidence from a different client';
  assert.equal(validateClinicalRecordSuggestions({fields:falseQuote},sources),null);
  const invalidText=structuredClone(out);invalidText.sessionThemes.text='An unsupported new diagnosis';
  assert.equal(validateClinicalRecordSuggestions({fields:invalidText},sources),null);
});
test('focused suggestion leaves other fields blank',()=>{
  const out=fields();out.sessionThemes={text:'Existing session activity',evidence:[{sourceId:`capture:${sessionId}`,quote:'We explored responses to workplace stress.'}]};
  assert.equal(validateClinicalRecordSuggestions({fields:out},sources,'presentingConcerns'),null);
});
test('legacy raw text notes are not silently used as structured evidence',()=>{
  assert.equal(parseApprovedRecord('Client seems fine.'),'');
  assert.equal(parseApprovedRecord('{broken json'), '');
});
test('Clinical Record UI has explicit source acceptance and review gates',()=>{
  const ui=fs.readFileSync(new URL('../src/components/workspace/ClinicalSummaryTab.vue',import.meta.url),'utf8');
  assert.match(ui,/Prepare from existing material/);
  assert.match(ui,/Ask Helios: presenting concerns/);
  assert.match(ui,/View supporting passages/);
  assert.match(ui,/aiSuggestionProvenance/);
  assert.match(ui,/hasAcceptedSuggestions && !evidenceReviewed/);
  assert.match(ui,/@input="onClinicalFieldEdited\(key\)"/);
});

test('provider response schema matches the exact seven-field validator envelope',async()=>{
  const {clinicalRecordSuggestionsResponseFormat}=await import('../api/_lib/clinical-record-evidence.js');
  const schema=clinicalRecordSuggestionsResponseFormat(sources.map(item=>item.id)).json_schema;
  assert.equal(schema.strict,true);
  assert.deepEqual(schema.schema.required,['fields']);
  assert.deepEqual(schema.schema.properties.fields.required,CLINICAL_RECORD_FIELDS);
  assert.equal(schema.schema.additionalProperties,false);
  for(const key of CLINICAL_RECORD_FIELDS){
    const field=schema.schema.properties.fields.properties[key];
    assert.deepEqual(field.required,['text','evidence']);
    assert.deepEqual(field.properties.evidence.items.required,['sourceId','quote']);
    assert.equal(field.properties.evidence.items.properties.sourceId.enum.includes('summary:summary1'),true);
  }
});
test('clinical suggestion handler requests the closed schema and preserves draft on failure',()=>{
  const handler=fs.readFileSync(new URL('../api/ai/clinical-record-suggestions.js',import.meta.url),'utf8');
  assert.match(handler,/clinicalRecordSuggestionsResponseFormat\(selected\.map\(item=>item\.id\)\)/);
  assert.match(handler,/Return exactly one JSON object with a top-level "fields" property/);
  assert.match(handler,/one constrained repair/);
  assert.match(handler,/if\(!checked\)return res\.status\(502\)/);
  assert.match(handler,/Your draft is unchanged/);
});
