import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Zoom generated summaries reach Session Capture as collapsed, distinct source material', () => {
  const transcriptsEndpoint = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8');
  const sessionCapture = fs.readFileSync(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8');
  const transcriptInbox = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8');
  const webhook = fs.readFileSync(new URL('../api/zoom/webhook.js', import.meta.url), 'utf8');

  assert.match(transcriptsEndpoint, /sourceSummary:\s*row\.structured_transcript\?\.zoomNote\?\.generatedContent/);
  assert.match(sessionCapture, /transcript\.sourceSummary/);
  assert.match(sessionCapture, /Review Zoom-generated summary/);
  assert.match(sessionCapture, /Review raw transcript/);
  assert.match(sessionCapture, /isZoomSummaryVisible=ref\(false\)/);
  assert.match(sessionCapture, /isTranscriptVisible=ref\(false\)/);
  assert.ok(sessionCapture.indexOf('Helio clinical intelligence') < sessionCapture.indexOf('Optional source material'));
  assert.match(transcriptInbox, /selected\.sourceSummary/);
  assert.match(transcriptInbox, /View Zoom summary/);
  assert.match(transcriptInbox, /separate from Helio’s Session Capture and Clinical Record/);
  assert.match(webhook, /structured_transcript: structuredContent/);
});

test('Helio Session Capture is generated from the raw transcript, never Zoom summary text', () => {
  const endpoint = fs.readFileSync(new URL('../api/ai/transcript-clinical-summary.js', import.meta.url), 'utf8');

  assert.match(endpoint, /\.select\('id, original_transcript, requested_lens, client_id, session_ref, review_choices_saved_at'\)/);
  assert.match(endpoint, /applySpeakerIdentities\(transcript\.original_transcript, speakerIdentities\)/);
  assert.doesNotMatch(endpoint, /sourceSummary|generated_note_content|zoomNote/);
});
