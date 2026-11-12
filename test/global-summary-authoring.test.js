import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeSummaryOptions, SUMMARY_POLICY_VERSION, renderSummarySections, parseSummaryBlocks, summaryBodyToRichContent, resourceAppendix, safeResourceUrl, candidateMatches } from '../src/lib/summaryAuthoring.js';
import { summaryClinicalEvidence } from '../src/lib/summaryEvidence.js';
import { summaryAuthoringPrompt, assessSummaryDraft } from '../api/_lib/summary-authoring-policy.js';
import { reviewSummaryDraft } from '../api/_lib/summary-quality-review.js';
import { isPublicResourceAddress, readPublicResource, verifySummaryResource } from '../api/_lib/summary-resource-check.js';
import { CLIENT_SESSION_SUMMARY_FIELDS, CLIENT_SESSION_SUMMARY_LENSES, clientSessionSummarySystemPrompt, buildClinicalIntelligenceEvidenceMap, renderClientSessionSummary } from '../api/_lib/ai-client-session-summary.js';
import { buildClinicalRecordSources } from '../api/_lib/clinical-record-evidence.js';
import { EventEmitter } from 'node:events';
const sid='session:11111111-1111-4111-8111-111111111111';
const fields=()=>Object.fromEntries(CLIENT_SESSION_SUMMARY_FIELDS.map(key=>[key,'']));
const sentence='A difficult exchange was paused, but returning to it remained uncertain.';
function draft(text=sentence){return {outcome:'ready',review:{reason:'',message:'',evidence:[]},sections:{...fields(),whatWeWorkedOn:text},claims:[{section:'whatWeWorkedOn',text,sourceIds:[sid],evidenceStrength:'current_observation'}]};}
const completion=value=>({model:'synthetic-model',completion:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}});
const request={feature:'client.session_summary',userId:'synthetic-user',promptVersion:SUMMARY_POLICY_VERSION,messages:[{role:'system',content:'Original evidence only.'},{role:'user',content:'Synthetic encounter: '+sentence}]};
const args=value=>({request,...completion(value),structured:value,validSourceIds:new Set([sid]),evidenceSources:[{id:sid,transcript:sentence}],summaryOptions:{}});

