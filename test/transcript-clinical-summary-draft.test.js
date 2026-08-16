import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildClinicalSummaryInput,
  CLINICAL_SUMMARY_FIELDS,
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

test('clinical summary draft input rejects transcripts outside the supported size boundary', () => {
  assert.throws(() => validateClinicalSummaryTranscript('too short'), error => error.code === 'TRANSCRIPT_TOO_SHORT');
  assert.throws(() => validateClinicalSummaryTranscript('x'.repeat(60001)), error => error.code === 'TRANSCRIPT_TOO_LONG');
  assert.match(buildClinicalSummaryInput('x'.repeat(100)), /<session_transcript>/);
});

test('endpoint requires therapist ownership, saved clinical-summary intent, and a current owned session', () => {
  assert.match(endpoint, /eq\('therapist_user_id', user\.id\)/);
  assert.match(endpoint, /transcript\.requested_lens !== 'clinical_summary'/);
  assert.match(endpoint, /!transcript\.review_choices_saved_at/);
  assert.match(endpoint, /eq\('user_id', user\.id\)/);
  assert.match(endpoint, /eq\('client_id', transcript\.client_id\)/);
  assert.match(endpoint, /session\.status === 'completed'/);
  assert.match(endpoint, /String\(session\.notes \|\| ''\)\.trim\(\)/);
});

test('generation is therapist-triggered and remains unsaved until the existing draft action', () => {
  assert.match(transcriptTab, /Prepare clinical summary draft/);
  assert.match(transcriptTab, /Review and save remain separate steps/);
  assert.match(workspace, /AI-assisted draft · not saved/);
  assert.match(workspace, /temporary until you choose Save Draft/);
  assert.doesNotMatch(endpoint, /save_session_draft/);
  assert.doesNotMatch(endpoint, /complete_session/);
});
