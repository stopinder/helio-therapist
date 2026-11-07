import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const view=readFileSync(new URL('../src/views/SessionWorkspace.vue',import.meta.url),'utf8')
const panel=readFileSync(new URL('../src/components/workspace/SourceReviewPanel.vue',import.meta.url),'utf8')

test('review button opens the original transcript rather than an invisible inline panel',()=>{
  assert.match(view, /@click="openSourceReview\(item,\$event\)"/)
  assert.match(view, /data-testid="source-review-region" tabindex="-1" role="region"/)
  assert.match(view, /aria-controls="original-source-review"/)
  assert.match(view, /await nextTick\(\)/)
  assert.match(view, /region\.scrollIntoView\(\{block:'start',behavior:'auto'\}\)/)
  assert.match(view, /region\.focus\(\{preventScroll:true\}\)/)
  assert.match(view, /@close="closeSourceReview"/)
  assert.match(view, /sourceReviewOpener\.focus\(\{preventScroll:true\}\)/)
});
test('only valid transcript IDs are eligible and a source failure is visible',()=>{
  assert.match(view, /sourceReviewIdPattern=.*\{8\}/)
  assert.match(view, /item\?\.transcriptId\|\|''/)
  assert.match(view, /sourceReviewOpenError\.value='The original transcript could not be located/)
  assert.match(view, /v-if="sourceReviewOpenError" role="alert"/)
  assert.match(view, /!reviewableSources\.length && transcript\?\.id/)
  assert.match(view, /No linked original source is available in this encounter/)
  assert.doesNotMatch(view, /Review flagged source/)
});
test('review source remains a deliberate, owner-protected process without automatic approval',()=>{
  assert.match(view, /<SourceReviewPanel :transcript-id="reviewTranscriptId"/)
  assert.match(panel, /I have reviewed the original source and confirm/)
  assert.match(panel, /:disabled="!canConfirm"/)
  assert.match(panel, /authenticatedFetch\(\x60\/api\/zoom\/source-review\?id=/)
  assert.match(panel, /async function save\(action\)/)
});
