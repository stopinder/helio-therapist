import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('practice and client document composers use the shared Tiptap editor', async () => {
  const [practice, client, editor, pkg, pdf] = await Promise.all([
    readFile(new URL('../src/views/Documents.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/workspace/ClientDocumentComposer.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/documents/RichDocumentEditor.vue', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../api/_lib/documentPdf.js', import.meta.url), 'utf8')
  ])

  assert.match(practice, /<RichDocumentEditor/)
  assert.match(client, /<RichDocumentEditor/)
  assert.doesNotMatch(practice, /document-body-editor/)
  assert.doesNotMatch(client, /clinical-body/)

  assert.match(editor, /@tiptap\/vue-3/)
  assert.match(editor, /StarterKit/)
  assert.match(editor, /Page break/)
  assert.match(editor, /toggleHeading/)
  assert.match(editor, /toggleBulletList/)
  assert.match(editor, /toggleOrderedList/)
  assert.match(editor, /toggleBold/)
  assert.match(editor, /toggleItalic/)
  assert.match(editor, /1\.55/)

  const dependencies = JSON.parse(pkg).dependencies
  assert.ok(dependencies['@tiptap/vue-3'])
  assert.ok(dependencies['@tiptap/starter-kit'])

  assert.match(pdf, /richContent/)
  assert.match(pdf, /pageBreak/)
  assert.match(pdf, /addBufferedFooters/)
  assert.match(pdf, /pageNumber/)
})
