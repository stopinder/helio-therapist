import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDocumentPdf } from '../api/_lib/documentPdf.js'

function pdfPageCount(buffer) {
  return (buffer.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length
}

const baseDraft = {
  title: 'Session summary',
  document_type: 'session_summary',
  scope: 'client',
  client_name: 'Test Client',
  purpose: 'Client-facing summary',
  content: {}
}

test('manual rich-text page breaks survive final PDF generation without adding a blank page', async () => {
  const draft = {
    ...baseDraft,
    content: {
      richContent: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Where things are now' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'A concise first-page paragraph before the manual break.' }] },
          { type: 'pageBreak' },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Different parts of you in this work' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'A concise second-page paragraph after the manual break.' }] }
        ]
      }
    }
  }

  const pdf = await buildDocumentPdf(draft)
  assert.ok(pdf.length > 1000)
  assert.equal(pdfPageCount(pdf), 2)
})

test('long client-summary text flows onto additional PDF pages instead of being clipped', async () => {
  const longParagraph = Array.from({ length: 1400 }, (_, index) => `sentence-${index}`).join(' ')
  const draft = {
    ...baseDraft,
    content: {
      body: `Where things are now\n${longParagraph}\n\nClosing reflection\nThe summary should remain readable through the final page.`
    }
  }

  const pdf = await buildDocumentPdf(draft)
  assert.ok(pdfPageCount(pdf) >= 2)
})
