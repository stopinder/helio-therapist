import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const session=await readFile(new URL('../src/views/SessionWorkspace.vue',import.meta.url),'utf8');
const refinement=await readFile(new URL('../src/components/workspace/SummaryRefinementPanel.vue',import.meta.url),'utf8');

test('both Generate and Regenerate share a visible, accessible auto-scrolled progress state',()=>{
  assert.match(session, /ref="sessionScrollContainer"[^>]*@scroll\.passive="handleSessionScroll"/);
  assert.match(session, /data-testid="summary-generation-progress"[^>]*role="status" aria-live="polite"/);
  assert.match(session, /motion-safe:animate-spin/);
  assert.match(session, /Regenerating session summary/);
  assert.match(session, /Generating session summary/);
  assert.match(session, /await scrollToSummaryTarget\(summaryGenerationProgress\)/);
  const start=session.indexOf('await scrollToSummaryTarget(summaryGenerationProgress)');
  const call=session.indexOf('await generateSessionSummary({');
  assert.ok(start>0 && call>start, 'Progress should render and scroll before the request starts');
  assert.match(session, /element\.scrollIntoView\(/);
  assert.match(session, /nextTick\(\)/);
  assert.match(session, /prefers-reduced-motion: reduce/);
});

test('Regenerate displays a compact inline proposal and preserves therapist selection',()=>{
  assert.match(session,/data-testid="session-summary-revision-preview"/);
  assert.match(session, /pendingSummary\.value=\{result,baseBody,contextKey/);
  assert.match(session, /await scrollToSummaryTarget\(summaryRevisionPreview\)/);
  assert.match(session, /@click="acceptSummaryRevision">Use revised draft/);
  assert.match(session, /@click="pendingSummary = null">Keep current/);
  assert.match(session, /sourceReview\.value \|\| !await verifySavedSummary\(\)/);
  assert.match(session, /reviewRequired:true,reviewedAt:null/);
  assert.match(session, /showRefinement && summaryDocument\?\.content\?\.body/);
  assert.match(session, /:show-preview="false"/);
  assert.match(refinement, /showPreview:\{type:Boolean,default:true\}/);
  assert.match(refinement,/showPreview && candidate && candidateIsCurrent/);
});

test('saved generation settings are reused and advanced controls remain collapsed',()=>{
  assert.match(session, /summaryLens\.value = previousGeneration\?\.lens \|\| clientData\.preferred_summary_lens/);
  assert.match(session, /excludeEarlierZoomNotes:excludeEarlierZoomNotes\.value/);
  assert.match(session, /previousGeneration\?\.excludeEarlierZoomNotes === true/);
  assert.match(session, /showSummaryOptions\.value = summaryUnsafe\.value \|\| !summaryDocument\.value\?\.content\?\.body/);
  assert.match(session, /showSummaryOptions\.value=false;showSummaryGuidance\.value=false;showRefinement\.value=false/);
});

test('floating back-to-top and one-tap copy target the real scrollport without bypassing clinical review',()=>{
  assert.match(session, /data-testid="session-summary-scroll-actions"/);
  assert.match(session, /@click="scrollSummaryToTop"/);
  assert.match(session, /sessionScrollContainer\.value\?\.scrollTo\(\{top:0/);
  assert.match(session, /@click="copySummary"/);
  assert.match(session, /!needsTherapistReview && !summaryUnsafe && !sourceReview/);
  assert.match(session, /if \(!summaryDocument\.value\?\.content\?\.body \|\| sourceReview\.value \|\| summaryUnsafe\.value \|\| needsTherapistReview\.value\) return;/);
  assert.match(session, /if\(!await verifySavedSummary\(\)\)return;/);
  assert.match(session, /navigator\.clipboard\.writeText\(summaryDocument\.value\.content\.body\)/);
});

test('source integrity errors remain blocking and now scroll to their explanation',()=>{
  assert.match(session,/if\(err\.code==='SOURCE_REVIEW_REQUIRED'\)/);
  assert.match(session,/await scrollToSummaryTarget\(sourceReviewNotice\)/);
  assert.match(session,/ref="sourceReviewNotice"/);
  assert.match(session,/summaryDocument\.value\?\.status==='completed'/);
});
