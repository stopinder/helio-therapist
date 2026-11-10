import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUMMARY_MODALITIES, normalizeIntelligenceOptions, getSummaryModality } from '../src/lib/summaryModalities.js';
import { assertModalityRegistry, modalityStrategy } from '../api/_lib/modality-intelligence/profiles/index.js';
import { evidenceSchema, formulationSchema, compositionSchema, validateShape, verifyEvidence, verifyFormulation, compositionIssues, renderModalityDocument, parseOutput } from '../api/_lib/modality-intelligence/contracts.js';
import { runModalityPipeline } from '../api/_lib/modality-intelligence/pipeline.js';
import { parseModalityRequest } from '../api/ai/modality-summary.js';
import { summaryClinicalEvidence } from '../src/lib/summaryEvidence.js';
import { parseSummaryBlocks } from '../src/lib/summaryAuthoring.js';
import { assertClientDocumentContent, isUnusableSummary } from '../src/lib/summarySafety.js';
import { packFixture, evidenceFixture, formulationFixture, compositionFixture, completed, SOURCE_ID, SYNTHETIC_MODALITY_CASES } from './fixtures/modality-intelligence.js';

const base={pack:packFixture(),lens:'gentle_cbt',options:{mode:'client_summary',includeZoomSummary:false},summaryOptions:{audience:'individual',addition:'none'},requirements:{exercise:false}};
const clone=value=>structuredClone(value);
function staged(lens,composed=compositionFixture(lens)) {let index=0;const calls=[];return {calls,run:async request=>{calls.push(request);return completed([evidenceFixture(),formulationFixture(lens),composed][index++]);}};}

