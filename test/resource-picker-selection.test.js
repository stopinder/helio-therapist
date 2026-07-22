import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('resource picker separates resource selection from request configuration', async () => {
  const picker = await readFile(new URL('../src/components/tools/ResourcePicker.vue', import.meta.url), 'utf8')
  const canvas = await readFile(new URL('../src/components/tools/MainCanvas.vue', import.meta.url), 'utf8')

  assert.match(picker, /Find something to send/)
  assert.match(picker, /Search resources, measures, questionnaires and documents/)
  assert.match(picker, /No items selected/)
  assert.match(picker, /useClientRequestDraft/)
  assert.match(picker, /v-for="group in visibleGroups"/)
  assert.match(picker, /item\.key/)
  assert.match(picker, /resourceVersionIds: draft\.items\.value\.map/)
  assert.match(picker, /searchStatus === 'loading'/)
  assert.match(picker, /v-if="!draft\.selectedCount" class="empty-inline">Select one or more items above to configure the request\./)
  assert.match(picker, /aria-pressed/)
  assert.match(picker, /trapFocus/)
  assert.match(picker, /resource-dialog__body/)
  assert.match(picker, /ReusableResourceCreator @created="handleResourceCreated"/)
  assert.match(canvas, /const completionLinks = ref\(\[\]\)/)
  assert.match(canvas, /copyCompletionLinks/)
  assert.match(canvas, /@click="openPicker">Send to client/)
  assert.doesNotMatch(canvas, /Assign outcome measure/)
})
