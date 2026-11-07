import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CLIENT_SESSION_SUMMARY_PROMPT_VERSION, buildClientSessionSummaryInput, clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';

const [api,composer,client] = await Promise.all([
  readFile(new URL('../api/ai/client-session-summary.js',import.meta.url),'utf8'),
  readFile(new URL('../src/components/workspace/ClientDocumentComposer.vue',import.meta.url),'utf8'),
  readFile(new URL('../src/lib/clientDocuments.js',import.meta.url),'utf8')
]);
const context={lens:'internal_family_systems',window:'last_three',
  captures:[{sessionId:'fictional-session',occurredAt:'2026-11-01',content:{whatHappened:'One partner withdrew when criticised. Another asked for acknowledgement.'}}],
  therapistGuidance:'Pay attention to the moment of withdrawal.',
  refinementRequest:'Suggest an optional exercise noticing tension, breathing and body sensation.',
  previousDraft:'An earlier generic description of disagreement.'};
test('a refinement remains an editorial request, not an extra encounter or source',()=>{
 const input=JSON.parse(buildClientSessionSummaryInput(context));
 assert.equal(input.editorialRefinement.therapistApprovedRequest,context.refinementRequest);
 assert.equal(input.editorialRefinement.previousDraftForComparisonOnly,context.previousDraft);
 assert.match(input.editorialRefinement.boundary,/not clinical evidence/i);
 assert.equal(input.evidenceMap.reviewedSessions.length,1);
 assert.equal(input.evidenceMap.reviewedSessions[0].content.whatHappened,context.captures[0].content.whatHappened);
});
test('only explicit approval can start a refined regeneration, with original source safety checks intact',()=>{
 assert.match(composer,/@click="previewRefinement"/);
 assert.match(composer,/@click="applyRefinement"/);
 assert.match(composer,/preview\.body !== form\.body/);
 assert.match(composer,/refinementPreview = null/);
 assert.match(composer,/previousSummaryVersions\.value=/);
 assert.match(composer,/sourceSafetyChecking/);
 assert.match(composer,/Restore previous version/);
 assert.match(client,/refinementRequest,previousDraft,anchorSessionId/);
 assert.match(api,/typeof refinementRequest !== 'string'/);
 assert.match(api,/refinementRequest\.length > 1800/);
 assert.match(api,/assertSourcesUnchanged/);
 assert.match(api,/validateSummaryOutcome/);
});
test('exercise is always a proposed future option and cannot be presented as completed or agreed',()=>{
 const prompt=clientSessionSummarySystemPrompt('internal_family_systems');
 assert.match(prompt,/Optional exercise to consider/);
 assert.match(prompt,/NEVER as something completed, assigned or agreed/);
 assert.match(prompt,/therapist approves an editorial refinement request/);
 assert.match(prompt,/interacting protection strategies/i);
 assert.equal(CLIENT_SESSION_SUMMARY_PROMPT_VERSION,'client-session-summary-v14-therapist-refinement');
 assert.match(composer,/not activities already completed or agreed/);
 assert.match(composer,/Preview of the instruction, not a generated revision/);
});
test('source evidence and approved editorial instruction share a validated provenance map',()=>{
 assert.match(api,/const approvedGuidance = refinementRequest\.trim\(\)/);
 assert.match(api,/buildClinicalIntelligenceEvidenceMap\(\{captures:selectedCaptures,careItems:careItems\|\|\[\],therapistGuidance:approvedGuidance\}\)/);
 assert.match(api,/therapistGuidance:approvedGuidance,refinementRequest,previousDraft/);
});
