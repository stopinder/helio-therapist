import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CLIENT_SESSION_SUMMARY_PROMPT_VERSION, buildClientSessionSummaryInput, clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';
import { SUMMARY_POLICY_VERSION, candidateMatches } from '../src/lib/summaryAuthoring.js';
const [api,composer,client,panel]=await Promise.all([
 readFile(new URL('../api/ai/client-session-summary.js',import.meta.url),'utf8'),
 readFile(new URL('../src/components/workspace/ClientDocumentComposer.vue',import.meta.url),'utf8'),
 readFile(new URL('../src/lib/clientDocuments.js',import.meta.url),'utf8'),
 readFile(new URL('../src/components/workspace/SummaryRefinementPanel.vue',import.meta.url),'utf8')
]);
const context={lens:'internal_family_systems',window:'last_three',captures:[{sessionId:'fictional-session',occurredAt:'2026-11-01',content:{whatHappened:'A fictional client described withdrawing during a disagreement.'}}],therapistGuidance:'Attend to the recorded moment.',refinementRequest:'Suggest an optional sensing exercise.',previousDraft:'An earlier description.',summaryOptions:{addition:'exercise'}};
test('a refinement remains an editorial request, not an extra encounter or source',()=>{
 const input=JSON.parse(buildClientSessionSummaryInput(context));
 assert.equal(input.editorialRefinement.therapistApprovedRequest,context.refinementRequest);assert.equal(input.editorialRefinement.previousDraftForComparisonOnly,context.previousDraft);
 assert.match(input.editorialRefinement.boundary,/not clinical evidence/i);assert.equal(input.evidenceMap.reviewedSessions.length,1);
 assert.equal(input.evidenceMap.reviewedSessions[0].content.whatHappened,context.captures[0].content.whatHappened);
 assert.equal(input.editorialPreferences.addition,'exercise');
});
test('only explicit approval can replace a draft with a refined regeneration, with source safety checks intact',()=>{
 assert.match(composer,/<SummaryRefinementPanel/);assert.match(composer,/@accept="acceptSummaryRevision"/);assert.match(composer,/candidateMatches/);
 assert.equal(candidateMatches({baseBody:'old',contextKey:'one'},'edited','one'),false);
 assert.match(composer,/previousSummaryVersions\.value=/);assert.match(composer,/sourceSafetyChecking/);assert.match(composer,/Restore previous version/);
 assert.match(client,/refinementRequest,previousDraft,summaryOptions,anchorSessionId/);assert.match(api,/typeof refinementRequest !== 'string'/);
 assert.match(api,/refinementRequest\.length > 1800/);assert.match(api,/assertSourcesUnchanged/);assert.match(api,/validateSummaryOutcome/);
 assert.match(panel,/candidate.result.draft.body/);assert.match(panel,/Keep current draft/);
});
test('exercise is always a proposed future option and cannot be presented as completed or agreed',()=>{
 const prompt=clientSessionSummarySystemPrompt('internal_family_systems',{addition:'exercise'});
 assert.match(prompt,/Optional exercise to consider/);assert.match(prompt,/accurately retain any exercise actually performed or agreed/);
 assert.match(prompt,/stop-or-modify instruction/);assert.equal(CLIENT_SESSION_SUMMARY_PROMPT_VERSION,SUMMARY_POLICY_VERSION+'/longitudinal');
 assert.match(panel,/No new exercise or resource/);assert.match(panel,/New exercises are optional suggestions/);
});
test('source evidence and approved editorial instruction share a validated provenance map',()=>{
 assert.match(api,/const approvedGuidance = refinementRequest\.trim\(\)/);
 assert.match(api,/buildClinicalIntelligenceEvidenceMap\(\{captures:selectedCaptures,careItems:careItems\|\|\[\],therapistGuidance:approvedGuidance\}\)/);
 assert.match(api,/therapistGuidance:approvedGuidance,refinementRequest,previousDraft,summaryOptions/);
});
