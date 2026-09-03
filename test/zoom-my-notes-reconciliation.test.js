import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normaliseZoomNoteList, structuredZoomNoteContent } from '../api/_lib/zoom-my-notes-reconciliation.js';

test('normaliseZoomNoteList preserves note_name as title', () => {
  const notes = normaliseZoomNoteList({
    notes: [
      {
        note_id: 'note-1',
        note_name: 'Private therapy session',
        meeting_id: 123456789,
        created_time: '2026-08-24T09:00:00Z',
        updated_time: '2026-08-24T10:00:00Z'
      },
      { note_name: 'Missing identifier' }
    ]
  });

  assert.deepEqual(notes, [{
    noteId: 'note-1',
    meetingId: '123456789',
    createdTime: '2026-08-24T09:00:00Z',
    updatedTime: '2026-08-24T10:00:00Z',
    title: 'Private therapy session'
  }]);
});

test('meeting-scoped note responses inherit the meeting id used for lookup', () => {
  const notes = normaliseZoomNoteList({ notes: [{ note_id: 'note-2' }] }, '987654321');
  assert.equal(notes[0].meetingId, '987654321');
});

test('Zoom generated note content is preserved alongside its transcript', () => {
  const structured = structuredZoomNoteContent({
    generated_note_content: '## Key outcomes\n\nA clinically useful Zoom summary.',
    transcript: { items: [{ text: 'Session words' }], speakers: [] }
  });

  assert.deepEqual(structured.items, [{ text: 'Session words' }]);
  assert.deepEqual(structured.zoomNote, {
    generatedContent: '## Key outcomes\n\nA clinically useful Zoom summary.'
  });
});

test('reconciliation is authenticated, therapist-scoped, meeting-scoped and deduplicates by Zoom note id', () => {
  const endpointSource = fs.readFileSync(new URL('../api/zoom/reconcile-my-notes.js', import.meta.url), 'utf8');
  const helperSource = fs.readFileSync(new URL('../api/_lib/zoom-my-notes-reconciliation.js', import.meta.url), 'utf8');

  assert.match(endpointSource, /requireAuthenticatedUser\(req\)/);
  assert.match(endpointSource, /\.eq\('user_id', user\.id\)/);
  assert.match(helperSource, /\.eq\('therapist_user_id', therapistUserId\)/);
  assert.match(helperSource, /\.eq\('user_id', therapistUserId\)/);
  assert.match(helperSource, /onConflict: 'therapist_user_id,zoom_note_id'/);
  assert.match(helperSource, /my_notes:read:note/);
  assert.match(helperSource, /my_notes:read:content/);
  assert.match(helperSource, /my_notes\/notes\?meeting_id=/);
  assert.match(helperSource, /structured_transcript: structuredContent/);
  const webhookHelperSource = fs.readFileSync(new URL('../api/_lib/zoom-webhook.js', import.meta.url), 'utf8');
  assert.match(webhookHelperSource, /generated_note_content/);
  assert.doesNotMatch(helperSource, /users\/me\/meetings/);
});

test('transcripts workspace offers a manual Zoom Notes reconciliation action', () => {
  const viewSource = fs.readFileSync(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8');

  assert.match(viewSource, /Check Zoom Notes/);
  assert.match(viewSource, /authenticatedFetch\('\/api\/zoom\/reconcile-my-notes', \{ method: 'POST' \}\)/);
  assert.match(viewSource, /inboxKey\.value \+= 1/);
  assert.match(viewSource, /No missing transcripts found\./);
});
