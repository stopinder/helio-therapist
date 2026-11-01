import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  SAMPLE_TRANSCRIPT_SOURCE,
  buildSampleAskHeliosClinical,
  buildSampleClientSummary,
  isSampleTranscriptRow,
  sampleCaptureDraftForTranscript
} from '../api/_lib/sample-practice.js'

const sampleApi = await readFile(new URL('../api/sample-workspace.js', import.meta.url), 'utf8')
const sampleClient = await readFile(new URL('../src/lib/sampleWorkspace.js', import.meta.url), 'utf8')
const clientsView = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
const clientWorkspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
const sessionsLibrary = await readFile(new URL('../src/lib/sessions.js', import.meta.url), 'utf8')
const visibleStoryMigration = await readFile(new URL('../supabase/migrations/20261101101500_backfill_visible_sample_clinical_story.sql', import.meta.url), 'utf8')
const transcriptInbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
const captureEndpoint = await readFile(new URL('../api/ai/transcript-clinical-summary.js', import.meta.url), 'utf8')
const summaryEndpoint = await readFile(new URL('../api/ai/client-session-summary.js', import.meta.url), 'utf8')
const assistEndpoint = await readFile(new URL('../api/ai/assist.js', import.meta.url), 'utf8')
const clinicalContext = await readFile(new URL('../api/_lib/ask-helios-clinical.js', import.meta.url), 'utf8')
const quotaMigration = await readFile(new URL('../supabase/migrations/20261101094100_sample_practice_quota_isolation.sql', import.meta.url), 'utf8')

test('sample helper requires internal verification before exposing zero-quota material', () => {
  const transcript = { source: SAMPLE_TRANSCRIPT_SOURCE, zoom_note_id: 'SAMPLE-NOTE-DANIEL-INBOX' }
  assert.equal(isSampleTranscriptRow(transcript), true)
  assert.equal(sampleCaptureDraftForTranscript(transcript), null)
  assert.ok(sampleCaptureDraftForTranscript(transcript, { sampleVerified: true }))
  assert.equal(buildSampleClientSummary({
    reference: 'SAMPLE-001',
    selectedCaptures: [{ sessionId: 'one' }, { sessionId: 'two' }]
  }), null)
  assert.equal(buildSampleAskHeliosClinical({
    reference: 'SAMPLE-001',
    context: { sourceCount: 2 }
  }), null)
})

test('Alex sample summary demonstrates evidence-based longitudinal recurrence', () => {
  const captures = [
    { sessionId: '11111111-1111-4111-8111-111111111111' },
    { sessionId: '22222222-2222-4222-8222-222222222222' },
    { sessionId: '33333333-3333-4333-8333-333333333333' }
  ]
  const result = buildSampleClientSummary({
    reference: 'SAMPLE-001',
    lens: 'gentle_cbt',
    selectedCaptures: captures,
    sampleVerified: true
  })
  assert.match(result.sections.patternsOverTime, /Across more than one session/)
  assert.match(result.sections.perspectiveReflection, /CBT/)
  const recurring = result.claims.find(item => item.section === 'patternsOverTime')
  assert.equal(recurring.evidenceStrength, 'recurring')
  assert.equal(recurring.sourceIds.length, 3)
})

test('sample Ask Helios keeps interpretation cautious and alternatives explicit', () => {
  const result = buildSampleAskHeliosClinical({
    reference: 'SAMPLE-001',
    query: 'What may be maintaining this?',
    lens: 'gentle_cbt',
    context: { sourceCount: 3 },
    sampleVerified: true
  })
  assert.match(result.recordedContext, /selected synthetic sessions/)
  assert.match(result.clinicalInterpretation, /plausible|CBT/i)
  assert.match(result.alternativePossibilities, /could also/)
  assert.ok(result.questionsForConsideration.length >= 3)
})

