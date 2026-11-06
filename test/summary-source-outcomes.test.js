import test from 'node:test';
import assert from 'node:assert/strict';
import { SUMMARY_OUTCOME_RULES, summaryOutcomeResponseFormat, validateSummaryOutcome } from '../api/_lib/summary-outcome.js';
import { CLIENT_SESSION_SUMMARY_FIELDS, buildClinicalIntelligenceSessionCandidates, clientSessionSummaryLensRule } from '../api/_lib/ai-client-session-summary.js';
import { isSummaryReviewNotice, isUnusableSummary, assertUsableSummaryResult } from '../src/lib/summarySafety.js';
import { sourceBlock } from '../api/ai/session-summary.js';
const id='session:synthetic',ids=new Set([id]);
const sections=()=>Object.fromEntries(CLIENT_SESSION_SUMMARY_FIELDS.map(field=>[field,'']));
const ready=()=>({outcome:'ready',review:{reason:'',message:'',evidence:[]},sections:{...sections(),whatWeWorkedOn:'We explored the tension between wanting closeness and needing space.'},claims:[{section:'whatWeWorkedOn',text:'We explored the tension between wanting closeness and needing space.',sourceIds:[id],evidenceStrength:'current_observation'}]});
const original='Therapist: Tell me about your sister.\nClient: One part wants closeness; another needs space.\nTherapist: We can stay curious about both.';
const note='The session addressed two separate couples/individuals.';
const evidence=[{id,transcriptId:'t1',transcript:original,zoom_note:note}];
const warning='This recording appears to contain two distinct client conversations. It should be separated and reviewed before any client-facing summary is shared.\nPlease confirm which client conversation this summary is intended to address, then prepare separate summaries to protect confidentiality.';
const review=(sourceType='transcript',quote='Client: One part wants closeness; another needs space.')=>({outcome:'needs_review',sections:sections(),claims:[],review:{reason:'possible_mixed_encounters',message:'Check the passage in its original context.',evidence:[{sourceId:id,sourceType,quote}]}});
test('all lenses share one contract without treating IFS parts as separate clients',()=>{
 for(const lens of ['general','integrative','gentle_cbt','internal_family_systems','transactional_analysis']){assert.ok(clientSessionSummaryLensRule(lens));assert.equal(validateSummaryOutcome(ready(),ids,evidence).outcome,'ready')}
 assert.match(SUMMARY_OUTCOME_RULES,/IFS parts or inner positions do not by themselves/);assert.match(SUMMARY_OUTCOME_RULES,/Never infer separate appointments solely from a Zoom note/);assert.match(SUMMARY_OUTCOME_RULES,/already-resolved concern/);
});
test('the reported warning is rejected even when disguised as a ready summary',()=>{
 const value=ready();value.sections.whatWeWorkedOn=warning;value.claims[0].text=warning;
 assert.equal(isSummaryReviewNotice(warning),true);assert.equal(validateSummaryOutcome(value,ids,evidence),null);assert.equal(isUnusableSummary({body:warning}),true);
 assert.throws(()=>assertUsableSummaryResult({outcome:'ready',draft:{body:warning}}),{code:'INVALID_SUMMARY_OUTCOME'});
});
test('ordinary discussion of confidentiality, relationships and parts remains clinical content',()=>{
 for(const body of ['We discussed confidentiality and your relationship with your sister.','Two parts of you want different things.','We reviewed your music recording.'])assert.equal(isSummaryReviewNotice(body),false);
});
test('quotes must exist in their named source and carry exact original line references',()=>{
 for(const value of [review('transcript','Fabricated content not present here.'),review('zoom_note',original),review('transcript',note),review('toString','not a valid source type')])assert.equal(validateSummaryOutcome(value,ids,evidence),null);
 const value=validateSummaryOutcome(review(),ids,evidence);assert.equal(value.outcome,'needs_review');assert.equal(value.review.evidence[0].startLine,2);assert.equal(value.review.evidence[0].verified,true);
});
test('secondary-note-only concern is a conflict rather than proven mixed appointments',()=>{assert.equal(validateSummaryOutcome(review('zoom_note',note),ids,evidence).review.reason,'source_conflict')});
test('review and failure outcomes cannot carry a client-facing draft',()=>{
 const value=review();value.sections.closing='Please share this.';value.claims=[{section:'closing',text:'Please share this.',sourceIds:[id],evidenceStrength:'current_observation'}];assert.equal(validateSummaryOutcome(value,ids,evidence),null);
 assert.throws(()=>assertUsableSummaryResult({outcome:'needs_review',review:{message:'Review.'},draft:{body:'Do not save'}}),{code:'SOURCE_REVIEW_REQUIRED'});
 assert.throws(()=>assertUsableSummaryResult({outcome:'generation_failed'}),{code:'INVALID_SUMMARY_OUTCOME'});
});
test('empty and opening/closing-only outputs are not usable summaries',()=>{
 const value=ready();value.sections=sections();value.claims=[];assert.equal(validateSummaryOutcome(value,ids,evidence),null);
 value.sections.closing='Please confirm the source.';value.claims=[{section:'closing',text:value.sections.closing,sourceIds:[id],evidenceStrength:'current_observation'}];assert.equal(validateSummaryOutcome(value,ids,evidence),null);
});
test('schema enforces explicit outcome and a closed source vocabulary',()=>{
 const schema=summaryOutcomeResponseFormat(ids).json_schema.schema;assert.deepEqual(schema.required,['outcome','review','sections','claims']);assert.equal(schema.additionalProperties,false);assert.deepEqual(schema.properties.review.properties.evidence.items.properties.sourceId.enum,[id]);
});
test('source blocks distinguish primary transcript, imported note and therapist clarification',()=>{
 const block=sourceBlock({id,original_transcript:original,zoom_generated_summary:note,source_review:{state:'confirmed',context:'One individual discussing family relationships.'}},{isCurrent:true});
 assert.equal(block.transcript,original);assert.equal(block.zoom_note,note);assert.match(block.therapistSourceClarification,/One individual/);
});
test('legacy notices and non-ready documents cannot enter longitudinal evidence',()=>{
 const summaryDocuments=[{id:'bad',content:{body:warning},source_manifest:[{kind:'zoom_transcript',sessionId:'s'}]},{id:'bad2',content:{body:'A notice.',summaryGeneration:{outcome:'needs_review'}},source_manifest:[{kind:'zoom_transcript',sessionId:'s'}]}];
 assert.deepEqual(buildClinicalIntelligenceSessionCandidates({summaryDocuments,sessions:[{id:'s',occurred_at:'2026-11-05'}]}),[]);
});
