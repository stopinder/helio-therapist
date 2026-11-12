import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const documentService=readFileSync(new URL('../src/lib/clientDocuments.js',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../src/views/SessionWorkspace.vue',import.meta.url),'utf8');
const composer=readFileSync(new URL('../src/components/workspace/ClientDocumentComposer.vue',import.meta.url),'utf8');
const sourceReview=readFileSync(new URL('../api/_lib/source-review.js',import.meta.url),'utf8');

test('single-session retrieval checks kind and anchor rather than any included source',()=>{
  assert.match(documentService,/summaryDocumentKind\(doc\)==='session'&&summaryAnchorId\(doc\)===String\(sessionId\)/);
  assert.match(documentService,/summaryDocumentKind\(doc\)==='across'&&summaryAnchorId\(doc\)===String\(sessionId\)/);
  assert.doesNotMatch(documentService,/doc\.documentType==='session_summary'&&doc\.sourceManifest\?\.some\(src=>src\.sessionId===sessionId\)/);
});
test('generation replaces current evidence manifest without retaining old windows',()=>{
  assert.match(documentService,/function mergeSourceManifest\(document,changes\)/);
  assert.doesNotMatch(documentService,/for\(const source of document\.sourceManifest\|\|\[\]\)/);
});
test('regeneration cannot change a saved document kind',()=>{
  assert.match(documentService,/if\(nextKind!==existingKind\)throw new Error/);
  assert.match(workspace,/documentType:summaryKind\.value==='across'\?'across_session_review':'session_summary'/);
  assert.match(workspace,/summaryKind:kind/);
});
test('across-session review retains source safety and therapist approval checks',()=>{
  assert.match(sourceReview,/\['session_summary','across_session_review'\]\.includes\(document\.document_type\)/);
  assert.match(sourceReview,/\['session_summary','across_session_review'\]\.includes\(document\?\.document_type\)/);
  assert.match(composer,/\['session_summary','across_session_review'\]\.includes\(form\.documentType\)/);
});
test('replacement displays one reading surface and saved comparison is optional',()=>{
  assert.match(workspace,/v-if="!pendingSummary" ref="summaryDisplayedDocument"/);
  assert.match(workspace,/data-testid="compare-saved-version"/);
  assert.match(workspace,/data-testid="summary-more-actions"/);
});
