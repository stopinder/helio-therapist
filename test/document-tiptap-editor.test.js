import { summaryBodyToRichContent } from '../src/lib/summaryAuthoring.js';
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('practice and client document composers use the shared paginated Tiptap editor', async () => {
  const [practice, client, editor, pkg, pdf] = await Promise.all([
    readFile(new URL('../src/views/Documents.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/workspace/ClientDocumentComposer.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/documents/RichDocumentEditor.vue', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../api/_lib/documentPdf.js', import.meta.url), 'utf8')
  ])

  assert.match(practice, /<RichDocumentEditor/)
  assert.match(client, /<RichDocumentEditor/)
  assert.doesNotMatch(practice, /<textarea[^>]*document-body-editor/)
  assert.doesNotMatch(client, /clinical-body/)
  assert.match(client, /copySummary/)
  assert.match(client, /summaryBodyToRichContent/)
  assert.equal(summaryBodyToRichContent('Different parts of you in this work\n\nA legacy section.').content[0].type,'heading')
  assert.match(client, /Copied ✓/)

  assert.match(editor, /@tiptap\/vue-3/)
  assert.match(editor, /StarterKit/)
  assert.match(editor, /Page break/)
  assert.match(editor, /toggleHeading/)
  assert.match(editor, /toggleBulletList/)
  assert.match(editor, /toggleOrderedList/)
  assert.match(editor, /toggleBold/)
  assert.match(editor, /toggleItalic/)
  assert.match(editor, /10\.5pt\/1\.4/)

  assert.match(editor, /recalculatePagination/)
  assert.match(editor, /ResizeObserver/)
  assert.match(editor, /firstPageContentMm/)
  assert.match(editor, /followingPageContentMm/)
  assert.match(editor, /document-auto-page-gap/)
  assert.match(editor, /auto-page-break-before/)
  assert.match(editor, /document-page-number/)
  assert.match(editor, /pageCount/)
  assert.match(editor, /keepWithNext/)
  assert.match(editor, /z-index:1/)

  const dependencies = JSON.parse(pkg).dependencies
  assert.ok(dependencies['@tiptap/vue-3'])
  assert.ok(dependencies['@tiptap/starter-kit'])

  assert.match(pdf, /richContent/)
  assert.match(pdf, /pageBreak/)
  assert.match(pdf, /addBufferedFooters/)
  assert.match(pdf, /pageNumber/)
  assert.match(pdf, /ensureSpace/)
  assert.match(pdf, /SUMMARY_HEADINGS/)
  assert.match(pdf, /summaryBodyToRichContent/)
})
