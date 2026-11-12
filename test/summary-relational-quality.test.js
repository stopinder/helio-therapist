import test from 'node:test';
import assert from 'node:assert/strict';
import { SUMMARY_EDITORIAL_STANDARD, assessSummaryDraft } from '../api/_lib/summary-authoring-policy.js';
import { reviewSummaryDraft } from '../api/_lib/summary-quality-review.js';
import { CLIENT_SESSION_SUMMARY_FIELDS, CLIENT_SESSION_SUMMARY_LENSES, clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';
import { SUMMARY_POLICY_VERSION, renderSummarySections, parseSummaryBlocks } from '../src/lib/summaryAuthoring.js';
const sid='session:11111111-1111-4111-8111-111111111111';
const fields=()=>Object.fromEntries(CLIENT_SESSION_SUMMARY_FIELDS.map(field=>[field,'']));
function draft(sections,claims=[]){return {outcome:'ready',review:{reason:'',message:'',evidence:[]},sections:{...fields(),...sections},claims};}
const codes=value=>assessSummaryDraft(value).map(issue=>issue.code);

for(const lens of CLIENT_SESSION_SUMMARY_LENSES) for(const audience of ['auto','individual','shared']) {
 test(`${lens}/${audience} uses the same relational and evidence standard`,()=>{
  const prompt=clientSessionSummarySystemPrompt(lens,{audience});
  assert.ok(prompt.includes(SUMMARY_EDITORIAL_STANDARD));
  for(const phrase of ['do not grade how well','Do not manufacture agreement','A tentative opening does not license a definite causal explanation','not by itself evidence of progress','Do not add steps, monitoring tasks, benefits or homework']) assert.ok(prompt.includes(phrase));
 });
}
test('the reported writing defects trigger an editorial revision without claiming clinical error',()=>{
 const value=draft({whatWeWorkedOn:'The session suggested a conflict between understanding and feeling.',strengthsAndResources:'You were able to describe competing pressures with considerable nuance.',closing:'The question of how this might affect emotional reactions remains open.'});
 assert.deepEqual(new Set(codes(value)),new Set(['EVALUATIVE_CLIENT_LANGUAGE','REPORTING_VOICE','ABSTRACT_CLOSING']));
 assert.ok(assessSummaryDraft(value).every(issue=>!issue.blocking));
});
test('a formulation classified as tentative cannot silently read as an established cause',()=>{
 const claim={section:'perspectiveReflection',text:'Your need for certainty prevents emotional contact.',sourceIds:[sid],evidenceStrength:'tentative_connection'};
 assert.ok(codes(draft({perspectiveReflection:claim.text},[claim])).includes('UNMARKED_FORMULATION'));
 for(const text of ['We explored whether seeking certainty leaves less room for noticing feelings.','One possibility is that seeking certainty makes this unfamiliar process feel more workable.']) {
  assert.ok(!codes(draft({perspectiveReflection:text},[{...claim,text}])).includes('UNMARKED_FORMULATION'));
 }
});
test('grounded recognition and concrete unfinished work are not treated as compulsory praise or failure',()=>{
 const value=draft({whatWeWorkedOn:'You described wanting a clear method and finding it difficult to notice feelings.',strengthsAndResources:'You noticed tension in your shoulders while describing the exchange.',betweenSession:'You wanted to consider the suggestion before deciding whether to try it.'});
 assert.deepEqual(codes(value),[]);
 assert.deepEqual(codes(draft({whatWeWorkedOn:'The conversation remained painful and unresolved.'})),[]);
});
test('quoted evaluative words are not mistaken for the writer grading the client',()=>{
 assert.ok(!codes(draft({whatWeWorkedOn:'You recalled being told “you showed remarkable insight” and finding the comment uncomfortable.'})).includes('EVALUATIVE_CLIENT_LANGUAGE'));
});
test('the visible resource heading does not imply demonstrated change, and old saved headings still parse',()=>{
 const body=renderSummarySections({...fields(),strengthsAndResources:'You noticed the tension before replying.'});
 assert.match(body,/What you noticed and what helped/);
 assert.doesNotMatch(body,/Changes and resources/);
 assert.equal(parseSummaryBlocks('Changes and resources\n\nPreviously saved content.')[0].type,'heading');
});
test('one source-validated revision receives actionable feedback and the shared standard',async()=>{
 const fact='You described wanting a clear method and finding it difficult to notice feelings.';
 const original=draft({whatWeWorkedOn:fact,strengthsAndResources:'You were able to describe the situation with considerable nuance.'});
 original.claims=[{section:'whatWeWorkedOn',text:fact,sourceIds:[sid],evidenceStrength:'current_observation'},{section:'strengthsAndResources',text:original.sections.strengthsAndResources,sourceIds:[sid],evidenceStrength:'current_observation'}];
 const revised=draft({whatWeWorkedOn:fact},[original.claims[0]]);
 const response=value=>({model:'synthetic',completion:{choices:[{message:{content:JSON.stringify(value)}}]}});
 let calls=0;
 const result=await reviewSummaryDraft({request:{promptVersion:SUMMARY_POLICY_VERSION,messages:[{role:'system',content:'Source only'},{role:'user',content:fact}]},...response(original),structured:original,validSourceIds:new Set([sid]),evidenceSources:[{id:sid,transcript:fact}],run:async request=>{
  calls++;
  const instruction=request.messages.at(-1).content;
  assert.ok(instruction.includes(SUMMARY_EDITORIAL_STANDARD));
  assert.match(instruction,/Replace an assessment of the client/);
  assert.match(instruction,/Do not invent a shared exploration/);
  return response(revised);
 }});
 assert.equal(calls,1);
 assert.equal(result.structured.sections.whatWeWorkedOn,fact);
 assert.equal(result.structured.sections.strengthsAndResources,'');
 assert.equal(result.qualityReview.revisionAttempted,true);
 assert.deepEqual(result.qualityReview.warnings,[]);
});
