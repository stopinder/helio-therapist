import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const panelSource = await readFile(new URL('../src/components/workspace/ClientTranscriptsPanel.vue', import.meta.url), 'utf8')
const inboxSource = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('encounter linking lives inline before entering Clinical Workspace', () => {
  assert.match(panelSource, /Link to an encounter/)
  assert.match(panelSource, /Open Clinical Workspace/)
  assert.match(panelSource, /An in-progress session is a valid link\./)
  assert.match(panelSource, /sessionOptionLabel\(session\)/)
  assert.match(panelSource, /In progress ·/)
  assert.match(panelSource, /Completed ·/)
  assert.match(panelSource, /Planned ·/)
  assert.doesNotMatch(inboxSource, /sessionOptionLabel\(session\)/)
  assert.doesNotMatch(inboxSource, /Create session/)
})

test('linked transcripts show their selected encounter and allow it to be changed inline', () => {
  assert.match(panelSource, /Linked to \{\{ sessionLabelById\(transcript\.sessionRef\) \}\}/)
  assert.match(panelSource, /Change session/)
  assert.match(panelSource, /selectedSessions\[transcript\.id\]/)
  assert.match(panelSource, /Link session/)
})
