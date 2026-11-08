import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SOURCE_CONFIRMATION_ATTESTATION, sourceConfirmationContext } from '../api/_lib/source-review.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const panel=read('src/components/workspace/SourceReviewPanel.vue');
const api=read('api/zoom/source-review.js');
const sql=read('supabase/migrations/20261107155046_permit_review_of_zoom_note_only_sources.sql');

test('a blank optional note produces an honest, auditable explicit encounter attestation',()=>{
  assert.equal(sourceConfirmationContext(''),SOURCE_CONFIRMATION_ATTESTATION);
  assert.equal(sourceConfirmationContext('   '),SOURCE_CONFIRMATION_ATTESTATION);
  assert.ok(sourceConfirmationContext('').length>=10);
  assert.ok(sourceConfirmationContext('').length<=4000);
  assert.equal(sourceConfirmationContext(' Ben only '),SOURCE_CONFIRMATION_ATTESTATION+' Additional therapist context: Ben only');
});
test('malformed and oversized free text cannot corrupt source-review metadata',()=>{
  assert.throws(()=>sourceConfirmationContext('x'.repeat(4000)),{code:'INVALID_REVIEW'});
  assert.throws(()=>sourceConfirmationContext({type:'not text'}),{code:'INVALID_REVIEW'});
});
test('source review confirmation needs explicit acknowledgement but no invented participant narrative',()=>{
  assert.match(panel,/hasSourceMaterial\.value&&reviewed\.value&&!!source\.value\?\.clientId/);
  assert.doesNotMatch(panel,/context\.value\.trim\(\)\.length>=10/);
  assert.match(panel,/Add participants or context \(optional\)/);
  assert.match(panel,/:disabled="!canConfirm"/);
  assert.match(panel,/mode === 'confirm'/);
  assert.match(panel,/Separate conversations/);
});
test('authenticated source-review API supplies contextual attestation to unchanged secure RPC',()=>{
  assert.match(api,/reviewed!==true/);
  assert.match(api,/eq\('therapist_user_id',user\.id\)/);
  assert.match(api,/p_expected_version:sourceVersion/);
  assert.match(api,/const reviewContext=action==='confirm'\?sourceConfirmationContext\(context\):context/);
  assert.match(api,/p_context:reviewContext/);
  assert.match(sql,/source_version<>p_expected_version/);
  assert.match(sql,/current_user not in \('postgres','service_role'\)/);
  assert.match(sql,/length\(trim\(coalesce\(p_context,''\)\)\)<10/);
  assert.match(sql,/insert into public\.transcript_source_review_events/);
});