test('sample practice is created through an authenticated server boundary and is retry-safe', () => {
  assert.match(sampleClient, /authenticatedFetch\('\/api\/sample-workspace'/)
  assert.doesNotMatch(sampleClient, /rpc\('create_sample_workspace'/)
  assert.match(sampleApi, /requireAuthenticatedUser/)
  assert.match(sampleApi, /getSupabaseUserClient/)
  assert.match(sampleApi, /rpc\('is_sample_workspace'/)
  assert.match(sampleApi, /rpc\('mark_sample_workspace_clients'/)
  assert.match(sampleApi, /async function ensureTranscript/)
  assert.match(sampleApi, /if \(existing\) return existing/)
  assert.match(sampleApi, /error\?\.code === '23505'/)
  assert.match(sampleApi, /if \(!existingCapture\)/)
  assert.doesNotMatch(sampleApi, /\.upsert\(row/)
  assert.match(sampleApi, /SAMPLE-NOTE-DANIEL-001/)
  assert.match(sampleApi, /SAMPLE-NOTE-ALEX-INBOX-004/)
  assert.match(sampleApi, /SAMPLE-NOTE-ALEX-001/)
  assert.match(sampleApi, /SAMPLE-NOTE-ALEX-003/)
  assert.match(sampleApi, /rpc\('complete_session'/)
})

test('sample practice demonstrates the real transcript workflow with explicit synthetic UI', () => {
  assert.match(clientsView, /Explore a complete sample practice/)
  assert.match(clientsView, /imported transcripts/)
  assert.match(clientsView, /longitudinal summary/)
  assert.match(clientsView, /Synthetic AI demonstrations do not use your Free AI allowance/)
  assert.match(clientsView, /Open Transcript Inbox/)
  assert.match(transcriptInbox, /Sample practice/)
  assert.match(transcriptInbox, /Try assigning Alex Morgan — Sample/)
  assert.match(transcriptInbox, /class="sample-badge">Sample/)
})

test('sample Session Capture checks protected marker before bypassing runTextAI', () => {
  const marker = captureEndpoint.indexOf("rpc('is_sample_client'")
  const sample = captureEndpoint.indexOf('sampleCaptureDraftForTranscript')
  const ai = captureEndpoint.indexOf('runTextAI({')
  assert.ok(marker > -1 && sample > marker && ai > sample)
  assert.match(captureEndpoint, /sampleVerified: verifiedSampleClient === true/)
  assert.match(captureEndpoint, /aiAllowanceUsed: false/)
})

test('sample longitudinal summary checks protected marker before bypassing runTextAI', () => {
  const marker = summaryEndpoint.indexOf("rpc('is_sample_client'")
  const sample = summaryEndpoint.indexOf('buildSampleClientSummary')
  const ai = summaryEndpoint.lastIndexOf('runTextAI({')
  assert.ok(marker > -1 && sample > marker && ai > sample)
  assert.match(summaryEndpoint, /model:'deterministic-sample'/)
  assert.match(summaryEndpoint, /aiAllowanceUsed:false/)
})

test('Ask Helios sample clinical reasoning is server-verified and does not call the model', () => {
  assert.match(clinicalContext, /select\('id,display_name,reference,current_focus,preferred_summary_lens'\)/)
  const marker = assistEndpoint.indexOf("service.rpc('is_sample_client'")
  const sample = assistEndpoint.indexOf('buildSampleAskHeliosClinical', marker)
  const ai = assistEndpoint.indexOf('runTextAI({', sample)
  assert.ok(marker > -1 && sample > marker && ai > sample)
  assert.match(assistEndpoint, /sampleVerified: verifiedSampleClient === true/)
  assert.match(assistEndpoint, /aiAllowanceUsed:false/)
})

test('sample clients are internally marked and excluded from the real-client quota without trusting SAMPLE names', () => {
  assert.match(quotaMigration, /create table if not exists private\.sample_clients/)
  assert.match(quotaMigration, /revoke all on table private\.sample_clients from public, anon, authenticated/)
  assert.match(quotaMigration, /grant execute on function public\.mark_sample_workspace_clients\(uuid\)[\s\S]*to service_role/)
  assert.match(quotaMigration, /grant execute on function public\.is_sample_client\(uuid, uuid\)[\s\S]*to service_role/)
  assert.match(quotaMigration, /not exists \([\s\S]*from private\.sample_clients as sample[\s\S]*sample\.client_id = c\.id/)
  assert.match(quotaMigration, /Internally marked synthetic clients never consume the commercial quota/)
  assert.doesNotMatch(quotaMigration, /reference like 'SAMPLE-%'/i)
})


test('re-running Sample Practice seeding preserves therapist assignment and capture edits', () => {
  assert.match(sampleApi, /\.eq\('zoom_note_id', row\.zoom_note_id\)[\s\S]*\.maybeSingle\(\)/)
  assert.match(sampleApi, /if \(existing\) return existing/)
  assert.match(sampleApi, /\.from\('session_capture_drafts'\)[\s\S]*\.eq\('session_id', session\.id\)[\s\S]*\.maybeSingle\(\)/)
  assert.match(sampleApi, /if \(!existingCapture\)/)
})


test('Daniel is a complete worked sample rather than an assignment prerequisite', () => {
  assert.match(sampleApi, /ensureDanielWorkedExample/)
  assert.match(sampleApi, /SAMPLE-NOTE-DANIEL-001/)
  assert.match(sampleApi, /DANIEL_CARE_ITEMS/)
  assert.match(sampleApi, /Sample session summary — Daniel/)
  assert.match(sampleApi, /Sample care plan — Daniel/)
  assert.match(clientWorkspace, /Daniel: inspect one complete piece of clinical work/)
  assert.match(clientWorkspace, />Aims & objectives</)
  assert.match(clientWorkspace, />Care plan</)
  assert.match(clientWorkspace, />Session Capture</)
  assert.match(clientWorkspace, />Transcript</)
  assert.match(clientWorkspace, />Summary</)
})

test('client session list exposes linked transcript state so transcript actions can render', () => {
  assert.match(sessionsLibrary, /from\('zoom_transcripts'\)/)
  assert.match(sessionsLibrary, /select\('session_ref'\)/)
  assert.match(sessionsLibrary, /hasTranscript: transcriptSessionIds\.has/)
})

test('existing sample workspaces receive the visible clinical story without overwriting edits', () => {
  assert.match(visibleStoryMigration, /private\.sample_clients/)
  assert.match(visibleStoryMigration, /SAMPLE-NOTE-DANIEL-001/)
  assert.match(visibleStoryMigration, /Sample session summary — Daniel/)
  assert.match(visibleStoryMigration, /Sample care plan — Daniel/)
  assert.match(visibleStoryMigration, /SAMPLE-NOTE-ALEX-INBOX-004/)
  assert.match(visibleStoryMigration, /where not exists/gi)
  assert.doesNotMatch(visibleStoryMigration, /update public\.client_care_items/i)
  assert.doesNotMatch(visibleStoryMigration, /update public\.documents/i)
})
