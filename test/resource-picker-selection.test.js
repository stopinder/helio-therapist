import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('resource picker separates resource selection from request configuration', async () => {
  const picker = await readFile(new URL('../src/components/tools/ResourcePicker.vue', import.meta.url), 'utf8')
  const canvas = await readFile(new URL('../src/components/tools/MainCanvas.vue', import.meta.url), 'utf8')

  assert.match(picker, /Find something to send/)
  assert.match(picker, /Search resources, measures, questionnaires and documents/)
  assert.match(picker, /No items selected/)
  assert.match(picker, /\$\{resource\.resource_kind \|\| 'resource'\}:\$\{resource\.id \|\| resource\.version\?\.id\}/)
  assert.match(picker, /selectedResources = ref\(\[\]\)/)
  assert.match(picker, /function toggleResource/)
  assert.match(picker, /resourceVersionIds: selectedResources\.value\.map/)
  assert.doesNotMatch(picker, /Promise\.all\(selectedResources\.value\.map/)
  assert.match(picker, /v-if="!selectedResources\.length" class="empty-inline">Select one or more items above to configure the request\./)
  assert.match(picker, /ReusableResourceCreator @created="handleResourceCreated"/)
  assert.match(canvas, /const completionLinks = ref\(\[\]\)/)
  assert.match(canvas, /copyCompletionLinks/)
  assert.match(canvas, /@click="openPicker">Send to client/)
  assert.doesNotMatch(canvas, /Assign outcome measure/)
})
