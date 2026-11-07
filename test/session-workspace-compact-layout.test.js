import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workspace=fs.readFileSync(new URL('../src/views/SessionWorkspace.vue',import.meta.url),'utf8');
const header=fs.readFileSync(new URL('../src/components/workspace/SessionWorkspaceHeader.vue',import.meta.url),'utf8');
const document=fs.readFileSync(new URL('../src/components/workspace/SessionSummaryDocument.vue',import.meta.url),'utf8');

test('the compact encounter header keeps a single context-aware way back',()=>{
  assert.match(header,/data-testid="compact-encounter-header"/);
  assert.match(header,/:to="returnTo \|\|/);
  assert.match(header,/:aria-label="returnLabel"/);
  assert.match(header,/Session type: \{\{ session.type \}\}/);
  assert.match(workspace,/:return-to="sessionReturnDestination"/);
  assert.match(workspace,/cameFromInbox\.value/);
  assert.match(workspace,/cameFromClientTranscripts\.value/);
});
test('tabs share a compact row with help and accessible selection',()=>{
  assert.match(workspace,/role="tablist" aria-label="Session workspace views"/);
  assert.match(workspace,/<HelpLink topic="session-material"/);
  assert.match(workspace,/:aria-selected="activeView === 'summary'"/);
  assert.match(workspace,/:aria-selected="activeView === 'clinical'"/);
});
test('summary toolbar keeps core actions and a keyboard-safe More disclosure',()=>{
  assert.match(workspace,/<details ref="summaryMoreMenu"/);
  assert.match(workspace,/@keydown\.esc\.prevent="closeSummaryMoreMenu"/);
  assert.match(workspace,/aria-label="Copy summary"/);
  assert.match(workspace,/@click="copySummary"/);
  assert.match(workspace,/@click="runSummaryMoreAction\('ask'\)"/);
  assert.match(workspace,/@click="runSummaryMoreAction\('regenerate'\)"/);
  assert.match(workspace,/if \(action === 'regenerate'\) showSummaryOptions\.value = true/);
  assert.doesNotMatch(workspace,/if \(action === 'regenerate'\) generateSummary/);
});
test('the summary document does not repeat a large page heading above clinical content',()=>{
  assert.match(document,/<h1 class="sr-only">Session Summary/);
  assert.match(document,/<article class="session-summary-document/);
  assert.doesNotMatch(document,/mb-12 border-b border-border-muted/);
  assert.match(document,/document-body space-y-5/);
});
test('compact layout does not alter generation guards, editing or source review',()=>{
  assert.match(workspace,/summaryDocument\.value\?\.status === 'completed'/);
  assert.match(workspace,/verifySavedSummary\(\)/);
  assert.match(workspace,/saveClientDocumentDraft\(summaryDocument\.value/);
  assert.match(workspace,/SourceReviewPanel/);
  assert.match(workspace,/summaryUnsafe/);
  assert.match(workspace,/:disabled="!summaryDocument\?\.content\?\.body \|\| !!sourceReview \|\| summaryUnsafe"/);
});

test('saved summary starts in reading mode even with a preparation deep link',()=>{
  assert.match(workspace,/showSummaryOptions\.value = summaryUnsafe\.value \|\| !summaryDocument\.value\?\.content\?\.body/);
  assert.match(workspace,/v-if="transcript && summaryDocument\?\.status !== 'completed'"/);
});

test('bottom summary controls copy the same checked draft and scroll to the toolbar',()=>{
  assert.match(workspace,/data-testid="summary-bottom-actions"/);
  assert.match(workspace,/v-if="!isEditingSummary && summaryDocument\?\.content\?\.body"/);
  assert.match(workspace,/@click="copySummary"/);
  assert.match(workspace,/aria-label="Copy summary from bottom"/);
  assert.match(workspace,/:disabled="!!sourceReview \|\| summaryUnsafe"/);
  assert.match(workspace,/@click="scrollToSummaryToolbar"/);
  assert.match(workspace,/aria-label="Back to summary toolbar"/);
  assert.match(workspace,/ref="summaryToolbar" tabindex="-1"/);
  assert.match(workspace,/scrollIntoView\(\{ block: 'start', behavior: reduceMotion/);
  assert.match(workspace,/prefers-reduced-motion: reduce/);
  assert.match(workspace,/verifySavedSummary\(\)/);
  assert.match(workspace,/role="status" class="text-caption text-state-success">Copied/);
});
