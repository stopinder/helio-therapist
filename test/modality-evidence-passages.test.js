import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareEvidencePassages, resolveEvidencePassages, MAX_EVIDENCE_PASSAGES, MAX_PASSAGE_CHARS } from '../api/_lib/modality-intelligence/evidence-passages.js';
import { verifyEvidence, validateShape, parseOutput } from '../api/_lib/modality-intelligence/contracts.js';
import { runModalityPipeline } from '../api/_lib/modality-intelligence/pipeline.js';
import { packFixture, evidenceFixture, passageEvidenceFixture, formulationFixture, compositionCandidateFixture, completed } from './fixtures/modality-intelligence.js';

const candidate = (prepared, ids=[prepared.sources[0].passages[0].id]) => {
  const value = evidenceFixture();
  value.observations[0].citations=ids.map(passageId=>({passageId}));
  return value;
};
const unusual='Partner A: I\u2019m not ready\u2014not yet.\r\nPartner B: \u201cI heard you.\u201d\tWe paused. \ud83c\udf3f\n';

test('passages preserve every original character, punctuation, line break and surrogate pair',()=>{
  const sources=packFixture(unusual.repeat(2500)).sources;
  const prepared=prepareEvidencePassages(sources);
  const passages=prepared.sources[0].passages;
  assert.equal(passages.map(p=>p.text).join(''),sources[0].text);
  assert.equal(Object.hasOwn(prepared.sources[0],'text'),false);
  for(const passage of passages){
    assert.ok(passage.text.length<=MAX_PASSAGE_CHARS+7);
    assert.doesNotMatch(passage.text,/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/);
    const stored=prepared.byId.get(passage.id);
    assert.equal(stored.quote,sources[0].text.slice(stored.start,stored.end));
  }
});
test('the final short fragment is retained instead of silently discarded',()=>{
  for(const tail of ['.',' no','\r\nend']){
    const sources=packFixture('x'.repeat(MAX_PASSAGE_CHARS)+tail).sources;
    const prepared=prepareEvidencePassages(sources);
    assert.equal(prepared.sources[0].passages.map(p=>p.text).join(''),sources[0].text);
    assert.equal(prepared.sources[0].passages.length,1);
  }
});
test('model-selected IDs resolve to exact text with original identity, date and source rank',()=>{
  const primary={...packFixture(unusual).sources[0],occurredAt:'2026-01-02'};
  const secondary={...primary,id:'zoom:secondary',type:'zoom_summary',secondary:true};
  const prepared=prepareEvidencePassages([primary,secondary]);
  const id=prepared.sources[1].passages[0].id;
  const resolved=resolveEvidencePassages(candidate(prepared,[id]),prepared,[primary,secondary]);
  const result=verifyEvidence(resolved,[primary,secondary]);
  assert.equal(result.observations[0].citations[0].quote,secondary.text);
  assert.equal(result.observations[0].citations[0].sourceId,secondary.id);
  assert.equal(result.observations[0].citations[0].occurredAt,secondary.occurredAt);
  assert.equal(result.observations[0].secondaryOnly,true);
  assert.deepEqual(result.observations[0].encounterIds,[primary.encounterId]);
});
test('invented IDs and model-supplied quote/source overrides are never accepted',()=>{
  const sources=packFixture().sources,prepared=prepareEvidencePassages(sources);
  for(const entry of [{passageId:'invented'},{passageId:prepared.sources[0].passages[0].id,quote:'Fabricated words.'},{passageId:prepared.sources[0].passages[0].id,sourceId:'another-client'}]){
    const value=candidate(prepared);value.observations[0].citations=[entry];
    assert.equal(validateShape(value,prepared.schema),false);
    assert.throws(()=>resolveEvidencePassages(value,prepared,sources),{code:'INVALID_SOURCE_PASSAGE'});
  }
});
test('different source, text, or range gives a different passage identity',()=>{
  const sources=packFixture().sources;
  const original=prepareEvidencePassages(sources);
  for(const changed of [{...sources[0],id:'transcript:other'},{...sources[0],range:{start:1500}},{...sources[0],text:sources[0].text+' Changed.'}]){
    const other=prepareEvidencePassages([changed]);
    assert.notEqual(other.sources[0].passages[0].id,original.sources[0].passages[0].id);
    assert.throws(()=>resolveEvidencePassages(candidate(other),original,sources),{code:'INVALID_SOURCE_PASSAGE'});
  }
});
test('mutating an original after preparation cannot turn stale offsets into verified evidence',()=>{
  const sources=packFixture().sources,prepared=prepareEvidencePassages(sources);
  sources[0].text='Entirely changed material.';
  assert.throws(()=>resolveEvidencePassages(candidate(prepared),prepared,sources),{code:'INVALID_SOURCE_PASSAGE'});
});
test('genuine source concerns remain blocking and use exact server-resolved review evidence',()=>{
  const sources=packFixture().sources,prepared=prepareEvidencePassages(sources);
  const value=candidate(prepared);value.outcome='needs_review';value.reviewMessage='Review the assignment.';value.reviewEvidence=value.observations[0].citations;
  const result=verifyEvidence(resolveEvidencePassages(value,prepared,sources),sources);
  assert.equal(result.outcome,'needs_review');assert.equal(result.reviewEvidence[0].quote,sources[0].text);
});
test('schema remains inside the aggregate enum limit even at the passage ceiling',()=>{
  const sources=Array.from({length:MAX_EVIDENCE_PASSAGES},(_,i)=>({...packFixture('A distinct short source.').sources[0],id:'source:'+i}));
  const prepared=prepareEvidencePassages(sources);
  const count=value=>!value||typeof value!=='object'?0:(value.enum?.length||0)+Object.entries(value).filter(([k])=>k!=='enum').reduce((n,[,v])=>n+count(v),0);
  assert.ok(count(prepared.schema)<1000);
  assert.throws(()=>prepareEvidencePassages([...sources,{...sources[0],id:'one-too-many'}]),{code:'EVIDENCE_WINDOW_TOO_LARGE'});
});
test('provider truncation remains a failure, not a partially successful passage review',()=>{
  const sources=packFixture().sources,prepared=prepareEvidencePassages(sources);
  const result=completed(candidate(prepared)).completion;result.choices[0].finish_reason='length';
  assert.throws(()=>parseOutput(result,prepared.schema),{code:'AI_RESPONSE_TRUNCATED'});
});
test('legacy invented quotations still fail the independent exact-source verifier',()=>{
  const value=evidenceFixture();value.observations[0].citations[0].quote='These words were never said.';
  assert.throws(()=>verifyEvidence(value,packFixture().sources),{code:'UNVERIFIED_SOURCE_QUOTE'});
});
test('duplicate observation IDs have a distinct error rather than masquerading as a quote mismatch',()=>{
  const value=evidenceFixture();value.observations.push(structuredClone(value.observations[0]));
  assert.throws(()=>verifyEvidence(value,packFixture().sources),{code:'INVALID_EVIDENCE_REFERENCE'});
});
test('complete pipeline no longer asks the provider to copy or repair punctuation',async()=>{
  let calls=0;const requests=[];
  const pack=packFixture(unusual);
  const result=await runModalityPipeline({pack,lens:'gentle_cbt',options:{mode:'client_summary'},summaryOptions:{audience:'shared'},requirements:{exercise:false},run:async request=>{
    requests.push(request);calls++;
    return completed(calls===1?passageEvidenceFixture(request):calls===2?formulationFixture('gentle_cbt'):compositionCandidateFixture('gentle_cbt'));
  }});
  assert.equal(calls,3);assert.equal(result.outcome,'ready');
  assert.equal(result.claims[0].citations[0].quote,unusual);
  assert.ok(result.architecture.checks.includes('source_passage_ids'));
  assert.deepEqual(requests[0].responseFormat.json_schema.schema.properties.observations.items.properties.citations.items.required,['passageId']);
});
