import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('clinical session state is server-backed with a one-time retained legacy import', async () => {
  const sessionLibrary = await readFile(new URL('../src/lib/sessions.js', import.meta.url), 'utf8')
  const mainCanvas = await readFile(new URL('../src/components/tools/MainCanvas.vue', import.meta.url), 'utf8')
  const inbox = await readFile(new URL('../src/components/NeedsAttention.vue', import.meta.url), 'utf8')
  const transcriptInbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

  assert.match(sessionLibrary, /from\('sessions'\)/)
  assert.match(sessionLibrary, /rpc\('import_legacy_sessions'/)
  assert.match(sessionLibrary, /fullyPersisted/)
  assert.match(sessionLibrary, /localStorage\.removeItem\(LEGACY_STORAGE_KEY\)/)
  assert.doesNotMatch(mainCanvas, /localStorage/)
  assert.doesNotMatch(inbox, /localStorage/)
  assert.doesNotMatch(transcriptInbox, /localStorage/)
})

test('session save and completion use concurrency and transactional RPC boundaries', async () => {
  const sessionLibrary = await readFile(new URL('../src/lib/sessions.js', import.meta.url), 'utf8')
  const migration = await readFile(new URL('../supabase/migrations/20260726113823_sprint_one_hardening.sql', import.meta.url), 'utf8')

  assert.match(sessionLibrary, /rpc\('save_session_draft'/)
  assert.match(sessionLibrary, /p_expected_version: session\.version/)
  assert.match(sessionLibrary, /rpc\('complete_session'/)
  assert.match(migration, /create unique index if not exists sessions_one_open_per_client_unique/)
  assert.match(migration, /create or replace function public\.complete_session/)
  assert.match(migration, /client_timeline_events_session_completion_unique/)
  assert.match(migration, /on conflict \(session_id\) where event_type = 'session_completed'/)
})

test('Zoom session operations validate the durable session belongs to the therapist and client', async () => {
  const startSession = await readFile(new URL('../api/zoom/start-session.js', import.meta.url), 'utf8')
  const transcripts = await readFile(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')

  for (const source of [startSession, transcripts]) {
    assert.match(source, /from\('sessions'\)/)
    assert.match(source, /\.eq\('client_id'/)
    assert.match(source, /\.eq\('user_id', user\.id\)/)
  }
})
