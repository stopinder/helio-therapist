import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';
import { normalizeSummaryOptions, safeResourceUrl, resourceAppendix } from '../src/lib/summaryAuthoring.js';
const [endpoint,workspace,documents,panel]=await Promise.all([
 readFile(new URL('../api/ai/session-summary.js',import.meta.url),'utf8'),
 readFile(new URL('../src/views/SessionWorkspace.vue',import.meta.url),'utf8'),
 readFile(new URL('../src/lib/clientDocuments.js',import.meta.url),'utf8'),
 readFile(new URL('../src/components/workspace/SummaryRefinementPanel.vue',import.meta.url),'utf8')
]);
test('actual SessionWorkspace generator uses the shared clinical formulation prompt rather than a separate copy',()=>{
 assert.match(endpoint,/clientSessionSummarySystemPrompt\(lens,summaryOptions\)/);assert.match(endpoint,/SUMMARY_POLICY_VERSION/);
 assert.match(endpoint,/reviewSummaryDraft/);assert.match(endpoint,/SUMMARY_OUTCOME_RULES/);assert.match(endpoint,/validateSummaryOutcome/);assert.match(endpoint,/assertSourcesUnchanged/);
 assert.doesNotMatch(endpoint,/bad mother|clinical learning edge/);
 const prompt=clientSessionSummarySystemPrompt('gentle_cbt');assert.match(prompt,/experienced meaning/);assert.match(prompt,/maintenance cycles/);
});
test('direct session summary refinement is bounded and classified as editorial rather than clinical evidence',()=>{
 assert.match(endpoint,/typeof refinementRequest !== 'string'/);assert.match(endpoint,/refinementRequest.length > 1800/);assert.match(endpoint,/previousDraft.length > 10000/);
 assert.match(endpoint,/therapist-authorised editorial request/i);assert.match(endpoint,/previousDraftForComparisonOnly/);assert.match(documents,/refinementRequest,previousDraft,summaryOptions/);
 assert.match(clientSessionSummarySystemPrompt('integrative',{addition:'exercise'}),/Optional exercise to consider/);
});
test('refinement is visible on the actual session screen and requires explicit output review',()=>{
 assert.match(workspace,/<SummaryRefinementPanel/);assert.match(workspace,/@generate="requestSummaryRefinement"/);assert.match(workspace,/@accept="acceptSummaryRevision"/);
 assert.match(workspace,/candidateMatches/);assert.match(workspace,/pendingSummary.value=\{result,baseBody,contextKey/);
 assert.match(workspace,/reviewRequired:true/);assert.match(workspace,/reviewedAt:null/);assert.match(workspace,/type:'pre_regeneration'/);
 assert.match(panel,/candidate.result.draft.body/);assert.match(panel,/Use revised draft/);
});
test('resources are therapist selected and not misrepresented as recorded session events',()=>{
 assert.equal(normalizeSummaryOptions().resource,null);assert.throws(()=>safeResourceUrl('http://example.com'));
 assert.throws(()=>resourceAppendix({title:'Unreviewed',url:'https://example.com'},null));
 assert.match(endpoint,/verifySummaryResource/);assert.match(panel,/clinical suitability or an endorsement/);assert.match(panel,/Continue without a resource/);
 assert.doesNotMatch(workspace+panel,/Kabat|_DTmGtznab4/);
});
