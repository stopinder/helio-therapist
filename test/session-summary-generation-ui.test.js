import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

test('SessionWorkspace shows Generate summary button when appropriate', () => {
  assert.match(source, /Generate summary/i)
  assert.match(source, /v-if="transcript"/i)
})

test('SessionWorkspace offers Regenerate only for non-finalised summary content', () => {
  const button = source.match(/<button\b[^>]*>\s*Regenerate\s*<\/button>/i)?.[0]
  assert.ok(button, 'Regenerate button must exist')
  const condition = button.match(/v-if="([^"]+)"/)?.[1]
  assert.ok(condition, 'Regenerate must have a visibility condition')
  const isVisible = new Function('summaryDocument', `return Boolean(${condition})`)

  assert.equal(isVisible({ content: { body: 'Existing summary' }, status: 'draft' }), true)
  assert.equal(isVisible({ content: { body: 'Finalised summary' }, status: 'completed' }), false)
  assert.equal(isVisible({ content: { body: '' }, status: 'draft' }), false)
  assert.equal(isVisible(null), false)

  // The handler must also reject completed documents, even if invoked directly.
  const guard = source.match(/async function generateSummary\(\)\s*\{\s*if\s*\(([^\n]+)\)\s*return;/)?.[1]
  assert.ok(guard, 'Generation must retain its early-return guard')
  const blocksGeneration = new Function('session', 'isGenerating', 'summaryDocument', `return Boolean(${guard})`)
  assert.equal(blocksGeneration({ value: { id: 'session-1' } }, { value: false }, { value: { status: 'completed' } }), true)
})

test('SessionWorkspace handles generation state', () => {
  assert.match(source, /Preparing session summary…/i)
  assert.match(source, /This may take a few minutes\. Please keep this page open\./i)
  assert.match(source, /isGenerating/i)
})

test('Session summary section includes source provenance', () => {
  assert.match(source, /Generated from Zoom summary \+ transcript/i)
})

test('SessionWorkspace calls generateSessionSummary helper', () => {
  assert.match(source, /import \{[^}]*generateSessionSummary[^}]*\} from ['"]\.\.\/lib\/clientDocuments\.js['"]/)
  assert.match(source, /generateSessionSummary\(\{/i)
})