test('default is neutral for every client, with no practitioner or optional addition selected',()=>{
  assert.deepEqual(normalizeSummaryOptions(),{audience:'auto',addition:'none',resource:null});
  assert.throws(()=>normalizeSummaryOptions({addition:'resource',resource:{url:'https://example.com/video',title:'Example'}}));
  assert.throws(()=>normalizeSummaryOptions({resource:{url:'https://example.com/video'}}));
  assert.throws(()=>normalizeSummaryOptions({audience:'invented'}));
});
for(const lens of CLIENT_SESSION_SUMMARY_LENSES)test('shared global policy is used by '+lens,()=>{
  const prompt=clientSessionSummarySystemPrompt(lens,{audience:'shared'});
  assert.ok(prompt.includes(SUMMARY_POLICY_VERSION));
  assert.match(prompt,/Address both\/all consistently/);
  assert.match(prompt,/No NEW exercise/);
  assert.match(prompt,/a wish is not an agreement/);
  assert.match(prompt,/not independent confirmation/);
  assert.doesNotMatch(prompt,/Kabat|bad mother|knee injury/i);
});
test('individual audience does not turn discussion of other people into couples work',()=>{
  assert.match(summaryAuthoringPrompt('General',{audience:'individual'}),/Other people are discussed people, not additional recipients/);
  assert.match(summaryAuthoringPrompt('General',{audience:'shared'}),/Never manufacture equal responsibility/);
});
test('exercises require an explicit addition choice and remain prospective and adaptable',()=>{
  const prompt=summaryAuthoringPrompt('IFS',{addition:'exercise'});
  assert.match(prompt,/explicitly requested optional prospective guidance/);
  assert.match(prompt,/decline, modify or stop/);
  assert.match(prompt,/NOT completed, assigned or agreed/);
  assert.match(prompt,/unless established in the source/);
});
test('four visible groups preserve clinical text without requiring all eight fields',()=>{
  const sections={...fields(),whatWeWorkedOn:'Work described.',perspectiveReflection:'A tentative meaning.',changesAndExceptions:'A change with limits.',betweenSession:'An open question.'};
  const body=renderClientSessionSummary(sections,'gentle_cbt');
  assert.equal(body,renderSummarySections(sections));
  assert.equal(parseSummaryBlocks(body).filter(block=>block.type==='heading').length,4);
  assert.doesNotMatch(body,/A gentle CBT perspective|Closing reflection/);
  for(const value of Object.values(sections).filter(Boolean))assert.ok(body.includes(value));
});
test('short lines and resource URLs are not automatically promoted to headings',()=>{
  const body='What we worked on\n\nA brief sentence\n\nhttps://example.com/video\n\nOptional resource\n\n[An optional reference](https://example.com/video)';
  const parsed=parseSummaryBlocks(body);
  assert.equal(parsed.filter(item=>item.type==='heading').length,2);
  assert.equal(parsed.at(-1).pieces[0].href,'https://example.com/video');
  const rich=summaryBodyToRichContent(body);
  assert.equal(rich.content.at(-1).content[0].marks[0].type,'link');
  assert.equal(parseSummaryBlocks('[Unsafe](javascript:alert(1))')[0].pieces[0].href,undefined);
});
test('resource appendix requires a matching successful check and does not use audit jargon as client copy',()=>{
  const resource={title:'A reference',url:'https://example.com/video',purpose:'A way to explore awareness.',reviewed:true};
  assert.throws(()=>resourceAppendix(resource,null));
  assert.throws(()=>resourceAppendix(resource,{url:'https://different.example/video',status:'reachable'}));
  const body=resourceAppendix(resource,{url:resource.url,status:'reachable'});
  assert.match(body,/\[A reference\]/);assert.doesNotMatch(body,/therapist selected, not discussed/);
});
test('proposed exercises/resources never become evidence of subsequent interventions',()=>{
  const original='What we worked on\n\nThe client described tension.\n\nOptional exercise to consider: A proposed sensing practice.\n\nTry noticing your feet.\n\nClosing reflection\n\nThe discussion remained unfinished.\n\nOptional resource to consider (therapist selected, not discussed or agreed in session)\n\nA video\nhttps://example.com/video';
  const safe=summaryClinicalEvidence(original);
  assert.match(safe,/client described tension/);assert.match(safe,/discussion remained unfinished/);
  assert.doesNotMatch(safe,/sensing practice|feet|video|https:/);
  const map=buildClinicalIntelligenceEvidenceMap({captures:[{sessionId:'synthetic',content:{existingSessionSummary:original}}]});
  assert.equal(map.reviewedSessions[0].content.existingSessionSummary,safe);
  const records=buildClinicalRecordSources({sessionId:'synthetic',sessions:[{id:'synthetic'}],summaries:[{id:'doc',content:{body:original},source_manifest:[{sessionId:'synthetic'}]}]});
  assert.equal(records[0].text,safe);assert.ok(original.includes('sensing practice'));
});
test('mechanical editorial review detects actual repeated wording, not prompt keywords',()=>{
  const value=draft();value.sections.strengthsAndResources=sentence;
  assert.ok(assessSummaryDraft(value).some(item=>item.code==='REPEATED_SENTENCE'));
  assert.deepEqual(assessSummaryDraft(draft()),[]);
});
test('a clean ready result does not consume an extra generation',async()=>{
  let calls=0;const out=await reviewSummaryDraft({...args(draft()),run:async()=>{calls++;throw new Error('unneeded');}});
  assert.equal(calls,0);assert.equal(out.qualityReview.revisionAttempted,false);
});
test('source-review outcomes are never rewritten for better prose',async()=>{
  let calls=0;const value={outcome:'needs_review',sections:fields(),claims:[],review:{reason:'possible_mixed_encounters'}};
  const out=await reviewSummaryDraft({...args(value),run:async()=>{calls++;}});
  assert.equal(calls,0);assert.equal(out.structured.outcome,'needs_review');
});
test('one bounded revision can improve a repeated draft with the same source validation',async()=>{
  const value=draft();value.sections.strengthsAndResources=sentence;value.claims.push({...value.claims[0],section:'strengthsAndResources'});
  let calls=0;const out=await reviewSummaryDraft({...args(value),run:async received=>{calls++;assert.equal(received.messages[0].content,request.messages[0].content);return completion(draft());}});
  assert.equal(calls,1);assert.equal(out.structured.sections.strengthsAndResources,'');
});
test('a bad style revision cannot replace a source-valid original or retry forever',async()=>{
  const value=draft();value.sections.strengthsAndResources=sentence;value.claims.push({...value.claims[0],section:'strengthsAndResources'});
  const bad=draft('A fabricated improvement.');bad.claims[0].sourceIds=['OTHER_CLIENT'];let calls=0;
  const out=await reviewSummaryDraft({...args(value),run:async()=>{calls++;return completion(bad);}});
  assert.equal(calls,1);assert.equal(out.structured,value);assert.ok(out.qualityReview.warnings.length);
});
test('an unrequested new exercise cannot survive an unsuccessful revision',async()=>{
  const value=draft('Optional exercise to consider: Try a new practice.');let calls=0;
  await assert.rejects(reviewSummaryDraft({...args(value),run:async()=>{calls++;return completion(value);}}),{code:'SUMMARY_ADDITION_NOT_VERIFIED'});
  assert.equal(calls,1);
});
test('only matching draft/context snapshots may be accepted',()=>{
  const candidate={baseBody:'Current draft',contextKey:'client-a'};
  assert.equal(candidateMatches(candidate,'Current draft','client-a'),true);
  assert.equal(candidateMatches(candidate,'Therapist edit','client-a'),false);
  assert.equal(candidateMatches(candidate,'Current draft','client-b'),false);
});
for(const ip of ['127.0.0.1','10.2.3.4','169.254.169.254','172.16.0.1','192.168.1.1','100.64.1.1','198.18.0.1','203.0.113.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::'])test('resource checks reject non-public address '+ip,()=>assert.equal(isPublicResourceAddress(ip),false));
test('resource URLs reject local addresses, credentials, alternate ports and non-HTTPS schemes',()=>{
  for(const url of ['http://example.com','https://127.0.0.1','https://localhost','https://host.local','https://user:pass@example.com','https://example.com:8443','javascript:alert(1)'])assert.throws(()=>safeResourceUrl(url));
  assert.equal(isPublicResourceAddress('8.8.8.8'),true);assert.equal(isPublicResourceAddress('2606:4700:4700::1111'),true);
});
test('public link fetch pins the validated DNS address rather than resolving it again',async()=>{
  let options;
  const data=await readPublicResource('https://example.com/page',{resolve:async()=>[{address:'8.8.8.8',family:4}],request:(_url,opts,callback)=>{
    options=opts;const req=new EventEmitter();req.end=()=>{const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/html'};callback(res);res.emit('data',Buffer.from('<title>Synthetic reference</title>'));res.emit('end');};req.destroy=()=>{};return req;
  }});
  let address;options.lookup('example.com',{},(_error,value)=>{address=value;});assert.equal(address,'8.8.8.8');assert.match(data.body,/Synthetic reference/);
});
test('a public resource cannot redirect the checker to a private IP',async()=>{
  let requests=0;
  await assert.rejects(readPublicResource('https://example.com/page',{resolve:async()=>[{address:'8.8.8.8',family:4}],request:(_url,_opts,callback)=>{
    requests++;const req=new EventEmitter();req.end=()=>{const res={statusCode:302,headers:{location:'https://127.0.0.1/private'},resume(){}};callback(res);};return req;
  }}));assert.equal(requests,1);
});
test('video details come from an explicitly selected URL, never a default practitioner',async()=>{
  let destination='';const checked=await verifySummaryResource({url:'https://www.youtube.com/watch?v=AbCdEf12345'},{read:async url=>{destination=url;return {body:JSON.stringify({provider_name:'YouTube',type:'video',title:'Synthetic awareness reference'})};}});
  assert.match(destination,/youtube.com\/oembed/);assert.equal(checked.title,'Synthetic awareness reference');assert.equal(checked.clinicalSuitability,'not_assessed');
});
test('both routes and actual screens use the shared implementation, not separate prompt fragments',()=>{
  const direct=fs.readFileSync(new URL('../api/ai/session-summary.js',import.meta.url),'utf8');
  const longitudinal=fs.readFileSync(new URL('../api/ai/client-session-summary.js',import.meta.url),'utf8');
  for(const source of [direct,longitudinal]){
    assert.match(source,/clientSessionSummarySystemPrompt\(lens,summaryOptions\)/);
    assert.match(source,/reviewSummaryDraft/);assert.match(source,/verifySummaryResource/);assert.match(source,/assertSourcesUnchanged/);
  }
  for(const path of ['../src/views/SessionWorkspace.vue','../src/components/workspace/ClientDocumentComposer.vue']){
    const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');assert.match(source,/<SummaryRefinementPanel/);assert.match(source,/candidateMatches/);
    assert.doesNotMatch(source,/Kabat|_DTmGtznab4|includeResource|setRefinementExample/);
  }
});
