import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

test('SessionWorkspace shows Generate summary button when appropriate', () => {
  assert.match(source, /Generate summary/i)
  assert.match(source, /v-if="transcript"/i)
})

test('SessionWorkspace shows Regenerate only for a non-finalised summary', () => {
  const regenerateButton = source.match(/<button\b[^>]*>\s*Regenerate\s*<\/button>/)?.[0]

  assert.ok(regenerateButton, 'Expected a Regenerate button')
  assert.match(
    regenerateButton,
    /v-if="summaryDocument\?\.content\?\.body && summaryDocument\.status !== 'completed'"/
  )
  assert.match(regenerateButton, /@click="generateSummary"/)
  assert.match(regenerateButton, /:disabled="isGenerating"/)
})

test('SessionWorkspace handles generation state', () => {
  assert.match(source, /Preparing session summary…/i)
  assert.match(source, /isGenerating/i)
})

test('Session summary section includes source provenance', () => {
  assert.match(source, /Generated from Zoom summary \+ transcript/i)
})

test('SessionWorkspace calls generateSessionSummary helper', () => {
  assert.match(source, /import \{[^}]*generateSessionSummary[^}]*\} from ['"]\.\.\/lib\/clientDocuments\.js['"]/)
  assert.match(source, /generateSessionSummary\(\{/i)
})
