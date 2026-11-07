import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const [endpoint,workspace,documents]=await Promise.all([
  readFile(new URL('../api/ai/session-summary.js',import.meta.url),'utf8'),
  readFile(new URL('../src/views/SessionWorkspace.vue',import.meta.url),'utf8'),
  readFile(new URL('../src/lib/clientDocuments.js',import.meta.url),'utf8')
]);
test('actual SessionWorkspace generator uses the improved clinical formulation prompt rather than only the client document prompt',()=>{
  assert.match(endpoint,/session-summary-direct-v8-formulation-and-refinement/);
  for(const phrase of ['clinical formulation rather than an administrative account','interacting responses','the clinical learning edge','In CBT','In IFS','Do not invent links']){
    assert.ok(endpoint.includes(phrase),phrase);
  }
  assert.match(endpoint,/SUMMARY_OUTCOME_RULES/);
  assert.match(endpoint,/validateSummaryOutcome/);
  assert.match(endpoint,/assertSourcesUnchanged/);
});
test('direct session summary refinement is bounded and classified as editorial rather than clinical evidence',()=>{
  assert.match(endpoint,/typeof refinementRequest !== 'string'/);
  assert.match(endpoint,/refinementRequest.length > 1800/);
  assert.match(endpoint,/previousDraft.length > 10000/);
  assert.match(endpoint,/therapist-authorised editorial request/i);
  assert.match(endpoint,/previousDraftForComparisonOnly/);
  assert.match(endpoint,/Optional exercise to consider/);
  assert.match(documents,/refinementRequest,previousDraft/);
});
test('refinement is visible on the actual session screen and requires explicit review',()=>{
  assert.match(workspace,/data-testid="session-refine-summary"/);
  assert.match(workspace,/data-testid="session-refinement-input"/);
  assert.match(workspace,/@click="reviewRefinement"/);
  assert.match(workspace,/@click="acceptRefinement"/);
  assert.match(workspace,/preview.body !== summaryDocument.value\?\.content\?\.body/);
  assert.match(workspace,/await generateSummary\(preview.instruction,preview.resource\)/);
  assert.match(workspace,/reviewRequired:true/);
  assert.match(workspace,/reviewedAt:null/);
  assert.match(workspace,/type: 'pre_regeneration'/);
});
test('resources are therapist selected and not misrepresented as recorded session events',()=>{
  assert.match(workspace,/Resource URL \(HTTPS only\)/);
  assert.match(workspace,/parsed.protocol !== 'https:'/);
  assert.match(workspace,/Optional resource to consider \(therapist selected, not discussed or agreed in session\)/);
  assert.match(workspace,/does not approve or finalise it/);
  assert.match(workspace,/YouTube\/results\?search_query=guided\+body\+scan/);
});
