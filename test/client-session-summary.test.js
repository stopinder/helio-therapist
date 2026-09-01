import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildClinicalIntelligenceEvidenceMap,
  renderClientSessionSummary
} from '../api/_lib/ai-client-session-summary.js';
import {
  CLINICAL_INTELLIGENCE_CASES,
  CLINICAL_INTELLIGENCE_EVALUATION_RUBRIC
} from './fixtures/clinical-intelligence-evaluation.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('client session summary reuses Client Documents without importing raw internal clinical material', async () => {
  const workspace = await read('../src/views/ClientWorkspace.vue');
  const panel = await read('../src/components/workspace/ClientDocumentsPanel.vue');
  const composer = await read('../src/components/workspace/ClientDocumentComposer.vue');
  const pdf = await read('../api/_lib/documentPdf.js');
  assert.match(panel, /Create session summary/i);
  assert.match(workspace, /session_summary/);
  assert.match(composer, /session_summary/);
  assert.match(composer, /internal clinical notes are not included automatically/i);
  assert.match(composer, /v-if="!isSessionSummary"[^>]*>Add from clinical notes/);
  assert.match(composer, /Finalise PDF/);
  assert.match(pdf, /SESSION SUMMARY/);
  assert.doesNotMatch(pdf, /session_summary.*Confidential clinical document/);
});

test('Helios Clinical Intelligence offers only General, Gentle CBT, and Integrative lenses', async () => {
  const composer = await read('../src/components/workspace/ClientDocumentComposer.vue');
  assert.match(composer, /General/);
  assert.match(composer, /Gentle CBT/);
  assert.match(composer, /Integrative/);
  assert.doesNotMatch(composer, />EMDR</);
});

test('client summary generation uses up to three reviewed Session Captures and accepted Care context', async () => {
  const endpoint = await read('../api/ai/client-session-summary.js');
  assert.match(endpoint, /session_capture_drafts/);
  assert.match(endpoint, /eq\('status', 'reviewed'\)/);
  assert.match(endpoint, /limit\(3\)/);
  assert.match(endpoint, /client_care_items/);
  assert.match(endpoint, /eq\('status', 'current'\)/);
  assert.match(endpoint, /eq\('client_id', clientId\)/);
  assert.match(endpoint, /eq\('user_id', user\.id\)/);
});

test('Clinical Intelligence prompt separates recurrence from causality and protects client-facing boundaries', async () => {
  const prompt = await read('../api/_lib/ai-client-session-summary.js');
  assert.match(prompt, /recurrence is not causality/i);
  assert.match(prompt, /do not infer diagnoses/i);
  assert.match(prompt, /risk|safeguarding/i);
  assert.match(prompt, /directly reported/i);
  assert.match(prompt, /recurring pattern/i);
  assert.match(prompt, /possible connection/i);
  assert.match(prompt, /absence.*improvement/i);
});

test('Clinical Intelligence builds a source-aware evidence map before client prose', () => {
  const map = buildClinicalIntelligenceEvidenceMap({
    captures: [
      { sessionId: 's3', occurredAt: '2026-08-30', content: { summary: 'Work criticism led to worry and repeated checking.' } },
      { sessionId: 's2', occurredAt: '2026-08-23', content: { summary: 'After uncertain feedback, client worried and checked messages repeatedly.' } },
      { sessionId: 's1', occurredAt: '2026-08-16', content: { summary: 'Client felt calmer after asking a colleague for perspective.' } }
    ],
    careItems: [{ kind: 'current_focus', body: 'Self-criticism around uncertainty at work.' }],
    therapistGuidance: 'Notice the exception when another perspective helped.'
  });
  assert.equal(map.reviewedSessions.length, 3);
  assert.equal(map.reviewedSessions[0].position, 'current');
  assert.equal(map.reviewedSessions[1].position, 'previous_1');
  assert.equal(map.currentAcceptedCareContext[0].sourceType, 'accepted_care');
  assert.equal(map.therapistAuthoredContext.sourceType, 'therapist_guidance');
  assert.match(map.therapistAuthoredContext.content, /exception/i);
  assert.deepEqual(map.comparisonTasks, ['recurrence', 'change', 'stability', 'exceptions', 'resources', 'unfinished_threads', 'possible_connections']);
});

test('Clinical Intelligence quality contract requires staged comparison and evidence thresholds', async () => {
  const prompt = await read('../api/_lib/ai-client-session-summary.js');
  assert.match(prompt, /evidence map/i);
  assert.match(prompt, /two or more reviewed sessions/i);
  assert.match(prompt, /current observation/i);
  assert.match(prompt, /change|stability/i);
  assert.match(prompt, /exception/i);
  assert.match(prompt, /unfinished thread/i);
  assert.match(prompt, /source type/i);
  assert.match(prompt, /draft the client-facing sections only after/i);
});

