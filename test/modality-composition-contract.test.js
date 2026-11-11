import test from 'node:test';
import assert from 'node:assert/strict';
import { compositionSchema, validateShape, materializeComposition, compositionFailure, safeCompositionChecks } from '../api/_lib/modality-intelligence/contracts.js';
import { runModalityPipeline } from '../api/_lib/modality-intelligence/pipeline.js';
import { packFixture, passageEvidenceFixture, formulationFixture, completed } from './fixtures/modality-intelligence.js';

const lens = 'transactional_analysis';
const practice = () => ({status:'not_requested',title:'',introduction:'',sequenceBasis:'not_applicable',steps:[],checkInSteps:[],safety:'',clarification:''});
const candidate = () => ({sections:{
  exchanges:{claims:[{text:'You described pausing before answering.',evidenceIds:['e1'],status:'observation'}]},
  expectations:{claims:[{text:'An expectation of criticism shaped the exchange.',evidenceIds:['e1'],status:'hypothesis'}]},
  choices:{claims:[]}
},practice:practice()});
async function generate(makeCandidate = () => candidate()) {
  const calls=[];
  const result=await runModalityPipeline({pack:packFixture(),lens,options:{mode:'client_summary'},summaryOptions:{audience:'shared'},requirements:{exercise:false},run:async request=>{
    calls.push(request);const schema=request.responseFormat.json_schema.schema;
    return completed(schema.properties.observations?passageEvidenceFixture(request):schema.properties.fields?formulationFixture(lens):makeCandidate(request));
  }});
  return {result,calls};
}

test('composition writes client prose once instead of duplicating a body and citations',()=>{
  const schema=compositionSchema(lens,['e1'],{exercise:false});
  assert.deepEqual(schema.properties.sections.properties.exchanges.required,['claims']);
  assert.equal(validateShape(candidate(),schema),true);
});
test('TA generation renders cited claims and explicitly marks a tentative interpretation',async()=>{
  const {result,calls}=await generate();
  assert.equal(calls.length,3);
  assert.equal(result.outcome,'ready');
  assert.match(result.draft.body,/One possible interpretation:/);
  assert.ok(result.draft.body.includes('An expectation of criticism shaped the exchange.'));
  for(const claim of result.claims){assert.ok(result.draft.body.includes(claim.text));assert.ok(claim.citations.length);}
  assert.equal(result.draft.body.match(/You described pausing before answering\./g).length,1);
});
test('unrequested practice is prohibited by the provider schema, not discovered after generation',()=>{
  const value=candidate();assert.equal(validateShape(value,compositionSchema(lens,['e1'],{exercise:false})),true);value.practice.title='Unrequested homework';
  assert.equal(validateShape(value,compositionSchema(lens,['e1'],{exercise:false})),false);
});


test('no uncited provider body can be silently dropped during materialisation',async()=>{
  await assert.rejects(generate(()=>{const value=candidate();value.sections.exchanges.body='An unsupported claim outside the evidence map.';return value;}),{code:'INVALID_INTELLIGENCE_OUTPUT'});
});
test('unicode, paragraph breaks and numbered cited prose are preserved exactly once',async()=>{
  const text='You said, \u201cI\u2019m not ready\u2014not yet.\u201d\n\n1. You paused.\n2. You asked for clarification.';
  const {result}=await generate(()=>{const value=candidate();value.sections.exchanges.claims[0].text=text;return value;});
  assert.equal(result.draft.sections.exchanges,text);
  assert.equal(result.claims[0].text,text);
});
test('empty or unreferenced claim remains blocked, not patched into meaningful prose',async()=>{
  for(const text of ['', '   '])await assert.rejects(generate(()=>{const value=candidate();value.sections.expectations.claims[0].text=text;return value;}),{code:'INTELLIGENCE_DELIVERABLE_INCOMPLETE'});
  await assert.rejects(generate(()=>{const value=candidate();value.sections.exchanges.claims[0].evidenceIds=[];return value;}),error=>{
    assert.equal(error.code,'INTELLIGENCE_DELIVERABLE_INCOMPLETE');
    assert.deepEqual(error.validationIssues,['INVALID_CLAIM_REFERENCE']);
    assert.match(error.message,/source material was gathered/);
    assert.doesNotMatch(error.message,/Review your instructions/);
    return true;
  });
});
test('unknown evidence identifiers remain rejected before client rendering',async()=>{
  await assert.rejects(generate(()=>{const value=candidate();value.sections.exchanges.claims[0].evidenceIds=['other-client'];return value;}),{code:'INVALID_INTELLIGENCE_OUTPUT'});
});
test('tentative framing is deterministic and never changes the provider candidate',()=>{
  const value=candidate(),copy=structuredClone(value),first=materializeComposition(value);
  assert.deepEqual(value,copy);
  assert.match(first.sections.expectations.claims[0].text,/^One possible interpretation:/);
  const tentative=candidate();tentative.sections.expectations.claims[0].text='Perhaps an expectation of criticism shaped the exchange.';
  assert.equal(materializeComposition(tentative).sections.expectations.body,'One possible interpretation: '+tentative.sections.expectations.claims[0].text);
  assert.deepEqual(materializeComposition(first),first);
});
test('failure diagnostics accept only known check codes, never clinical or provider text',()=>{
  const failure=compositionFailure(['INVALID_CLAIM_REFERENCE','PRIVATE SOURCE WORDS','https://example.invalid','INVALID_CLAIM_REFERENCE']);
  assert.deepEqual(failure.validationIssues,['INVALID_CLAIM_REFERENCE']);
  assert.doesNotMatch(failure.message,/PRIVATE|example/);
  assert.deepEqual(safeCompositionChecks(null),[]);
  assert.deepEqual(safeCompositionChecks(['__proto__','toString',{},null]),[]);
});
test('no-exercise schema also refuses stray array entries and clarification text',()=>{
  for(const field of ['steps','checkInSteps','clarification']){
    const value=candidate();
    value.practice[field]=field==='clarification'?'Unrequested suggestion':[{number:1,instruction:'Try an exercise that was not requested.',evidenceIds:['e1']}];
    assert.equal(validateShape(value,compositionSchema(lens,['e1'],{exercise:false})),false);
  }
});

test('an ordinary mention of a question or a quoted may is not a tentative interpretation label',async()=>{
  for(const text of ['You heard a question and felt criticised.','You said "I may leave" after hearing the request.']){
    const {result}=await generate(()=>{const value=candidate();value.sections.expectations.claims[0].text=text;return value;});
    assert.equal(result.draft.sections.expectations,'One possible interpretation: '+text);
  }
});