test('each modality registers independent formulation keys, composition keys and strategy',()=>{
  assert.doesNotThrow(assertModalityRegistry);
  const profiles=Object.keys(SUMMARY_MODALITIES).map(modalityStrategy);
  assert.equal(profiles.length,5);
  for(const key of ['reasoning','composition'])assert.equal(new Set(profiles.map(p=>p[key])).size,5);
  assert.equal(new Set(profiles.map(p=>Object.keys(p.formulation).join(','))).size,5);
  assert.equal(new Set(profiles.map(p=>Object.keys(p.sections).join(','))).size,5);
  assert.throws(()=>getSummaryModality('unknown'),{code:'INVALID_MODALITY'});
  assert.throws(()=>getSummaryModality('__proto__'),{code:'INVALID_MODALITY'});
});
test('strict options and malformed request validation fail before source access',()=>{
  assert.deepEqual(normalizeIntelligenceOptions(),{mode:'client_summary',includeZoomSummary:false});
  for(const value of [null,[],{includeZoomSummary:'yes'},{mode:'other'},{untrusted:true}])assert.throws(()=>normalizeIntelligenceOptions(value));
  for(const body of [null,[],{}, {clientId:[],scope:'longitudinal'}, {clientId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',scope:'encounter'}])assert.throws(()=>parseModalityRequest(body),{code:'INVALID_REQUEST'});
});
test('source evidence requires exact passages, unique ids and valid priority references',()=>{
  const evidence=verifyEvidence(evidenceFixture(),packFixture().sources);
  assert.equal(evidence.observations[0].secondaryOnly,false);
  assert.equal(evidence.observations[0].encounterIds.length,1);
  for(const mutate of [v=>v.observations[0].citations[0].quote='This quotation never appeared in the source.',v=>v.observations.push(clone(v.observations[0])),v=>v.priorities[0].observationIds=['unknown']]){
    const v=evidenceFixture();mutate(v);assert.throws(()=>verifyEvidence(v,packFixture().sources));
  }
});
test('Zoom note plus transcript from one encounter never becomes two independent encounters',()=>{
  const pack=packFixture();pack.sources.push({...pack.sources[0],id:'zoom:z',type:'zoom_summary',secondary:true});
  const value=evidenceFixture();value.observations[0].citations.push({sourceId:'zoom:z',quote:value.observations[0].citations[0].quote});
  assert.equal(verifyEvidence(value,pack.sources).observations[0].encounterIds.length,1);
  const secondary=evidenceFixture();secondary.observations[0].citations[0].sourceId='zoom:z';
  assert.equal(verifyEvidence(secondary,pack.sources).observations[0].secondaryOnly,true);
});
test('provider shape cannot smuggle extra fields or claim success after truncation',()=>{
  assert.equal(validateShape({...evidenceFixture(),extra:'untrusted'},evidenceSchema([SOURCE_ID])),false);
  const out=completed(evidenceFixture()).completion;out.choices[0].finish_reason='length';assert.throws(()=>parseOutput(out,evidenceSchema([SOURCE_ID])),{code:'AI_RESPONSE_TRUNCATED'});
});
for(const lens of Object.keys(SUMMARY_MODALITIES))test(`${lens}: evidence -> own formulation -> own client composition`,async()=>{
  const mock=staged(lens);const result=await runModalityPipeline({...base,lens,run:mock.run});
  assert.equal(mock.calls.length,3);
  assert.equal(mock.calls[0].responseFormat.json_schema.schema.properties.observations.type,'array');
  assert.deepEqual(Object.keys(mock.calls[1].responseFormat.json_schema.schema.properties.fields.properties),Object.keys(SUMMARY_MODALITIES[lens].formulation));
  assert.deepEqual(Object.keys(result.draft.sections),Object.keys(SUMMARY_MODALITIES[lens].sections));
  assert.ok(result.draft.body.includes(Object.values(SUMMARY_MODALITIES[lens].sections)[0]));
  assert.doesNotMatch(result.draft.body,/What we worked on|Making sense of the work/);
  assert.equal(result.formulation.visibility,'therapist_only');
  assert.equal(result.claims[0].citations[0].sourceId,SOURCE_ID);
  assert.equal(result.architecture.clinicalVerification,'therapist_review_required');
  assert.equal(result.usage.totalTokens,600);
});
test('evidence extraction sees identical material for every lens and does not receive modality theory',async()=>{
  const firstInputs=[];
  for(const lens of Object.keys(SUMMARY_MODALITIES)){const mock=staged(lens);await runModalityPipeline({...base,lens,run:mock.run});firstInputs.push(JSON.stringify(mock.calls[0].messages));}
  assert.equal(new Set(firstInputs).size,1);
});
test('therapist mode stops after formulation and has no client draft/exportable body',async()=>{
  const mock=staged('gentle_cbt');const result=await runModalityPipeline({...base,options:{mode:'therapist_formulation'},run:mock.run});
  assert.equal(mock.calls.length,2);assert.equal(result.draft,undefined);assert.equal(result.formulation.visibility,'therapist_only');
  assert.throws(()=>assertClientDocumentContent(result),{code:'PRIVATE_FORMULATION_NOT_CLIENT_DOCUMENT'});
  assert.equal(isUnusableSummary({clinicalIntelligence:{generation:{mode:'therapist_formulation'}}}),true);
});
test('source concern stops the pipeline without generating or fabricating a draft',async()=>{
  const value={...evidenceFixture(),outcome:'needs_review',reviewMessage:'Check which encounter this source belongs to.'};let calls=0;
  const result=await runModalityPipeline({...base,run:async()=>{calls++;return completed(value)}});
  assert.equal(calls,1);assert.equal(result.outcome,'needs_review');assert.equal(result.draft,undefined);
});
test('unsupported formulation references and assertive hypotheses are rejected',()=>{
  const e=verifyEvidence(evidenceFixture(),packFixture().sources), f=formulationFixture('gentle_cbt');f.fields.situations[0].evidenceIds=['made-up'];assert.throws(()=>verifyFormulation(f,e,modalityStrategy('gentle_cbt')));
  const c=compositionFixture('gentle_cbt');c.sections.cycle.claims[0].status='hypothesis';assert.ok(compositionIssues(c,e).includes('UNLABELLED_HYPOTHESIS'));
});
test('composition cannot quietly drop the requested eight steps or a check-in',()=>{
  const c=compositionFixture('gentle_cbt'),e=verifyEvidence(evidenceFixture(),packFixture().sources),requirements={exercise:true,eightPoint:true,somaticCheckIn:true};
  assert.ok(compositionIssues(c,e,requirements).includes('REQUESTED_EXERCISE_MISSING'));
  c.practice={status:'ready',title:'Adapted sensing practice',introduction:'Optional guidance for therapist review.',sequenceBasis:'adaptation',steps:Array.from({length:8},(_,i)=>({number:i+1,instruction:'Gently notice the bodily sensations already present.',evidenceIds:[]})),checkInSteps:[{number:1,instruction:'Together, briefly notice the contact of your feet.',evidenceIds:[]},{number:2,instruction:'Notice sensations while listening to your partner speaking.',evidenceIds:[]}],safety:'Pause or stop if this feels uncomfortable.',clarification:''};
  assert.deepEqual(compositionIssues(c,e,requirements),[]);
  c.practice.steps.pop();assert.ok(compositionIssues(c,e,requirements).includes('REQUESTED_EXERCISE_MISSING'));
});
test('canonical or supplied sequence cannot be replaced by an unlabelled general adaptation',async()=>{
  const c=compositionFixture('gentle_cbt');c.practice.status='needs_clarification';c.practice.clarification='No precise sequence was supplied.';
  const mock=staged('gentle_cbt',c);
  await assert.rejects(runModalityPipeline({...base,requirements:{exercise:true,requiresSuppliedSequence:true},run:mock.run}),{code:'EXERCISE_SEQUENCE_UNAVAILABLE'});
  assert.equal(mock.calls.length,3);
});
test('one bounded repair fixes missing instructions; a second failure never returns a successful draft',async()=>{
  const wrong=compositionFixture('gentle_cbt');wrong.sections.cycle.body+=' An unsupported extra claim.';
  let calls=0;const outputs=[evidenceFixture(),formulationFixture('gentle_cbt'),wrong,wrong];
  await assert.rejects(runModalityPipeline({...base,run:async()=>completed(outputs[calls++])}),{code:'INTELLIGENCE_DELIVERABLE_INCOMPLETE'});assert.equal(calls,4);
});
test('new modality headings render as headings and proposed check-ins never become encounter evidence',()=>{
  const body=renderModalityDocument(compositionFixture('integrative'),modalityStrategy('integrative'));
  assert.equal(parseSummaryBlocks(body)[0].type,'heading');
  const source=body+'\n\nOptional exercise to consider\n\n1. Sense the feet gently.\n\nSomatic check-in\n\nListen to a partner while sensing.\n';
  assert.doesNotMatch(summaryClinicalEvidence(source),/Sense the feet|Listen to a partner/);
});
test('fixed comparison cases are synthetic and retain uncertainty instead of rewarding theory labels',()=>{
  assert.equal(SYNTHETIC_MODALITY_CASES.length,3);
  for(const item of SYNTHETIC_MODALITY_CASES){assert.ok(item.text && item.focus && item.excludedConclusion);}
  for(const lens of Object.keys(SUMMARY_MODALITIES)){const profile=modalityStrategy(lens);assert.ok(profile.reasoning.length>150);assert.ok(profile.composition.length>100);}
});
test('private formulation never enters either persistence projection; both screens use the same pipeline',()=>{
  for(const path of ['src/views/SessionWorkspace.vue','src/components/workspace/ClientDocumentComposer.vue']){
    const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.match(source,/intelligenceOptions:\{mode:intelligenceMode\.value,includeZoomSummary:includeZoomSummary\.value\}/);
    assert.match(source,/if\(result.mode==='therapist_formulation'\)\{privateFormulation.value=result.formulation;/);
    assert.match(source,/assertClientSummaryProjection\(result\)/);
    assert.doesNotMatch(source,/content:[^\n]*formulation/);
  }
});

test('an explicit exclusion or historical description is not a request for a new exercise',async()=>{
  const {effectiveSummaryOptions}=await import('../src/lib/summaryAuthoring.js');
  for(const request of ['Do not include an exercise.','We described a sensing practice during the session.','Avoid providing instructions for a new exercise.'])assert.equal(effectiveSummaryOptions({},request).addition,'none');
  assert.equal(effectiveSummaryOptions({},'Please provide instructions for the eight-point sensing exercise.').addition,'exercise');
});

test('duplicate source identifiers cannot fabricate independent evidence',()=>{
  const pack=packFixture();
  assert.throws(()=>verifyEvidence(evidenceFixture(),[...pack.sources,pack.sources[0]]),{code:'DUPLICATE_SOURCE_ID'});
});
