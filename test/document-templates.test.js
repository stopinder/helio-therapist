import test from 'node:test'
import assert from 'node:assert/strict'
import { DOCUMENT_TEMPLATES, getDocumentTemplate, templateBody } from '../src/lib/documentTemplates.js'

test('professional document templates cover practice and prospect workflows',()=>{
  assert.ok(DOCUMENT_TEMPLATES.some(template=>template.id==='agreement'&&template.scope==='practice'))
  assert.ok(DOCUMENT_TEMPLATES.some(template=>template.id==='consent_form'))
  assert.ok(DOCUMENT_TEMPLATES.some(template=>template.id==='information_sheet'))
  assert.ok(DOCUMENT_TEMPLATES.some(template=>template.id==='marketing_letter'&&template.scope==='prospect'))
})

test('template body creates editable structured copy without client identifiers',()=>{
  const body=templateBody(getDocumentTemplate('agreement'))
  assert.match(body,/Our work together/)
  assert.match(body,/Confidentiality/)
  assert.equal(body.includes('client_id'),false)
  assert.equal(body.includes('user_id'),false)
})
