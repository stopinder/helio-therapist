import test from 'node:test';
import assert from 'node:assert/strict';
import { summaryAuthoringPrompt, assessSummaryDraft } from '../api/_lib/summary-authoring-policy.js';
import { CLIENT_SESSION_SUMMARY_LENSES, clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';
import { SUMMARY_POLICY_VERSION } from '../src/lib/summaryAuthoring.js';

test('all five clinical lenses inherit the final shared writing standard',()=>{
  assert.equal(CLIENT_SESSION_SUMMARY_LENSES.length,5);
  for(const lens of CLIENT_SESSION_SUMMARY_LENSES){
    const prompt=clientSessionSummarySystemPrompt(lens);
    for(const phrase of ['Distinguish a loss, setback or disappointment','An improvement in housing','medication changes','nothing was chosen','Do not turn fatigue, numbness','Avoid editorial hedges']){
      assert.ok(prompt.includes(phrase),lens+': '+phrase);
    }
    assert.match(prompt,/source/i);
    assert.match(prompt,/therapist review/i);
  }
  assert.match(summaryAuthoringPrompt('Integrative'),/FINAL CLINICAL EDITORIAL PASS/);
  assert.ok(SUMMARY_POLICY_VERSION);
});

test('formulaic caveat is a nonblocking editorial signal, not a source-validation failure',()=>{
  const sections={opening:'',whatWeWorkedOn:'You described exhaustion and relief without assuming either is the problem.',patternsOverTime:'',changesAndExceptions:'',strengthsAndResources:'',perspectiveReflection:'',betweenSession:'',closing:''};
  const issues=assessSummaryDraft({outcome:'ready',sections});
  assert.ok(issues.some(item=>item.code==='FORMULAIC_CAVEAT' && item.blocking===false));
  assert.equal(issues.some(item=>item.blocking),false);
});
test('specific formulation without formulaic disclaimer is not flagged',()=>{
  const sections={opening:'',whatWeWorkedOn:'You described disappointment alongside relief that the associated worry had ended.',patternsOverTime:'',changesAndExceptions:'',strengthsAndResources:'',perspectiveReflection:'',betweenSession:'',closing:''};
  assert.ok(!assessSummaryDraft({outcome:'ready',sections}).some(item=>item.code==='FORMULAIC_CAVEAT'));
});
