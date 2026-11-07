import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSummaryOutcome} from '../api/_lib/summary-outcome.js';
const id='session:source-1';
const empty=()=>({opening:'',whatWeWorkedOn:'',patternsOverTime:'',changesAndExceptions:'',strengthsAndResources:'',perspectiveReflection:'',betweenSession:'',closing:''});
const review=()=>({outcome:'needs_review',review:{reason:'possible_mixed_encounters',message:'Possibly more than one encounter',evidence:[{sourceId:id,sourceType:'transcript',quote:'A topic discussed with this client.'}]},sections:empty(),claims:[]});
const sources=[{id,transcriptId:'transcript-1',transcript:'Therapist: hello\nA topic discussed with this client.\nEnd of meeting.',zoom_note:'Imported note for this encounter.'}];
const ids=new Set([id]);
test('exact quotations remain linked to original passages',()=>{
 const result=validateSummaryOutcome(review(),ids,sources);
 assert.equal(result.outcome,'needs_review');assert.equal(result.review.requiresManualVerification,false);
 assert.equal(result.review.evidence[0].startLine,2);
});
test('whitespace variations still verify without paraphrase',()=>{
 const value=review();value.review.evidence[0].quote='A topic discussed\nwith this client.';
 const result=validateSummaryOutcome(value,ids,sources);
 assert.equal(result.review.requiresManualVerification,false);
 assert.equal(result.review.evidence[0].quote,'A topic discussed with this client.');
});
test('ungrounded quotations require manual review, never become evidence',()=>{
 const value=review();value.review.evidence[0].quote='A fabricated passage about another client.';
 const result=validateSummaryOutcome(value,ids,sources);
 assert.equal(result.outcome,'needs_review');assert.equal(result.review.requiresManualVerification,true);
 assert.deepEqual(result.review.evidence,[]);
});
test('empty review citations yield manual review rather than a generic 502',()=>{
 const value=review();value.review.evidence=[];
 const result=validateSummaryOutcome(value,ids,sources);
 assert.equal(result.outcome,'needs_review');assert.equal(result.review.requiresManualVerification,true);
});
test('ready summary requires valid claims from supplied IDs',()=>{
 const value={outcome:'ready',review:{reason:'',message:'',evidence:[]},sections:empty(),claims:[]};
 value.sections.whatWeWorkedOn='We discussed a specific concern.';
 value.claims=[{section:'whatWeWorkedOn',text:value.sections.whatWeWorkedOn,sourceIds:[id],evidenceStrength:'current_observation'}];
 assert.equal(validateSummaryOutcome(value,ids,sources).outcome,'ready');
 value.claims[0].sourceIds=['other-client-source'];
 assert.equal(validateSummaryOutcome(value,ids,sources),null);
});
test('warning disguised as summary is rejected',()=>{
 const value={outcome:'ready',review:{reason:'',message:'',evidence:[]},sections:empty(),claims:[]};
 value.sections.whatWeWorkedOn='Please confirm which client conversation this summary addresses.';
 value.claims=[{section:'whatWeWorkedOn',text:value.sections.whatWeWorkedOn,sourceIds:[id],evidenceStrength:'current_observation'}];
 assert.equal(validateSummaryOutcome(value,ids,sources),null);
});
test('handler repairs once and does not flag sources with unverified quotes',()=>{
 const source=readFileSync(new URL('../api/ai/session-summary.js',import.meta.url),'utf8');
 assert.match(source,/one repair attempt/);
 assert.match(source,/if\(verifiedPrimaryConflict\(structured.review\)\)/);
 assert.match(source,/const remaining=cautiousSources\(selectedSources,structured.review\)/);
 assert.match(source,/AI_RESPONSE_UNVERIFIED/);
 assert.match(source,/No draft was saved/);
});
