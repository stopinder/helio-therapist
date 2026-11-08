import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const file = name => readFileSync(new URL('../src/'+name,import.meta.url),'utf8')
const dialog=file('components/workspace/SourceReviewDialog.vue')
const panel=file('components/workspace/SourceReviewPanel.vue')
const inbox=file('components/TranscriptInbox.vue')
const session=file('views/SessionWorkspace.vue')
const docs=file('components/workspace/ClientDocumentComposer.vue')

test('all three source-review entrypoints open a shared, visible dialog rather than inline hidden panels',()=>{
  for(const parent of [inbox,session,docs]){
    assert.match(parent,/<SourceReviewDialog v-if="reviewTranscriptId"|<SourceReviewDialog v-if="reviewSourceId"/)
    assert.doesNotMatch(parent,/<SourceReviewPanel v-if="reviewTranscriptId"|<SourceReviewPanel v-if="reviewSourceId"/)
    assert.match(parent,/@close="reviewTranscriptId=''"|@close="reviewSourceId=''"/)
  }
  assert.match(dialog,/<Teleport to="body">/)
  assert.match(dialog,/role="dialog"/)
  assert.match(dialog,/aria-modal="true"/)
  assert.match(dialog,/data-testid="source-review-scroll-area"/)
  assert.match(dialog,/document.body.style.overflow = 'hidden'/)
  assert.match(dialog,/if \(target\?\.isConnected && typeof target.focus === 'function'\)/)
})
test('original transcript and imported Zoom note remain reviewable with explicit therapist approval',()=>{
  assert.match(panel,/Original transcript with line numbers/)
  assert.match(panel,/Zoom note · quick session overview/)
  assert.match(panel,/I have reviewed the available session material and confirm/)
  assert.match(panel,/:disabled="busy \|\| loading"/)
  assert.match(panel,/if\(!reviewed\.value\)/)
  assert.match(panel,/authenticatedFetch\('\/api\/zoom\/source-review',\{method:'POST'/)
  assert.match(dialog,/<SourceReviewPanel :key="transcriptId"/)
  assert.match(dialog,/:transcript-id="transcriptId" embedded/)
  assert.match(panel,/v-if="!embedded"/)
})
test('source links cannot silently invoke a review for a missing or malformed ID',()=>{
  assert.match(session,/reviewUuid\.test\(String\(id\|\|''\)\)/)
  assert.match(session,/sourceReviewOpenError\.value='The original transcript link is missing/)
  assert.match(session,/v-if="sourceReviewOpenError"/)
  assert.match(session,/reviewableSources/)
  assert.match(inbox,/if\(!transcript\?\.id\)\{errorMessage\.value=/)
})
test('session screen distinguishes sources without claiming a verified boundary',()=>{
  assert.doesNotMatch(session,/Review flagged source/)
  assert.match(session,/Review source \{\{ index\+1 \}\} of \{\{ reviewableSources.length \}\}/)
  assert.match(session,/reviewSourceLabel/)
})
