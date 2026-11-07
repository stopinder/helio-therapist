import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { verifiedPrimaryConflict, hardBoundary, cautiousSources } from '../api/_lib/summary-draft-policy.js'
import { assertTherapistApprovedSummary } from '../api/_lib/source-review.js'
import { sourceBlock } from '../api/ai/session-summary.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const api=read('api/ai/session-summary.js'),view=read('src/views/SessionWorkspace.vue')
const panel=read('src/components/workspace/SourceReviewPanel.vue')
const migration=read('supabase/migrations/20261107155046_permit_review_of_zoom_note_only_sources.sql')
const original='Therapist: What would help? \nClient: I would like to learn more about my reactions.'
const current={id:'session:current',sessionId:'current',original_transcript:original,zoom_generated_summary:'Zoom note may be inaccurate'}
const past={id:'session:past',sessionId:'past',original_transcript:'Client: We discussed work.',zoom_generated_summary:'Zoom mistakenly says another client.'}
const noteOnly={id:'session:older',sessionId:'older',original_transcript:'',zoom_generated_summary:'Possibly someone else'}
const review=evidence=>({reason:'source_conflict',requiresManualVerification:false,evidence})
test('secondary-only Zoom-note concern is not itself evidence of mixed-client encounter',()=>{
 const soft=review([{sourceId:current.id,sourceType:'zoom_note',quote:'Zoom note may be inaccurate',verified:true}])
 assert.equal(verifiedPrimaryConflict(soft),false)
 assert.equal(hardBoundary(soft),false)
 assert.equal(hardBoundary(review([])),false)
 assert.equal(hardBoundary({reason:'insufficient_source',evidence:[]}),true)
})
test('a confirmed primary transcript conflict remains a hard stop',()=>{
 const real=review([{sourceId:current.id,sourceType:'transcript',quote:original,verified:true}])
 assert.equal(verifiedPrimaryConflict(real),true)
 assert.equal(hardBoundary(real),true)
 assert.deepEqual(cautiousSources([current,past],real),[])
})
test('cautious draft excludes the conflicting secondary note but preserves primary passages',()=>{
 const selected=cautiousSources([current,past,noteOnly],review([]))
 assert.deepEqual(selected.map(x=>x.id),[current.id,past.id])
 assert.equal(selected[0].original_transcript,original)
 assert.equal(selected[0].zoom_generated_summary,'')
 assert.equal(selected[1].zoom_generated_summary,'')
 assert.equal(current.zoom_generated_summary,'Zoom note may be inaccurate')
 const block=sourceBlock(past,{suppressZoomNote:true})
 assert.equal(block.zoom_note,'')
 assert.match(block.transcript,/discussed work/)
})
test('note-only current encounter with disputed client identity is not silently generated',()=>{
 assert.deepEqual(cautiousSources([noteOnly],{...review([{sourceId:noteOnly.id,sourceType:'zoom_note',verified:true}])}),[])
 assert.deepEqual(cautiousSources([noteOnly],{...review([]),requiresManualVerification:true}),[])
})
test('generation only flags verified primary source review, not a note-only inference',()=>{
 assert.match(api,/if\(verifiedPrimaryConflict\(structured\.review\)\)/)
 assert.match(api,/if\(structured\.outcome==='needs_review' && !hardBoundary\(structured\.review\)\)/)
 assert.match(api,/const remaining=cautiousSources/)
 assert.match(api,/for\(const source of selectedSources\)assertSourceAvailable/)
 assert.match(api,/source\.original_transcript\?\.trim\(\)\?'':\(source\.zoom_generated_summary\|\|''\)/)
 assert.match(api,/reviewCautions:/)
 assert.match(api,/excludedZoomNote:true/)
})
test('recent-source opt out excludes earlier notes, not current transcript, without deleting data',()=>{
 assert.match(api,/excludeEarlierZoomNotes = false/)
 assert.match(api,/typeof excludeEarlierZoomNotes !== 'boolean'/)
 assert.match(api,/excludeEarlierZoomNotes && !source\.original_transcript\?\.trim\(\)/)
 assert.match(view,/data-testid="exclude-earlier-zoom-notes"/)
 assert.match(view,/excludeEarlierZoomNotes:\s*excludeEarlierZoomNotes\.value/)
 assert.match(view,/data-testid="summary-zoom-preview"/)
 assert.match(view,/data-testid="soft-source-review"/)
 assert.match(view,/Confirm client \/ review Zoom note/)
})
test('therapist approval is required only for newly generated editable drafts',()=>{
 const doc={document_type:'session_summary',content:{summaryGeneration:{reviewRequired:true,reviewedAt:null}}}
 assert.throws(()=>assertTherapistApprovedSummary(doc),{code:'THERAPIST_REVIEW_REQUIRED'})
 doc.content.summaryGeneration.reviewedAt=new Date().toISOString()
 assert.doesNotThrow(()=>assertTherapistApprovedSummary(doc))
 doc.content.summaryGeneration={outcome:'ready'}
 assert.doesNotThrow(()=>assertTherapistApprovedSummary(doc))
 assert.doesNotThrow(()=>assertTherapistApprovedSummary({document_type:'clinical_record',content:{}}))
 assert.match(read('api/documents.js'),/assertTherapistApprovedSummary\(draft\);await assertDocumentSourcesUsable/)
 assert.match(view,/data-testid="summary-therapist-approval"/)
 assert.match(view,/async function approveSummaryDraft\(\)/)
 assert.match(view,/if\(!await verifySavedSummary\(\)\)/)
 assert.match(view,/summaryDocument\.value\.content\.summaryGeneration\.reviewedAt=null/)
 assert.match(view,/needsTherapistReview\.value\) return/)
})
test('note-first confirmation is explicit and retains audit, ownership and version safeguards',()=>{
 assert.match(panel,/data-testid="review-zoom-note"/)
 assert.match(panel,/data-testid="review-original-transcript"/)
 assert.match(panel,/confirmationHint/)
 assert.match(panel,/reviewed\.value&&context\.value\.trim\(\)\.length>=10/)
 assert.match(migration,/greatest\(length\(trim\(coalesce\(original\.original_transcript,''\)\)\),length\(trim\(coalesce\(original\.zoom_generated_summary,''\)\)\)\)<20/)
 assert.match(migration,/current_user not in \('postgres','service_role'\)/)
 assert.match(migration,/source_version<>p_expected_version/)
 assert.match(migration,/insert into public\.transcript_source_review_events/)
 assert.match(migration,/grant execute on function public\.resolve_transcript_source_review/)
})
