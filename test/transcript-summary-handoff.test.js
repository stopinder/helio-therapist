import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as Vue from 'vue'
import * as workflow from '../src/lib/transcriptWorkflow.js'
import * as navigation from '../src/lib/transcriptInboxNavigation.js'
import * as presentation from '../src/lib/transcriptPresentation.js'

const source = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
const workspace = fs.readFileSync(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
const fixture = () => ({ id:'source-a', clientId:null, sessionRef:null, status:'unassigned',
  sourceTitle:'Synthetic encounter source', sourceOccurredAt:'2026-10-14T09:30:00Z',
  receivedAt:'2026-10-15T09:30:00Z', updatedAt:'2026-10-15T09:30:00Z',
  completedAt:null, attentionClearedAt:null, reviewChoicesSavedAt:null, text:null })
const saved = (row=fixture()) => ({...row, clientId:'client-a',sessionRef:'encounter-exact',status:'assigned',updatedAt:'2026-10-15T10:00:00Z'})
const response = (body,ok=true) => ({ok,json:async()=>body})
function inbox(fetch=async()=>response({transcript:saved()}),push=async()=>undefined){
  const route={query:{}}
  globalThis.window={scrollY:0,history:{state:{},replaceState(value){this.state=value}},getComputedStyle:()=>({overflowY:'auto'}),scrollTo(){}}
  globalThis.requestAnimationFrame=callback=>callback()
  const deps={...workflow,...navigation,...presentation,ref:Vue.ref,computed:Vue.computed,nextTick:Vue.nextTick,
    onMounted:()=>{},watch:()=>{},useRouter:()=>({push}),useRoute:()=>route,authenticatedFetch:fetch,
    defineProps:()=>({clients:[{id:'client-a',name:'Alex Example'}]}),defineEmits:()=>()=>{},createClient:async()=>({id:'client-a',name:'Alex Example'})}
  const names='transcripts,selected,selectedClientId,assignmentDrafts,encounterDateDrafts,assignmentSavingId,encounterDateSavingId,lastAssignment,lastAssignmentLabel,errorMessage,successMessage,filterMode,searchQuery,historyLimit,visibleTranscripts,loading,inboxBusy,addClientTranscriptId'
  const functions=[...script.matchAll(/^(?:async )?function (\w+)/gm)].map(match=>match[1]).join(',')
  const state=new Function(...Object.keys(deps),`${script}\nreturn {${names},${functions}}`)(...Object.values(deps))
  state.route=route;state.transcripts.value=[fixture()];state.initialiseAssignmentDraft(state.transcripts.value[0])
  return state
}

test('saved relationship beats stale import status and historic archive flag',()=>{
  const record={...saved(),status:'unassigned',attentionClearedAt:'legacy'}
  assert.equal(workflow.transcriptWorkflowState(record).label,'Assigned')
  assert.equal(workflow.transcriptNeedsAttention(record),false)
  assert.equal(workflow.assignedTranscriptIdentity(record,''),'Assigned client')
  assert.equal(workflow.transcriptWorkflowState({clientId:'client-a'}).label,'Assigned - encounter needed')
  assert.equal(workflow.transcriptWorkflowState({attentionClearedAt:'manual'}).label,'Archived')
  assert.equal(workflow.transcriptWorkflowState({completedAt:'done'}).label,'Inbox setup complete')
})
test('assignment opens only the exact confirmed encounter and selected source without generation',async()=>{
  const requests=[],destinations=[]
  const state=inbox(async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return response({transcript:saved()})},async target=>{destinations.push(target)})
  await state.assignTranscriptToClient(fixture(),'client-a','',{openSummary:true})
  assert.equal(requests.length,1)
  assert.deepEqual(requests[0].body,{id:'source-a',expectedUpdatedAt:fixture().updatedAt,clientId:'client-a'})
  assert.deepEqual(destinations[0].params,{clientId:'client-a',sessionId:'encounter-exact'})
  assert.equal(destinations[0].query.transcriptId,'source-a')
  assert.equal(destinations[0].query.view,'summary')
  assert.equal(state.visibleTranscripts.value.length,0)
  assert.equal(state.lastAssignmentLabel.value,'Alex Example')
})
test('stay in inbox confirms this source and keeps the next unassigned item separate',async()=>{
  let navigations=0;const state=inbox(undefined,async()=>{navigations++})
  state.transcripts.value.push({...fixture(),id:'source-b'})
  await state.assignTranscriptToClient(fixture(),'client-a','',{openSummary:false})
  assert.equal(navigations,0);assert.equal(state.lastAssignment.value.id,'source-a')
  assert.deepEqual(state.visibleTranscripts.value.map(row=>row.id),['source-b'])
  assert.match(source,/Other transcripts needing attention/)
})
test('corrected encounter date is saved first and its returned version is used for assignment',async()=>{
  const requests=[]
  const state=inbox(async(_,options)=>{
    const body=JSON.parse(options.body);requests.push(body)
    if(body.sourceOccurredAt)return response({transcript:{...fixture(),sourceOccurredAt:body.sourceOccurredAt,updatedAt:'2026-10-15T09:45:00Z'}})
    return response({transcript:saved()})
  })
  state.encounterDateDrafts.value['source-a']='2026-10-10'
  await state.assignTranscriptToClient(fixture(),'client-a')
  assert.equal(requests.length,2);assert.ok(requests[0].sourceOccurredAt)
  assert.equal(requests[1].expectedUpdatedAt,'2026-10-15T09:45:00Z')
  assert.equal(requests[1].clearAttention,undefined)
})
test('failed date save prevents assignment',async()=>{
  let calls=0;const state=inbox(async()=>{calls++;return response({error:'Date conflict'},false)})
  state.encounterDateDrafts.value['source-a']='2026-10-10'
  assert.equal(await state.assignTranscriptToClient(fixture(),'client-a'),null)
  assert.equal(calls,1);assert.equal(state.lastAssignment.value,null)
})
test('double click during assignment results in one request',async()=>{
  let release,calls=0
  const state=inbox(async()=>{calls++;return new Promise(resolve=>{release=resolve})})
  const pending=state.assignTranscriptToClient(fixture(),'client-a')
  assert.equal(state.inboxBusy.value,true)
  await state.assignTranscriptToClient(fixture(),'client-a')
  assert.equal(calls,1)
  release(response({transcript:saved()}));await pending
  assert.equal(state.inboxBusy.value,false)
})
for(const [name,payload,ok] of [
  ['HTTP conflict',{error:'Changed in another tab'},false],
  ['wrong client',{transcript:{...saved(),clientId:'other-client'}},true],
  ['wrong source',{transcript:{...saved(),id:'other-source'}},true],
  ['missing encounter',{transcript:{...saved(),sessionRef:null}},true],
  ['empty response',{},true]
])test(`${name} cannot navigate to a guessed encounter`,async()=>{
  let navigations=0;const state=inbox(async()=>response(payload,ok),async()=>{navigations++})
  await state.assignTranscriptToClient(fixture(),'client-a','',{openSummary:true})
  assert.equal(navigations,0);assert.ok(state.errorMessage.value)
  assert.equal(state.successMessage.value,'')
})
test('navigation failure preserves assignment and retry navigates without another PATCH',async()=>{
  let patches=0,navigations=0
  const state=inbox(async()=>{patches++;return response({transcript:saved()})},async()=>{navigations++;if(navigations===1)throw new Error('Interrupted')})
  await state.assignTranscriptToClient(fixture(),'client-a','',{openSummary:true})
  assert.equal(state.lastAssignment.value.sessionRef,'encounter-exact')
  assert.match(state.errorMessage.value,/assignment is saved/)
  await state.openLinkedSessionFromRow(state.lastAssignment.value)
  assert.equal(patches,1);assert.equal(navigations,2);assert.equal(state.errorMessage.value,'')
})
test('detail assignment shares the same handover transaction',async()=>{
  const state=inbox();state.selected.value=fixture();state.selectedClientId.value='client-a'
  await state.saveAssignment({openSummary:false})
  assert.equal(state.lastAssignment.value.id,'source-a');assert.equal(state.selected.value,null)
})
test('new-client creation uses the same handover and keeps its name available',async()=>{
  const state=inbox();state.addClientTranscriptId.value='source-a'
  await state.handleAddClient({name:'Alex Example'})
  assert.equal(state.lastAssignment.value.sessionRef,'encounter-exact')
  assert.equal(state.lastAssignmentLabel.value,'Alex Example')
})
test('late detail response cannot overwrite a newer saved assignment',async()=>{
  const state=inbox(async()=>response({transcript:{...fixture(),text:'Synthetic source'}}))
  state.transcripts.value=[saved()]
  const record=await state.fetchTranscriptDetail(fixture())
  assert.equal(record.clientId,'client-a')
  assert.equal(state.transcripts.value[0].sessionRef,'encounter-exact')
})
test('return context is restored from an opaque token without names in the URL',async()=>{
  const destinations=[];const state=inbox(undefined,async target=>{destinations.push(target)})
  state.filterMode.value='history';state.searchQuery.value='Alex Example';state.historyLimit.value=40
  await state.openLinkedSessionFromRow(saved())
  const target=destinations[0],token=target.query.inboxReturn
  assert.doesNotMatch(JSON.stringify(target),/Alex Example/)
  assert.equal(navigation.readInboxReturnContext(token).search,'Alex Example')
  state.filterMode.value='attention';state.searchQuery.value='';state.historyLimit.value=20
  state.route.query.resume=token;await state.restoreInboxContext()
  assert.equal(state.filterMode.value,'history');assert.equal(state.searchQuery.value,'Alex Example');assert.equal(state.historyLimit.value,40)
  navigation.clearInboxReturnContexts();assert.equal(navigation.readInboxReturnContext(token),null)
})
test('primary actions precede compact context, and summary navigation is read-only',()=>{
  assert.ok(source.indexOf('class="inline-assignment"')<source.indexOf('class="zoom-note-card"'))
  assert.match(source,/Assign & open Clinical Workspace/);assert.match(source,/Assign &amp; stay in inbox/)
  const handler=source.split('async function openLinkedSession()')[1].split('function downloadRaw')[0]
  assert.doesNotMatch(handler,/markComplete|patchTranscript|generate/)
  assert.match(workspace,/Back to Transcript Inbox/)
})
const loader=workspace.slice(workspace.indexOf('async function loadTranscript(){'),workspace.indexOf('\nconst summaryGeneration',workspace.indexOf('async function loadTranscript(){')))
async function loadSource(record){
  const state={session:Vue.ref({id:'encounter-exact',clientId:'client-a'}),transcript:Vue.ref(null),transcriptLoading:Vue.ref(false),transcriptError:Vue.ref('')}
  let url=''
  const deps={...state,route:{query:{transcriptId:'source-a'}},authenticatedFetch:async path=>{url=path;return response({transcript:record})}}
  const load=new Function(...Object.keys(deps),`${loader}\nreturn loadTranscript`)(...Object.values(deps))
  await load();return {...state,url}
}
test('summary workspace fetches the exact source ID and validates ownership and encounter',async()=>{
  const valid=await loadSource(saved());assert.equal(valid.url,'/api/zoom/transcripts?id=source-a');assert.equal(valid.transcript.value.id,'source-a')
  for(const row of [{...saved(),clientId:'other'},{...saved(),sessionRef:'other'},{...saved(),id:'other'},null]){
    const invalid=await loadSource(row);assert.equal(invalid.transcript.value,null);assert.ok(invalid.transcriptError.value)
  }
  assert.match(workspace,/!transcript\.value \|\| transcriptLoading\.value \|\| transcriptError\.value/)
})
