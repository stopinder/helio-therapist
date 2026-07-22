import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('resource picker separates resource selection from request configuration', async () => {
  const picker = await readFile(new URL('../src/components/tools/ResourcePicker.vue', import.meta.url), 'utf8')
  const canvas = await readFile(new URL('../src/components/tools/MainCanvas.vue', import.meta.url), 'utf8')

  assert.match(picker, /Selected resources/)
  assert.match(picker, /selectedResources = ref\(\[\]\)/)
  assert.match(picker, /function toggleResource/)
  assert.match(picker, /Promise\.all\(selectedResources\.value\.map/)
  assert.match(picker, /fieldset :disabled="!selectedResources\.length \|\| sending"/)
  assert.match(canvas, /const completionLinks = ref\(\[\]\)/)
  assert.match(canvas, /copyCompletionLinks/)
})
