import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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

test('Gentle CBT longitudinal synthesis includes supported sequence mapping without forcing CBT onto other lenses', async () => {
  const prompt = await read('../api/_lib/ai-client-session-summary.js');
  assert.match(prompt, /antecedent|situation or trigger/i);
  assert.match(prompt, /thoughts.*emotions.*body/i);
  assert.match(prompt, /behaviour|behavior/i);
  assert.match(prompt, /consequence/i);
  assert.match(prompt, /interruptions|exceptions/i);
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
