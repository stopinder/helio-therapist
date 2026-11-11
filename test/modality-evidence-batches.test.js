import test from 'node:test';
import assert from 'node:assert/strict';
import {planEvidenceBatches,MAX_BATCH_SOURCE_CHARS,MAX_BATCH_JSON_CHARS,MAX_WINDOW_SOURCE_CHARS,modalityWorkflowLimits} from '../api/_lib/modality-intelligence/evidence-batches.js';
import {runModalityPipeline} from '../api/_lib/modality-intelligence/pipeline.js';
import {packFixture,evidenceFixture,formulationFixture,compositionCandidateFixture,completed} from './fixtures/modality-intelligence.js';

const source=(n,size=80000)=>({id:`transcript:${n}`,type:'transcript',encounterId:`session:${n}`,occurredAt:`2026-01-0${n}`,secondary:false,text:('Client: A synthetic observation about the session.\n').repeat(Math.ceil(size/50)).slice(0,size)+`\nFinal observation for session ${n}.`});
function assertCovered(original,plan) {
  for(const item of original){const parts=plan.batches.flatMap(b=>b.sources).filter(s=>s.id===item.id).sort((a,b)=>a.range.start-b.range.start);let covered=0;
    for(const part of parts){assert.ok(part.range.start<=covered);assert.equal(part.text,item.text.slice(part.range.start,part.range.end));assert.equal(part.encounterId,item.encounterId);assert.equal(part.occurredAt,item.occurredAt);covered=Math.max(covered,part.range.end);}
    assert.equal(covered,item.text.length);
  }
}
test('three recent long sessions above the former 160k limit keep every source and its ending',()=>{
  const sources=[source(1),source(2),source(3)],plan=planEvidenceBatches(sources);
  assert.ok(plan.sourceChars>160000);assert.equal(plan.batches.length,3);assertCovered(sources,plan);
  for(const batch of plan.batches){assert.ok(batch.sourceChars<=MAX_BATCH_SOURCE_CHARS);assert.ok(JSON.stringify(batch.sources).length<=MAX_BATCH_JSON_CHARS);}
});
test('one long transcript is split into overlapping contiguous ranges without loss or false encounter identities',()=>{
  const sources=[source(1,260000)],plan=planEvidenceBatches(sources);assertCovered(sources,plan);assert.equal(plan.sourceCount,1);assert.equal(new Set(plan.coverage.map(c=>c.encounterId)).size,1);assert.ok(plan.coverage[1].start<plan.coverage[0].end);
});
test('escaped input is bounded by serialized size as well as raw length',()=>{
  const sources=[{...source(1),text:'\u0000'.repeat(80000)}],plan=planEvidenceBatches(sources);assertCovered(sources,plan);for(const b of plan.batches)assert.ok(JSON.stringify(b.sources).length<=MAX_BATCH_JSON_CHARS);
});
test('true oversized windows fail explicitly without silently selecting fewer sessions',()=>{
  assert.throws(()=>planEvidenceBatches([source(1,MAX_WINDOW_SOURCE_CHARS+1)]),{code:'EVIDENCE_WINDOW_TOO_LARGE',status:413});
});
test('small requests retain the original workflow allocation and multi-batch allocation stays bounded',()=>{
  assert.deepEqual(modalityWorkflowLimits(planEvidenceBatches([source(1,100)]),'client_summary'),{maxCalls:4,maxInputChars:500000,maxOutputTokens:16500});
  const budget=modalityWorkflowLimits(planEvidenceBatches([source(1),source(2),source(3)]),'client_summary');assert.equal(budget.maxCalls,7);assert.ok(budget.maxOutputTokens<35000);
});

function mockStages({reviewBatch=0,invalidQuote=false,emptyBatch=0}={}){
  const calls=[];let batch=0;
  return {calls,run:async request=>{
    calls.push(request);const input=JSON.parse(request.messages[1].content),schema=request.responseFormat.json_schema.schema;
    if(schema.properties.observations){batch++;const s=input.sources[0],value=evidenceFixture();value.observations[0].text=`Observation from ${s.encounterId}.`;value.observations[0].citations=[invalidQuote?{passageId:s.passages[0].id,quote:'A quote not in the supplied batch.'}:{passageId:s.passages.at(-1).id}];
      if(batch===reviewBatch){value.outcome='needs_review';value.reviewMessage='Check this encounter.';value.reviewEvidence=value.observations[0].citations;}
      if(batch===emptyBatch){value.observations=[];value.priorities=[];value.gaps=['No salient observations in this part.'];}
      return completed(value);
    }
    if(schema.properties.priorities&&!schema.properties.fields)return completed({priorities:[{observationIds:[input.observations[0].id],importance:'A supported focus across the selected window.'}]});
    if(schema.properties.fields)return completed(formulationFixture('gentle_cbt'));
    return completed(compositionCandidateFixture('gentle_cbt'));
  }};
}
const request=sources=>({pack:{...packFixture(),sources},lens:'gentle_cbt',options:{mode:'client_summary'},summaryOptions:{audience:'shared'},requirements:{exercise:false}});
test('large-window pipeline reads every batch before formulation and preserves unique evidence ids and source coverage',async()=>{
  const sources=[source(1),source(2),source(3)],mock=mockStages();const out=await runModalityPipeline({...request(sources),run:mock.run});
  assert.equal(out.outcome,'ready');assert.equal(mock.calls.length,6);assert.equal(out.architecture.evidenceCoverage.batchCount,3);assert.equal(out.formulation.evidence.length,3);assert.equal(new Set(out.formulation.evidence.map(o=>o.id)).size,3);
  const extraction=mock.calls.filter(c=>c.responseFormat.json_schema.schema.properties.observations);
  for(let n=1;n<=3;n++)assert.ok(extraction.some(c=>c.messages[1].content.includes(`Final observation for session ${n}.`)));
});
test('a source concern in any batch stops composition rather than dropping the problematic batch',async()=>{
  const mock=mockStages({reviewBatch:2});const out=await runModalityPipeline({...request([source(1),source(2),source(3)]),run:mock.run});assert.equal(out.outcome,'needs_review');assert.equal(out.draft,undefined);assert.ok(mock.calls.every(c=>c.responseFormat.json_schema.schema.properties.observations));
});
test('model-supplied quotation text is rejected rather than replacing an exact source passage',async()=>{
  const mock=mockStages({invalidQuote:true});await assert.rejects(runModalityPipeline({...request([source(1),source(2)]),run:mock.run}),{code:'INVALID_INTELLIGENCE_OUTPUT'});
});
test('an uninformative batch is still covered and its limitations are retained',async()=>{
  const mock=mockStages({emptyBatch:2});const out=await runModalityPipeline({...request([source(1),source(2)]),run:mock.run});assert.equal(out.outcome,'ready');assert.equal(out.architecture.evidenceCoverage.batchCount,2);assert.ok(mock.calls.some(c=>c.messages[1].content.includes('No salient observations in this part.')));
});

test('a quote elsewhere in the full source is not accepted as evidence read from a different batch',async()=>{
  const item=source(1,220000);item.text+=' A unique statement appearing only at the end.';
  let first=true;const mock=mockStages();
  await assert.rejects(runModalityPipeline({...request([item]),run:async req=>{
    if(first){first=false;const v=evidenceFixture();v.observations[0].citations=[{sourceId:item.id,quote:'A unique statement appearing only at the end.'}];return completed(v);}
    return mock.run(req);
  }}),{code:'INVALID_INTELLIGENCE_OUTPUT'});
});
