import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const linkerSource = await readFile(new URL('../src/components/TranscriptSessionLinker.vue', import.meta.url), 'utf8')
const inboxSource = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('Transcript session linker distinguishes encounter states and shows explicit date/time', () => {
  assert.match(linkerSource, /sessionStatusLabel\(session\)/)
  assert.match(linkerSource, /'Open session'/)
  assert.match(linkerSource, /'Planned session'/)
  assert.match(linkerSource, /'Completed session'/)
  assert.match(linkerSource, /formatEncounter\(session\.startedAt \|\| session\.createdAt\)/)
})

test('Transcript session linker requires explicit therapist selection', () => {
  assert.match(linkerSource, /v-model="selectedSessionRef"/)
  assert.match(linkerSource, /type="radio"/)
  assert.match(linkerSource, /Link selected session/)
  assert.match(linkerSource, /Helios will not infer the match/)
  assert.match(inboxSource, /Transcript connected/)
})