test('Clinical Intelligence evaluation benchmark covers core therapist quality dimensions', () => {
  assert.ok(CLINICAL_INTELLIGENCE_CASES.length >= 3);
  assert.deepEqual(CLINICAL_INTELLIGENCE_EVALUATION_RUBRIC, [
    'factual_grounding', 'longitudinal_usefulness', 'specificity', 'client_readability',
    'exceptions_and_resources', 'actionable_continuity', 'provenance_safety',
    'unsupported_inference', 'repetition'
  ]);
  assert.ok(CLINICAL_INTELLIGENCE_CASES.some(item => item.lens === 'gentle_cbt' && item.captures.length === 3));
  assert.ok(CLINICAL_INTELLIGENCE_CASES.some(item => item.lens === 'integrative' && item.captures.length === 3));
  assert.ok(CLINICAL_INTELLIGENCE_CASES.some(item => item.lens === 'general' && item.captures.length === 1));
  for (const item of CLINICAL_INTELLIGENCE_CASES) {
    assert.ok(item.expectedSignals);
    assert.ok(Array.isArray(item.expectedSignals.avoid));
  }
});

test('Gentle CBT longitudinal synthesis includes supported sequence mapping without forcing CBT onto other lenses', async () => {
  const prompt = await read('../api/_lib/ai-client-session-summary.js');
  assert.match(prompt, /antecedent|situation or trigger/i);
  assert.match(prompt, /thoughts.*emotions.*body/i);
  assert.match(prompt, /behaviour|behavior/i);
  assert.match(prompt, /consequence/i);
  assert.match(prompt, /interruptions|exceptions/i);
  assert.match(prompt, /short-term|short term/i);
  assert.match(prompt, /longer-term|longer term/i);
  assert.match(prompt, /Integrative/);
  assert.match(prompt, /General/);
});

test('therapist-authored additions are passed separately and never presented as client statements', async () => {
  const prompt = await read('../api/_lib/ai-client-session-summary.js');
  const endpoint = await read('../api/ai/client-session-summary.js');
  const service = await read('../src/lib/clientDocuments.js');
  const composer = await read('../src/components/workspace/ClientDocumentComposer.vue');
  assert.match(prompt, /therapist-authored/i);
  assert.match(prompt, /not.*client (said|statement)|not.*client statement/i);
  assert.match(prompt, /therapistGuidance/);
  assert.match(endpoint, /therapistGuidance/);
  assert.match(service, /therapistGuidance/);
  assert.match(composer, /Therapist additions|Guidance for Helios/i);
});

test('AI returns structured clinical intelligence and Helios renders the client document deterministically', async () => {
  const prompt = await read('../api/_lib/ai-client-session-summary.js');
  const endpoint = await read('../api/ai/client-session-summary.js');
  assert.match(prompt, /opening/);
  assert.match(prompt, /whatWeWorkedOn/);
  assert.match(prompt, /patternsOverTime/);
  assert.match(prompt, /changesAndExceptions/);
  assert.match(prompt, /strengthsAndResources/);
  assert.match(prompt, /perspectiveReflection/);
  assert.match(prompt, /betweenSession/);
  assert.match(prompt, /closing/);
  assert.match(prompt, /renderClientSessionSummary/);
  assert.match(endpoint, /renderClientSessionSummary/);
  assert.match(endpoint, /sections/);
  const rendered = renderClientSessionSummary({
    opening: 'Work has felt more uncertain this week.',
    whatWeWorkedOn: 'We explored what happens after critical feedback.',
    patternsOverTime: 'Across recent sessions, uncertainty has repeatedly been followed by worry and checking.',
    changesAndExceptions: 'Asking for another perspective interrupted the checking on one occasion.',
    strengthsAndResources: 'You noticed the pattern sooner and reached out for support.',
    perspectiveReflection: 'The checking may settle uncertainty briefly while also keeping attention on the threat.',
    betweenSession: 'Notice what happens before the urge to re-check and what helps you respond differently.',
    closing: 'We will carry this thread into the next session.'
  }, 'gentle_cbt');
  assert.match(rendered, /Patterns across our recent work/);
  assert.match(rendered, /interrupted the checking/);
  assert.match(rendered, /gentle CBT perspective/i);
});

test('composer generates an editable draft and keeps therapist finalisation explicit', async () => {
  const composer = await read('../src/components/workspace/ClientDocumentComposer.vue');
  const service = await read('../src/lib/clientDocuments.js');
  assert.match(composer, /Generate client summary/i);
  assert.match(composer, /Last 3 reviewed sessions/i);
  assert.match(composer, /This session only/i);
  assert.match(composer, /generateClientSessionSummary/);
  assert.match(service, /\/api\/ai\/client-session-summary/);
  assert.match(composer, /Finalise PDF/);
});
