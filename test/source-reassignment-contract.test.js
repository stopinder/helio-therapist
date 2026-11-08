import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261108134500_reassign_reviewed_transcript_source.sql');
const api=read('api/zoom/source-review.js');
const standardPatch=read('api/zoom/transcripts.js');
const panel=read('src/components/workspace/SourceReviewPanel.vue');
const inbox=read('src/components/TranscriptInbox.vue');
const session=read('src/views/SessionWorkspace.vue');
const composer=read('src/components/workspace/ClientDocumentComposer.vue');
test('reassignment uses a service-only atomic RPC, not writable client side records',()=>{
  assert.match(migration,/CREATE OR REPLACE FUNCTION public\.reassign_reviewed_transcript_source/);
  assert.match(migration,/current_user NOT IN \('postgres','service_role'\)/);
  assert.match(migration,/REVOKE ALL ON FUNCTION public\.reassign_reviewed_transcript_source\([^\n]+\) FROM PUBLIC,anon,authenticated/);
  assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.reassign_reviewed_transcript_source\([^\n]+\) TO service_role/);
  assert.match(migration,/p_acknowledged IS DISTINCT FROM true/);
  assert.match(migration,/original\.source_version IS DISTINCT FROM p_expected_version/);
  assert.match(migration,/therapist_user_id=p_user_id/);
  assert.match(migration,/FOR UPDATE/);
  assert.match(migration,/SELECT \* INTO encounter FROM public\.sessions/);
  assert.match(migration,/user_id=p_user_id AND client_id=original\.client_id/);
  assert.match(migration,/user_id=p_user_id AND coalesce\(archived,false\)=false/);
});
test('source moves together with its isolated empty encounter and a complete audit',()=>{
  assert.match(migration,/UPDATE public\.sessions SET client_id=p_target_client_id/);
  assert.match(migration,/UPDATE public\.zoom_transcripts SET\s+client_id=p_target_client_id/);
  assert.match(migration,/source_review=new_review/);
  assert.match(migration,/transcript_source_review_events/);
  assert.match(migration,/'reassign'/);
  assert.match(migration,/'previousClientId',previous_client_id/);
  assert.match(migration,/sourceVersion',original\.source_version/);
  for(const term of ['public.session_capture_drafts','public.documents','public.session_working_notes','public.private_reflections','public.client_care_items','public.zoom_session_links','public.cbt_thought_records','public.session_billable_time_revisions','original.source_parent_id','source_review->>\'state\'=\'separated\'']){
    assert.ok(migration.includes(term), 'dependency check missing: '+term);
  }
});
test('authenticated API and ordinary assignment path do not silently move a linked source',()=>{
  assert.match(api,/\['confirm','split','reassign'\]/);
  assert.match(api,/reassign_reviewed_transcript_source/);
  assert.match(api,/targetClientId===row\.client_id/);
  assert.match(api,/p_acknowledged:reviewed/);
  assert.match(api,/REASSIGNMENT_BLOCKED/);
  assert.match(standardPatch,/existing\.client_id && clientId !== existing\.client_id/);
});
test('all three source-review entry points support the corrected destination',()=>{
  assert.match(panel,/value="reassign"/);
  assert.match(panel,/data-testid="reassign-target-client"/);
  assert.match(panel,/data-testid="confirm-source-reassignment"/);
  assert.match(panel,/reassignReviewed\.value/);
  assert.match(panel,/Open corrected encounter/);
  assert.match(inbox,/Correct client assignment/);
  assert.match(inbox,/Correct assignment/);
  assert.match(inbox,/if\(result\.action==='reassign'\)/);
  assert.match(session,/if\(result\.action==='reassign'\)/);
  assert.match(session,/await router\.replace\(\{name:'SessionWorkspace'/);
  assert.match(session,/await loadSession\(\);/);
  assert.match(composer,/if\(result\.action==='reassign'\)/);
  assert.match(composer,/The existing summary cannot be reused as evidence/);
});
