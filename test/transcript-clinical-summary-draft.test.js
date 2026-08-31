import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  applySpeakerIdentities,
  buildClinicalSummaryInput,
  CLINICAL_SUMMARY_FIELDS,
  splitClinicalSummaryTranscript,
  validateClinicalSummaryResponse,
  validateClinicalSummaryTranscript
} from '../api/_lib/ai-clinical-summary.js';

const endpoint = readFileSync(new URL('../api/ai/transcript-clinical-summary.js', import.meta.url), 'utf8');
const transcriptTab = readFileSync(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8');
const workspace = readFileSync(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8');

test('clinical summary draft validation accepts exactly the editable Clinical Summary fields', () => {
  const payload = Object.fromEntries(CLINICAL_SUMMARY_FIELDS.map(key => [key, ` ${key} text `]));
  const draft = validateClinicalSummaryResponse(JSON.stringify(payload));
  assert.deepEqual(Object.keys(draft), CLINICAL_SUMMARY_FIELDS);
  assert.equal(draft.presentingConcerns, 'presentingConcerns text');
  assert.equal(validateClinicalSummaryResponse(JSON.stringify({ ...payload, diagnosis: 'invented' })), null);
});

test('session capture input rejects only unusably short transcripts and chunks long transcripts', () => {
  assert.throws(() => validateClinicalSummaryTranscript('too short'), error => error.code === 'TRANSCRIPT_TOO_SHORT');
  assert.match(buildClinicalSummaryInput('x'.repeat(100)), /<session_transcript>/);
  const longTranscript = Array.from({ length: 1000 }, (_, index) => `[00:00:${index}] Speaker 1: ${'x'.repeat(70)}`).join('\n');
  const chunks = splitClinicalSummaryTranscript(longTranscript, 10000);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.join('\n'), longTranscript);
});

test('speaker identities are applied to a prompt copy without changing the source', () => {
  const source = '[00:00:01] Speaker 1: Hello\n[00:00:03] Speaker 2: Hi';
  const relabelled = applySpeakerIdentities(source, { 'Speaker 1': 'Therapist', 'Speaker 2': 'Client' });
  assert.equal(relabelled, '[00:00:01] Therapist: Hello\n[00:00:03] Client: Hi');
  assert.equal(source, '[00:00:01] Speaker 1: Hello\n[00:00:03] Speaker 2: Hi');
});

test('endpoint requires therapist ownership, confirmed identities, and a current owned session', () => {
  assert.match(endpoint, /eq\('therapist_user_id', user\.id\)/);
  assert.match(endpoint, /INVALID_SPEAKER_IDENTITIES/);
  assert.match(endpoint, /eq\('user_id', user\.id\)/);
  assert.match(endpoint, /eq\('client_id', transcript\.client_id\)/);
  assert.match(endpoint, /session\.status === 'completed'/);
});

test('generation is therapist-triggered, chunked, editable, and remains outside Clinical Record', () => {
  assert.match(transcriptTab, /prepareSessionCapture/);
  assert.match(transcriptTab, /Editable working material · not saved/);
  assert.match(transcriptTab, /Notes, Reflection and Clinical Record remain separate steps/);
  assert.match(endpoint, /splitClinicalSummaryTranscript/);
  assert.match(endpoint, /clinicalSummaryMergeSystemPrompt/);
  assert.doesNotMatch(workspace, /clinical-summary-draft/);
  assert.doesNotMatch(endpoint, /save_session_draft/);
  assert.doesNotMatch(endpoint, /complete_session/);
});
