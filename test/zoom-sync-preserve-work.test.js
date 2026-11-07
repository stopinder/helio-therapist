import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const auth=readFileSync(new URL('../src/AuthGate.vue',import.meta.url),'utf8')
const transcripts=readFileSync(new URL('../src/views/Transcripts.vue',import.meta.url),'utf8')
const inbox=readFileSync(new URL('../src/components/TranscriptInbox.vue',import.meta.url),'utf8')

test('billing gate does not remount workspace for an unchanged user identity',()=>{
  assert.match(auth,/watch\(\(\) => session\.value\?\.user\?\.id \|\| null/)
  assert.doesNotMatch(auth,/watch\(session, \(nextSession\)/)
  assert.match(auth,/if \(requestedUserId !== session\.value\?\.user\?\.id\) return/)
})
test('Zoom check is manual and never auto-starts when visiting inbox',()=>{
  assert.match(transcripts,/onMounted\(load\)/)
  assert.doesNotMatch(transcripts,/checkZoomNotes\(\{ silent: true \}\)/)
  assert.match(transcripts,/Check Zoom Notes/)
})
test('manual Zoom import refreshes data in place without destroying unsaved UI',()=>{
  assert.match(transcripts,/<TranscriptInbox ref="inboxRef"/)
  assert.doesNotMatch(transcripts,/inboxKey/)
  assert.match(transcripts,/await refreshInboxInPlace\(\)/)
  assert.match(inbox,/defineExpose\(\{refreshFromServer\}\)/)
  assert.match(inbox,/const existing=new Map\(transcripts\.value\.map/)
  assert.match(inbox,/typeof previous\.text==='string'/)
  assert.match(inbox,/for\(const transcript of transcripts\.value\)initialiseAssignmentDraft\(transcript\)/)
})
