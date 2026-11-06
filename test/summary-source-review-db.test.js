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
async function resolve(db,version,action,segments=[],owner=user,context='One encounter with Alex discussing family members.'){
 return (await db.query('select public.resolve_transcript_source_review($1,$2,$3,$4,$5,$6,$7) as result',[owner,source,version,action,context,'[]',JSON.stringify(segments)])).rows[0].result;
}
const segments=()=>[{startLine:1,endLine:3,clientId:a,occurredAt:'2026-11-04T09:00:00Z',reviewed:true},{startLine:4,endLine:6,clientId:b,occurredAt:'2026-11-04T10:00:00Z',reviewed:true}];
test('source review migration, isolation, races, exact splitting and document boundaries',async t=>{
 const db=await setup();try{
  await t.test('public and authenticated roles cannot invoke the service RPC',async()=>{
   const row=(await db.query(`select has_function_privilege('authenticated','public.resolve_transcript_source_review(uuid,uuid,uuid,text,text,jsonb,jsonb)','execute') as auth,has_function_privilege('anon','public.resolve_transcript_source_review(uuid,uuid,uuid,text,text,jsonb,jsonb)','execute') as anon`)).rows[0];assert.equal(row.auth,false);assert.equal(row.anon,false);
  });
  await t.test('foreign owners and foreign clients are rejected atomically',async()=>{
   const row=await current(db);await assert.rejects(()=>resolve(db,row.source_version,'confirm',[],other),/not found/);
   const bad=segments();bad[1].clientId=foreign;await assert.rejects(()=>resolve(db,row.source_version,'split',bad),/Client not found/);
   assert.equal((await db.query('select count(*)::int as n from public.sessions')).rows[0].n,1);
  });
  await t.test('confirmation binds to current source version and source edits invalidate it',async()=>{
   const row=await current(db),confirmed=await resolve(db,row.source_version,'confirm');assert.equal(confirmed.review.state,'confirmed');assert.notEqual(confirmed.sourceVersion,row.source_version);
   await assert.rejects(()=>resolve(db,row.source_version,'confirm'),/Source changed/);
   await db.query('update public.zoom_transcripts set zoom_generated_summary=$1 where id=$2',['Corrected secondary note',source]);const changed=await current(db);assert.deepEqual(changed.source_review,{});assert.notEqual(changed.source_version,confirmed.sourceVersion);
  });
  await t.test('audit is owner-readable and browser cannot forge metadata',async()=>{
   await db.exec('grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;');
   try{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);assert.ok((await db.query('select count(*)::int as n from public.transcript_source_review_events')).rows[0].n>0);
    await assert.rejects(()=>db.query('update public.zoom_transcripts set source_review=$1 where id=$2',[JSON.stringify({state:'confirmed'}),source]));
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);assert.equal((await db.query('select count(*)::int as n from public.transcript_source_review_events')).rows[0].n,0);
   }finally{await db.exec('reset role')}
  });
  await t.test('overlapping, missing and unreviewed ranges do not create records',async()=>{
   for(const edit of [s=>s[1].startLine=3,s=>s[1].endLine=999,s=>s[0].reviewed=false]){const ranges=segments();edit(ranges);await assert.rejects(()=>resolve(db,currentVersion,'split',ranges));}
   assert.equal((await db.query('select count(*)::int as n from public.zoom_transcripts')).rows[0].n,1);
  });
  await t.test('flagged source blocks document insertion before any draft can be overwritten',async()=>{
   let row=await current(db);await resolve(db,row.source_version,'flag',[],user,'Review the original source.');row=await current(db);
   const manifest=[{kind:'zoom_transcript',transcriptId:source,sessionId:session,sourceVersion:row.source_version}];
   await assert.rejects(()=>db.query(`insert into public.documents(user_id,client_id,client_ref,client_name,title,document_type,status,content,source_manifest)values($1,$2::uuid,$2::text,'Alex Example','Summary','session_summary','draft','{"body":"Clinical material"}',$3)`,[user,a,JSON.stringify(manifest)]),/requires review/);
  });
  await t.test('split creates exact isolated text and preserves immutable original',async()=>{
   const before=await current(db),result=await resolve(db,before.source_version,'split',segments());assert.equal(result.segments.length,2);
   const children=(await db.query('select * from public.zoom_transcripts where source_parent_id=$1 order by source_start_line',[source])).rows;
   assert.equal(children[0].original_transcript,text.split('\n').slice(0,3).join('\n'));assert.equal(children[1].original_transcript,text.split('\n').slice(3).join('\n'));
   assert.equal(children[0].zoom_generated_summary,null);assert.equal(children[1].zoom_generated_summary,null);assert.equal(children[0].client_id,a);assert.equal(children[1].client_id,b);assert.equal(children[0].source_review.state,'confirmed');assert.equal(children[0].source_parent_version,result.sourceVersion);
   assert.equal((await current(db)).original_transcript,text);await assert.rejects(()=>resolve(db,before.source_version,'split',segments()),/Source changed/);
   await assert.rejects(()=>db.query('update public.zoom_transcripts set original_transcript=$1 where id=$2',['replacement',source]),/retained unchanged/);
   assert.equal((await db.query('select count(*)::int as n from public.sessions')).rows[0].n,3);
  });
 }finally{await db.close()}
});
