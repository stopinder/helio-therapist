import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUMMARY_POLICY_VERSION } from '../src/lib/summaryAuthoring.js';
import { summaryAuthoringPrompt, assessSummaryDraft } from '../api/_lib/summary-authoring-policy.js';
import { CLIENT_SESSION_SUMMARY_LENSES, clientSessionSummarySystemPrompt, clientSessionSummaryLensRule } from '../api/_lib/ai-client-session-summary.js';

test('every modality inherits Rogers-informed, evidence-first therapeutic usefulness without compulsory praise',()=>{
  assert.equal(CLIENT_SESSION_SUMMARY_LENSES.length,5);
  for(const lens of CLIENT_SESSION_SUMMARY_LENSES){
    const prompt=clientSessionSummarySystemPrompt(lens,{audience:'individual'});
    for(const phrase of ['Therapeutic usefulness takes priority','unconditional positive regard','accurate empathic understanding','congruent, honest communication','Where the source supports it','do not force a positive takeaway','specific and proportionate','Do not lengthen a sparse source','Never invent quotations','not a diagnostic assessment']){
      assert.ok(prompt.includes(phrase),lens+' lacks: '+phrase);
    }
    assert.match(prompt,/It is not a diagnostic assessment or an automatically approved clinical record/);
    assert.match(prompt,/Do not claim insight, resilience, progress or meaningful change merely because the client described a difficulty/);
    assert.match(prompt,/Never manufacture equal responsibility/);
  }
  assert.equal(SUMMARY_POLICY_VERSION,'helios-summary-authoring/1.1.0');
  assert.match(summaryAuthoringPrompt('General'),/Do not flatter, congratulate routinely|minimise pain|Never flatter, congratulate routinely/);
});

test('each lens expresses the stance in its own language rather than appending theory jargon',()=>{
  const expected={
    general:['particular effort','false reassurance'],
    integrative:['relational awareness','do not impose a positive interpretation'],
    gentle_cbt:['what the client noticed, tested or learned','not as a success verdict'],
    internal_family_systems:['clarity, curiosity or compassion','responding with care to a younger part','do not declare a Self state'],
    transactional_analysis:['increased Adult awareness','lasting change']
  };
  for(const [lens,phrases] of Object.entries(expected)){
    const rule=clientSessionSummaryLensRule(lens);
    for(const phrase of phrases)assert.ok(rule.includes(phrase),lens+' missing '+phrase);
  }
  assert.doesNotMatch(clientSessionSummaryLensRule('transactional_analysis'),/self-leadership as a conclusion/i);
  assert.doesNotMatch(clientSessionSummaryLensRule('general'),/self-energy/i);
});

test('acknowledging demonstrated insight remains permissible without mandating a positive paragraph',()=>{
  const sections={
    opening:'',whatWeWorkedOn:'The client described continuing difficulty with sensing and staying present.',
    patternsOverTime:'',changesAndExceptions:'',
    strengthsAndResources:'The client offered their younger self reassurance that the family conflict was not their responsibility.',
    perspectiveReflection:'',betweenSession:'',closing:''
  };
  const issues=assessSummaryDraft({outcome:'ready',sections});
  assert.equal(issues.some(item=>item.blocking),false);
  assert.equal(issues.some(item=>item.code==='REPEATED_SENTENCE'),false);
  // No positive statement is mechanically required: a difficult and unresolved encounter can remain honest.
  const difficult={...sections,strengthsAndResources:''};
  assert.equal(assessSummaryDraft({outcome:'ready',sections:difficult}).some(item=>item.code==='MISSING_PRAISE'),false);
});

test('both summary generation routes and the editorial pass receive the same shared policy',()=>{
  const direct=fs.readFileSync(new URL('../api/ai/session-summary.js',import.meta.url),'utf8');
  const longitudinal=fs.readFileSync(new URL('../api/ai/client-session-summary.js',import.meta.url),'utf8');
  const review=fs.readFileSync(new URL('../api/_lib/summary-quality-review.js',import.meta.url),'utf8');
  for(const route of [direct,longitudinal]){
    assert.match(route,/clientSessionSummarySystemPrompt\(lens,summaryOptions\)/);
    assert.match(route,/reviewSummaryDraft/);
  }
  assert.match(review,/Retain brief, source-grounded recognition/);
  assert.match(review,/Never add automatic praise or invent improvement/);
  assert.match(review,/validateSummaryOutcome/);
});
