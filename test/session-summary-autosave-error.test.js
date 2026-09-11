import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

test('Session Summary exposes an accessible autosave failure message and clears it after a successful save', () => {
  assert.match(source, /const summarySaveError = ref\(''\)/)
  assert.match(source, /v-if="summarySaveError"[^>]*role="alert"/)
  assert.match(source, /\{\{\s*summarySaveError\s*\}\}/)
  assert.match(source, /summarySaveError\.value = ''/)
  assert.match(source, /summarySaveError\.value = 'Your changes could not be saved\. Please try editing again\.'/)
})
