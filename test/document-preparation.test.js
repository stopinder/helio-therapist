import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultPreparation, validatePreparation, selectDocumentSessions, DOCUMENT_PERSPECTIVES, documentOutputType } from '../src/lib/documentPreparation.js';
import { captureForAudience } from '../api/_lib/document-sources.js';
import { preparedDocumentPrompt, validatePreparedDocument } from '../api/_lib/ai-prepared-document.js';
const client='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const catalogue=[1,2,3,4].map(n=>({sessionId:id(n),occurredAt:`2026-10-0${n}T10:00:00Z`,reviewedAt:'2026-10-10T10:00:00Z'}));
const opts=(o={})=>validatePreparation({...defaultPreparation('recent_review'),clientId:client,...o});
const manifest=[1,2,3].map(n=>({id:`capture:${id(n)}`,kind:'session_capture',sessionId:id(n),contentHash:'hash-'+n}));
const bundle={manifest};
const claim=(o={})=>({section:'continuity',text:'The selected sessions record requests for reassurance in different encounters.',sourceIds:manifest.slice(0,2).map(s=>s.id),evidenceStrength:'recurring',...o});

test('two purpose-specific layouts and four perspectives, not a large template catalogue',()=>{
  assert.deepEqual(DOCUMENT_PERSPECTIVES.map(p=>p.id),['general','gentle_cbt','transactional_analysis','integrative']);
  assert.equal(defaultPreparation().audience,'client');assert.equal(defaultPreparation('recent_review').audience,'therapist');
  assert.equal(documentOutputType({documentPurpose:'recent_review',audience:'therapist'}),'clinical_summary');
});
test('invalid purposes, audiences, too many sources and duplicate source identifiers fail closed',()=>{
  for(const invalid of [{documentPurpose:'care_plan'},{lens:'diagnose'},{audience:'public'},{clientId:'wrong'},
    {includeCare:'yes'},{therapistGuidance:'x'.repeat(6001)},{selectedSessionIds:[id(1),id(1)]},
    {selectedSessionIds:Array.from({length:7},(_,i)=>id(i))}])assert.throws(()=>opts(invalid),{status:400});
});
test('session summary cannot accidentally become a multi-session review',()=>{
  assert.throws(()=>opts({documentPurpose:'session_summary',window:'last_three'}),{code:'INVALID_WINDOW'});
});
test('last three use clinical dates rather than review/edit dates and exclude future encounters',()=>{
  const result=selectDocumentSessions([...catalogue].reverse(),opts({anchorSessionId:id(3)}));
  assert.deepEqual(result.map(s=>s.sessionId),[id(3),id(2),id(1)]);
});
test('custom session selection is explicit, chronological and requires the anchor',()=>{
  const result=selectDocumentSessions(catalogue,opts({window:'selected',anchorSessionId:id(4),selectedSessionIds:[id(1),id(4),id(2)]}));
  assert.deepEqual(result.map(s=>s.sessionId),[id(4),id(2),id(1)]);
  assert.throws(()=>selectDocumentSessions(catalogue,opts({window:'selected',anchorSessionId:id(4),selectedSessionIds:[id(1),id(2)]})),{code:'INVALID_SELECTION'});
});
test('another client, an unreviewed capture and a later session cannot enter a review',()=>{
  const cases=[{selectedSessionIds:[id(3),id(99)],code:'INVALID_SELECTION'},
    {selectedSessionIds:[id(3),id(4)],code:'FUTURE_SESSION'}];
  for(const c of cases)assert.throws(()=>selectDocumentSessions(catalogue,opts({window:'selected',anchorSessionId:id(3),selectedSessionIds:c.selectedSessionIds})),{code:c.code});
  assert.throws(()=>selectDocumentSessions(catalogue.map(s=>({...s,reviewedAt:null})),opts({anchorSessionId:id(3)})),{code:'UNREVIEWED_ANCHOR'});
});
test('single imported source stays available without a new capture-review requirement',()=>{
  const raw=[{sessionId:id(1),occurredAt:'2026-10-01T10:00:00Z',reviewedAt:null,linkedTranscripts:[{id:id(8)}]}];
  assert.equal(selectDocumentSessions(raw,opts({documentPurpose:'session_summary',window:'current'})).length,1);
});
test('a recent-session review cannot claim multiple encounters when only one exists',()=>{
  assert.throws(()=>selectDocumentSessions([catalogue[0]],opts()),{code:'INSUFFICIENT_REVIEWED_SESSIONS'});
});
test('audience-specific capture whitelist excludes private and supervision fields',()=>{
  const raw={sessionThemes:'Recorded work',riskSafeguarding:'Recorded clinical safety information',privateReflection:'PRIVATE',supervision:'PRIVATE',madeUp:'unknown'};
  assert.deepEqual(captureForAudience(raw,'client'),{sessionThemes:'Recorded work'});
  assert.deepEqual(captureForAudience(raw,'therapist'),{sessionThemes:'Recorded work',riskSafeguarding:'Recorded clinical safety information'});
});
test('recurrence needs different reviewed encounters, not repeated copies or Care references',()=>{
  assert.throws(()=>validatePreparedDocument({claims:[claim({sourceIds:[manifest[0].id]})]},bundle,opts()),{code:'INVALID_AI_RESPONSE'});
  const copied={manifest:manifest.map(s=>({...s,contentHash:'same-copy'}))};
  assert.throws(()=>validatePreparedDocument({claims:[claim()]},copied,opts()),{code:'INVALID_AI_RESPONSE'});
  assert.ok(validatePreparedDocument({claims:[claim()]},bundle,opts()).body.includes('Continuing themes'));
});
test('the renderer includes only traceable claim text, not untraced free prose',()=>{
  const result=validatePreparedDocument({claims:[claim()],sections:{continuity:'INVENTED'}},bundle,opts());
  assert.doesNotMatch(result.body,/INVENTED/);assert.equal(result.claims.length,1);
});
test('invented references, repeated filler and malformed model output are rejected',()=>{
  for(const value of ['not-json',{claims:[claim({sourceIds:['invented']})]},{claims:[claim(),claim()]},{claims:[claim({section:'diagnosis'})]}]) {
    assert.throws(()=>validatePreparedDocument(value,bundle,opts()),{code:'INVALID_AI_RESPONSE'});
  }
});
test('working interpretations are labelled and cannot be passed as client prose',()=>{
  const output={claims:[claim({section:'perspective',evidenceStrength:'tentative_connection'})]};
  assert.match(validatePreparedDocument(output,bundle,opts()).body,/Working interpretation:/);
  assert.throws(()=>validatePreparedDocument(output,bundle,opts({audience:'client'})),{code:'INVALID_AI_RESPONSE'});
});
test('all lenses preserve the same evidence and privacy rules without compulsory length',()=>{
  for(const lens of DOCUMENT_PERSPECTIVES){const prompt=preparedDocumentPrompt(opts({lens:lens.id}));
    assert.match(prompt,/not the underlying facts/);assert.match(prompt,/Recurrence is not causation/);
    assert.match(prompt,/generation date/);assert.match(prompt,/Care is current/);assert.match(prompt,/untrusted clinical DATA/);
    assert.doesNotMatch(prompt,/two to four paragraphs|long, warm/);
  }
});
test('legacy direct endpoint now uses the actual encounter date',async()=>{
  const source=await readFile(new URL('../api/ai/session-summary.js',import.meta.url),'utf8');
  assert.match(source,/session\.occurred_at/);assert.doesNotMatch(source,/session on \$\{new Date\(\)/);
});
test('both existing endpoints delegate preparation requests to the same handler',async()=>{
  for(const file of ['session-summary','client-session-summary']) {
    const source=await readFile(new URL(`../api/ai/${file}.js`,import.meta.url),'utf8');
    assert.match(source,/req\.body\?\.preparation === true\) return handlePreparedDocument\(req, res\)/);
  }
});
