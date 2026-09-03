import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Zoom generated summaries reach Session Capture as distinct source material', () => {
  const transcriptsEndpoint = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8');
  const sessionCapture = fs.readFileSync(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8');
  const transcriptInbox = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8');
  const webhook = fs.readFileSync(new URL('../api/zoom/webhook.js', import.meta.url), 'utf8');

  assert.match(transcriptsEndpoint, /sourceSummary:\s*row\.structured_transcript\?\.zoomNote\?\.generatedContent/);
  assert.match(sessionCapture, /transcript\.sourceSummary/);
  assert.match(sessionCapture, /Review Zoom summary/);
  assert.match(sessionCapture, /isZoomSummaryVisible=ref\(false\)/);
  assert.match(transcriptInbox, /selected\.sourceSummary/);
  assert.match(transcriptInbox, /View Zoom summary/);
  assert.match(transcriptInbox, /separate from Helio’s Session Capture and Clinical Record/);
  assert.match(webhook, /structured_transcript: structuredContent/);
});
