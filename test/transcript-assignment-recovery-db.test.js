import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',foreign='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const source='dddddddd-dddd-4ddd-8ddd-dddddddddddd',session='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const text='Therapist: Welcome Alex.\nAlex: I feel worried about work.\nTherapist: Goodbye Alex.\nTherapist: Welcome Casey.\nCasey: I am grieving my father.\nTherapist: We will continue next week.';
async function setup(){
 const db=new PGlite();await db.waitReady;
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,created_at timestamptz not null default now(),raw_user_meta_data jsonb not null default '{}'::jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null);
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(trim(both '/' from name),'/')$$;`);
 const directory=new URL('../supabase/migrations/',import.meta.url);
 for(const file of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,directory),'utf8'));
 await db.exec(`insert into auth.users(id)values('${user}'),('${other}');
 insert into public.clients(id,user_id,display_name)values('${a}','${user}','Alex Example'),('${b}','${user}','Casey Example'),('${foreign}','${other}','Foreign Example');
 insert into public.sessions(id,user_id,client_id,occurred_at,status,notes,notes_status,workflow_status)values('${session}','${user}','${a}','2026-11-04T09:00:00Z','source_ready','','draft','transcript_received');`);
 await db.query(`insert into public.zoom_transcripts(id,therapist_user_id,client_id,session_ref,zoom_meeting_id,zoom_recording_file_id,original_transcript,zoom_generated_summary,status,source_occurred_at)values($1,$2,$3,$4,'meeting','file',$5,'Whole-recording note must not leak','ready','2026-11-04T09:00:00Z')`,[source,user,a,session,text]);return db;
}
async function current(db){return (await db.query('select * from public.zoom_transcripts where id=$1',[source])).rows[0]}
async function correct(db, action, extra={}){
 const row=await current(db);
 return (await db.query('select public.correct_transcript_assignment($1,$2,$3,$4,$5,$6,$7,$8) as result',
 [extra.owner||user,source,action,extra.version||row.source_version,extra.updatedAt||row.updated_at,extra.client||null,extra.session||null,extra.event||null])).rows[0].result;
}
async function rejected(db,run,pattern){await db.exec('savepoint expected_error');try{await assert.rejects(run,pattern)}finally{await db.exec('rollback to savepoint expected_error; release savepoint expected_error')}}
test('assignment recovery transactions preserve ownership, records and source safety',async t=>{
 const db=await setup();
 const check=async(name,run)=>t.test(name,async()=>{await db.exec('begin');try{await run()}finally{await db.exec('rollback')}});
 try{
 await check('preview is read-only and contains a checked source identity',async()=>{
   const before=await current(db),result=await correct(db,'inspect');assert.equal(result.blocked,false);assert.equal(result.clientId,a);assert.equal(result.sessionId,session);assert.equal(result.sourceVersion,before.source_version);assert.deepEqual(await current(db),before);
 });
 await check('detach removes both links, retains source and supports undo',async()=>{
   const before=await current(db),result=await correct(db,'detach');let row=await current(db);assert.equal(row.client_id,null);assert.equal(row.session_ref,null);assert.equal(row.original_transcript,before.original_transcript);assert.notEqual(row.source_version,before.source_version);
   const restored=await correct(db,'undo',{event:result.eventId});row=await current(db);assert.equal(row.client_id,a);assert.equal(row.session_ref,session);assert.equal(restored.canUndo,false);
   await rejected(db,()=>correct(db,'undo',{event:result.eventId}),/no longer be undone/);
 });
 await check('detach and archive persists its own archive state',async()=>{
   await correct(db,'detach_archive');const row=await current(db);assert.equal(row.client_id,null);assert.equal(row.session_ref,null);assert.ok(row.inbox_archived_at);assert.ok(row.attention_cleared_at);
 });
 await check('reassignment creates an independent encounter without moving the old session',async()=>{
   const result=await correct(db,'reassign',{client:b});assert.equal(result.clientId,b);assert.notEqual(result.sessionId,session);
   const old=(await db.query('select client_id from sessions where id=$1',[session])).rows[0];assert.equal(old.client_id,a);
   const restored=await correct(db,'undo',{event:result.eventId});assert.equal(restored.clientId,a);assert.equal(restored.sessionId,session);
 });
 await check('reassignment can select a verified existing encounter and rejects foreign clients',async()=>{
   await db.query("insert into sessions(id,user_id,client_id,occurred_at,status,notes,notes_status,workflow_status)values($1,$2,$3,now(),'source_ready','','draft','transcript_received')",[b,user,b]);
   await rejected(db,()=>correct(db,'reassign',{client:foreign}),/not found/);
   await rejected(db,()=>correct(db,'reassign',{client:b,session:session}),/not found/);
   const result=await correct(db,'reassign',{client:b,session:b});assert.equal(result.sessionId,b);
 });
 await check('deletion is atomic, erases imported content and retains a tombstone',async()=>{
   const result=await correct(db,'detach_delete');const row=await current(db);assert.equal(result.canUndo,false);assert.ok(row.deleted_at);assert.equal(row.client_id,null);assert.equal(row.session_ref,null);assert.equal(row.original_transcript,'');assert.equal(row.zoom_generated_summary,null);assert.equal(row.structured_transcript,null);
   const audit=(await db.query("select review from transcript_source_review_events where id=$1",[result.eventId])).rows[0];assert.ok(!JSON.stringify(audit).includes('Welcome Alex'));
 });
 await check('dependent documents are listed and block changes; explicit dispute pauses use',async()=>{
   const before=await current(db);
   await db.query(`insert into documents(user_id,client_id,client_ref,client_name,title,document_type,status,content,source_manifest)values($1,$2::uuid,$2::text,'Alex','Saved summary','session_summary','draft','{"body":"Clinical material"}',$3)`,[user,a,JSON.stringify([{kind:'zoom_transcript',sessionId:session,transcriptId:source,sourceVersion:before.source_version}])]);
   const preview=await correct(db,'inspect');assert.equal(preview.blocked,true);assert.ok(preview.affected.some(i=>i.label==='Saved summary'));
   await rejected(db,()=>correct(db,'detach_delete'),/Related work/);assert.equal((await current(db)).client_id,a);
   await correct(db,'flag');assert.equal((await current(db)).source_review.state,'needs_review');
   await rejected(db,()=>db.query("update documents set status='final' where user_id=$1",[user]),/requires review/);
 });
 await check('stale versions and later source edits prevent correction and undo',async()=>{
   const before=await current(db),result=await correct(db,'detach');
   await rejected(db,()=>correct(db,'detach_archive',{version:before.source_version,updatedAt:before.updated_at}),/changed/);
   await db.query('update sessions set version=version+1 where id=$1',[session]);
   await rejected(db,()=>correct(db,'undo',{event:result.eventId}),/encounter changed/);
 });
 await check('service-only RPC rejects foreign owners and browser invocation',async()=>{
   await rejected(db,()=>correct(db,'inspect',{owner:other}),/not found/);
   const privileges=(await db.query("select has_function_privilege('authenticated','public.correct_transcript_assignment(uuid,uuid,text,uuid,timestamptz,uuid,uuid,uuid)','execute') as allowed")).rows[0];assert.equal(privileges.allowed,false);
   await db.exec('set role authenticated');try{await rejected(db,()=>correct(db,'inspect'))}finally{await db.exec('reset role')}
 });
 }finally{await db.close()}
});
