import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transcriptClientAssignmentState, transcriptWorkflowState } from '../src/lib/transcriptWorkflow.js'

const view = readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url),'utf8')
const indexOf = term => view.indexOf(term)

test('client status is driven by a saved client association, even when import status is stale',()=>{
  assert.deepEqual(transcriptClientAssignmentState({status:'unassigned',clientId:'client-a'}),{id:'assigned',label:'Assigned',tone:'success'})
  assert.deepEqual(transcriptClientAssignmentState({status:'assigned',clientId:null}),{id:'needs-client',label:'Needs client',tone:'warning'})
  assert.equal(transcriptClientAssignmentState({clientId:'client-a',sessionRef:null}).label,'Assigned')
  assert.equal(transcriptWorkflowState({clientId:'client-a',sessionRef:null}).id,'needs-encounter')
  assert.equal(transcriptClientAssignmentState({clientId:'client-a',sourceReview:{state:'needs_review'}}).label,'Assigned')
  assert.equal(transcriptClientAssignmentState({clientId:'client-a',completedAt:'2026-11-05'}).label,'Assigned')
})

test('dynamic assignment state and the preview action are side by side at the top',()=>{
  const header = indexOf('class="row-header"')
  const status = indexOf('clientStatus(transcript).label')
  const action = indexOf('class="quiet-action preview-header-action"')
  const preview = indexOf('class="conversation-preview" aria-label="Transcript preview"')
  const assignment = indexOf('class="inline-assignment"')
  const zoom = indexOf('class="zoom-note-card"')
  const actions = indexOf('class="triage-actions"')
  assert.ok(header>=0 && header<status && status<action && action<preview && preview<assignment && assignment<zoom && zoom<actions)
  assert.match(view,/function clientStatus\(transcript\)\{ return transcriptClientAssignmentState\(transcript\) \}/)
  assert.match(view,/:tone="clientStatus\(transcript\).tone"/)
  assert.match(view,/additionalWorkflowStatus\(transcript\)/)
  assert.match(view,/v-if="additionalWorkflowStatus\(transcript\)"/)
  assert.equal((view.match(/Preview transcript' \}\}/g)||[]).length,1)
})

test('header preview toggles a nearby controlled region, without changing any assignment',()=>{
  assert.match(view,/:aria-controls="'transcript-preview-' \+ transcript.id"/)
  assert.match(view,/:id="'transcript-preview-' \+ transcript.id"/)
  assert.match(view,/:aria-expanded="expandedRows.has\(transcript.id\)"/)
  assert.match(view,/:disabled="previewLoadingId === transcript.id"/)
  assert.match(view,/@click="toggleExpand\(transcript.id, \$event\)"/)
  assert.match(view,/const detailed=await fetchTranscriptDetail\(transcript\)/)
  assert.match(view,/if\(detailed\)\{/)
  assert.match(view,/if\(previewLoadingId.value === id\)return/)
  assert.match(view,/function additionalWorkflowStatus\(transcript\)/)
  assert.match(view,/state.id==='needs-encounter' \? \{\.\.\.state,label:'Encounter needed'\}/)
  assert.match(view,/assignFromInbox\(transcript, \{ openSummary: true \}\)/)
})
