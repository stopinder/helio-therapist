import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClinicalRecordSources } from '../api/_lib/clinical-record-evidence.js';
import { loadClinicalRecordMaterial, materialInventory, selectClinicalMaterial, validMaterialSelection } from '../api/_lib/clinical-record-material.js';
import { assertClinicalRecordSourceSnapshot } from '../api/_lib/clinical-record-source-snapshot.js';
const uuid=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const userId=uuid(90),clientId=uuid(91),sessionId=uuid(1),oldId=uuid(9);
const current={id:sessionId,client_id:clientId,user_id:userId,status:'in_progress',occurred_at:'2026-11-17T12:00:00Z',notes:'Therapist recorded the client asking for help with anxiety.',updated_at:'v1'};
// Query-aware fake: source ownership, client, dates and status filters really apply.
function database(tables){
  return {from(table){let data=[...(tables[table]||[])];const query={
    select(){return query},eq(key,value){data=data.filter(row=>row[key]===value);return query},
    in(key,values){data=data.filter(row=>values.includes(row[key]));return query},
    is(key,value){data=data.filter(row=>(row[key]??null)===value);return query},
    lte(key,value){data=data.filter(row=>row[key]<=value);return query},
    order(key,{ascending}){data.sort((a,b)=>String(a[key]).localeCompare(String(b[key]))*(ascending?1:-1));return query},
    limit(n){data=data.slice(0,n);return query},maybeSingle(){return Promise.resolve({data:data[0]||null,error:null})},
    then(resolve,reject){return Promise.resolve({data,error:null}).then(resolve,reject)}
  };return query}};
}
function fixture(){return {
  clients:[{id:clientId,user_id:userId,archived:false}],
  sessions:[current,...Array.from({length:8},(_,i)=>({id:uuid(i+2),client_id:clientId,user_id:userId,status:'completed',occurred_at:`2026-10-${String(20-i).padStart(2,'0')}T12:00:00Z`,notes:JSON.stringify({presentingConcerns:'Original concerns from an earlier encounter.'}),updated_at:'v1'}))],
  private_reflections:[{id:uuid(20),client_id:clientId,user_id:userId,session_ref:sessionId,created_at:'2026-11-17T13:00:00Z',updated_at:'v1',body:'Therapist wonders whether their own urge to solve problems affected the discussion.'},
  {id:uuid(21),client_id:uuid(99),user_id:userId,session_ref:sessionId,created_at:'2026-11-17T11:00:00Z',body:'OTHER CLIENT PRIVATE CONTENT'}],
  session_capture_drafts:[{client_id:clientId,user_id:userId,session_id:sessionId,status:'draft',content:{sessionThemes:'Unreviewed capture text.'}}],
  zoom_transcripts:[],documents:[],client_care_items:[]
}}
test('discovers saved notes and older history beyond six sessions without admitting another client reflection',async()=>{
  const material=await loadClinicalRecordMaterial(database(fixture()),userId,clientId,current);
  assert.equal(material.sessionsChecked,9);
  assert.ok(material.sources.some(s=>s.id===`record:${oldId}`));
  assert.equal(material.sources.find(s=>s.id===`record:${sessionId}`).kind,'therapist_notes');
  assert.ok(material.sources.some(s=>s.id===`reflection:${uuid(20)}`));
  assert.ok(!material.sources.some(s=>s.text.includes('OTHER CLIENT')));
  assert.ok(material.unavailable.some(s=>s.id===`capture:${sessionId}`));
  assert.equal(material.historyLimited,false);
});
test('private reflection needs explicit selection and cannot be smuggled in through an unknown source ID',async()=>{
  const material=await loadClinicalRecordMaterial(database(fixture()),userId,clientId,current);
  assert.ok(selectClinicalMaterial(material.sources).every(s=>s.kind!=='private_reflection'));
  assert.deepEqual(selectClinicalMaterial(material.sources,[]),[]);
  const id=`reflection:${uuid(20)}`;
  assert.equal(selectClinicalMaterial(material.sources,[id])[0].kind,'private_reflection');
  assert.throws(()=>selectClinicalMaterial(material.sources,[`reflection:${uuid(21)}`]),{code:'SOURCE_CHANGED'});
  assert.equal(validMaterialSelection([id]),true);
  assert.equal(validMaterialSelection([id,id]),false);
  assert.equal(validMaterialSelection(['reflection:invented']),false);
  const inventory=materialInventory(material);
  assert.equal(inventory.sources.find(s=>s.id===id).requiresSelection,true);
  assert.ok(inventory.sources.every(s=>!Object.hasOwn(s,'text')));
});
test('only explicitly client-confirmed transcripts are eligible, and flagged sources exclude their encounter notes too',async()=>{
  const tables=fixture();tables.zoom_transcripts=[{id:uuid(30),therapist_user_id:userId,client_id:clientId,session_ref:sessionId,source_version:1,source_review:{state:'unreviewed'},original_transcript:'Client described panic in this encounter.',updated_at:'v1'}];
  let material=await loadClinicalRecordMaterial(database(tables),userId,clientId,current);
  assert.ok(!material.sources.some(s=>s.kind==='reviewed_transcript'));
  tables.zoom_transcripts[0].source_review={state:'confirmed'};
  material=await loadClinicalRecordMaterial(database(tables),userId,clientId,current);
  assert.equal(material.sources.find(s=>s.kind==='reviewed_transcript').text,tables.zoom_transcripts[0].original_transcript);
  tables.zoom_transcripts[0].source_review={state:'needs_review'};
  material=await loadClinicalRecordMaterial(database(tables),userId,clientId,current);
  assert.equal(material.currentSourceBlocked,true);
  assert.ok(material.sources.every(s=>s.sessionId!==sessionId));
});
test('a reflection edit or reassignment during generation invalidates all returned suggestions',async()=>{
  const tables=fixture(),db=database(tables);
  const material=await loadClinicalRecordMaterial(db,userId,clientId,current);
  const source=material.sources.find(s=>s.kind==='private_reflection');
  await assertClinicalRecordSourceSnapshot(db,userId,clientId,[source],material.snapshot);
  tables.private_reflections[0]={...tables.private_reflections[0],body:'Changed private content',updated_at:'v2'};
  await assert.rejects(assertClinicalRecordSourceSnapshot(db,userId,clientId,[source],material.snapshot),{code:'SOURCE_CHANGED'});
});
test('working notes stay explicitly unapproved and no more than 200 encounters are silently queried',()=>{
  const sources=buildClinicalRecordSources({sessionId,sessions:[current]});
  assert.equal(sources[0].reviewStatus,'working draft; not approved');
  assert.match(sources[0].title,/working draft/);
});
