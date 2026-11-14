import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
test('accepted replacements preserve provenance, isolate clients and roll back failed insertion',async()=>{
 const db=new PGlite()
 const therapist='11111111-1111-4111-8111-111111111111',client='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333',session='44444444-4444-4444-8444-444444444444',item='55555555-5555-4555-8555-555555555555'
 await db.exec(`create schema auth; create role authenticated; create function auth.uid() returns uuid language sql as $$select '${therapist}'::uuid$$;
 create table clients(id uuid primary key,user_id uuid); create table sessions(id uuid primary key,client_id uuid,user_id uuid);
 create table client_care_items(id uuid primary key default gen_random_uuid(),therapist_id uuid,client_id uuid,kind text check(kind in ('learning','trying')),body text,status text default 'current',origin text,ai_prompt_version text,provenance_session_id uuid);
 insert into clients values('${client}','${therapist}'); insert into sessions values('${session}','${other}','${therapist}');
 insert into client_care_items(id,therapist_id,client_id,kind,body) values('${item}','${therapist}','${client}','learning','Original');`)
 await db.exec(await readFile(new URL('../supabase/migrations/20261114180000_therapy_focus_evidence.sql',import.meta.url),'utf8'))
 const call=(kind,evidence=null)=>db.query('select * from save_reviewed_care_item($1,$2,$3,$4,$5,null,$6)',[client,kind,'New','v2',evidence,item])
 await assert.rejects(call('invalid'))
 assert.equal((await db.query('select status from client_care_items where id=$1',[item])).rows[0].status,'current')
 await assert.rejects(call('learning',{sources:[{sessionId:session}]}),/Evidence must belong/)
 await db.query('update sessions set client_id=$1',[client])
 const evidence={sources:[{sessionId:session,occurredAt:'2026-10-02'}],coverage:{selectedSessionIds:[session]}}
 const saved=(await call('learning',evidence)).rows[0]
 assert.deepEqual(saved.evidence,evidence)
 assert.equal((await db.query('select status from client_care_items where id=$1',[item])).rows[0].status,'historical')
 await assert.rejects(call('learning',evidence),/original Therapy Focus item has changed/)
 await db.close()
})
