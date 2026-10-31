import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
const apiSource = await readFile(new URL('../api/ai/session-summary.js', import.meta.url), 'utf8')
const clientsSource = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')
const migration = await readFile(new URL('../supabase/migrations/20261029120000_add_client_summary_preference.sql', import.meta.url), 'utf8')
const ifsMigration = await readFile(new URL('../supabase/migrations/20261029114239_allow_ifs_summary_preference.sql', import.meta.url), 'utf8')

test('SessionWorkspace presents inline summary customization before first generation', () => {
  assert.match(source, /data-testid="session-summary-options"/)
  assert.match(source, /Prepare session summary/)
  assert.match(source, /Summary approach/)
  assert.match(source, /General/)
  assert.match(source, /Integrative/)
  assert.match(source, />CBT</)
  assert.match(source, /Internal Family Systems \(IFS\)/)
  assert.match(source, /Transactional Analysis/)
  assert.match(source, /Evidence/)
  assert.match(source, /This session/)
  assert.match(source, /Recent sessions/)
  assert.match(source, /Add emphasis or instruction/)
  assert.match(source, /Generate summary/i)
  assert.match(source, /v-if="transcript"/i)
})

test('SessionWorkspace offers Regenerate only for non-finalised summary content', () => {
  const button = source.match(/<button\b[^>]*>\s*Regenerate\s*<\/button>/i)?.[0]
  assert.ok(button, 'Regenerate button must exist')
  const condition = button.match(/v-if="([^"]+)"/)?.[1]
  assert.ok(condition, 'Regenerate must have a visibility condition')
  const isVisible = new Function('summaryDocument', `return Boolean(${condition})`)

  assert.equal(isVisible({ content: { body: 'Existing summary' }, status: 'draft' }), true)
  assert.equal(isVisible({ content: { body: 'Finalised summary' }, status: 'completed' }), false)
  assert.equal(isVisible({ content: { body: '' }, status: 'draft' }), false)
  assert.equal(isVisible(null), false)

  const guard = source.match(/async function generateSummary\(\)\s*\{\s*if\s*\(([^\n]+)\)\s*return;/)?.[1]
  assert.ok(guard, 'Generation must retain its early-return guard')
  const blocksGeneration = new Function('session', 'isGenerating', 'summaryDocument', `return Boolean(${guard})`)
  assert.equal(blocksGeneration({ value: { id: 'session-1' } }, { value: false }, { value: { status: 'completed' } }), true)
})

test('SessionWorkspace sends the chosen approach, evidence scope and therapist guidance to AI', () => {
  assert.match(source, /lens:\s*summaryLens\.value/)
  assert.match(source, /window:\s*summaryWindow\.value/)
  assert.match(source, /therapistGuidance:\s*therapistGuidance\.value/)
  assert.match(source, /summaryGeneration:\s*generation/)
  assert.match(source, /showSummaryOptions\.value = false/)
})

test('Session summary approach is remembered per client', () => {
  assert.match(source, /updateClientSummaryPreference/)
  assert.match(source, /clientData\.preferred_summary_lens/)
  assert.match(clientsSource, /preferred_summary_lens/)
  assert.match(clientsSource, /updateClientSummaryPreference/)
  assert.match(migration, /preferred_summary_lens text not null default 'integrative'/)
  assert.match(migration, /transactional_analysis/)
  assert.match(ifsMigration, /internal_family_systems/)
})

test('SessionWorkspace handles generation state', () => {
  assert.match(source, /Preparing session summary…/i)
  assert.match(source, /This may take a few minutes\. Please keep this page open\./i)
  assert.match(source, /isGenerating/i)
})

test('Session summary section includes selected-generation provenance', () => {
  assert.match(source, /generatedSummaryLabel/)
  assert.match(source, /Generated from transcript/)
  assert.match(source, /summaryApproachLabel/)
  assert.match(source, /summaryWindowLabel/)
})

test('Direct session summary keeps full fidelity for the current encounter and compacts earlier continuity evidence', () => {
  assert.match(apiSource, /PREVIOUS_TRANSCRIPT_EXCERPT_CHARS\s*=\s*12000/)
  assert.match(apiSource, /isCurrent:\s*index\s*===\s*0/)
  assert.match(apiSource, /!zoomSummary\s*\?\s*boundedTranscriptExcerpt\(transcript\)\s*:\s*''/)
  assert.match(apiSource, /original_transcript_excerpt/)
  assert.match(apiSource, /EVERY section value must be a JSON string/)
  assert.match(apiSource, /normalizeClientSessionSummaryResponse/)
  assert.match(apiSource, /session-summary-direct-v4/)
})

test('SessionWorkspace keeps the previous summary visible when regeneration fails', () => {
  assert.match(source, /generationError\s*&&\s*!summaryDocument/)
  assert.match(source, /Generation failed — previous summary unchanged\./)
  assert.match(source, /<template v-else-if="summaryDocument">/)
  assert.match(source, /<SessionSummaryDocument/)
})

test('Session summary API supports current or recent transcript-backed evidence', () => {
  assert.match(apiSource, /SUMMARY_WINDOWS = new Set\(\['current', 'recent'\]\)/)
  assert.match(apiSource, /CLIENT_SESSION_SUMMARY_LENSES\.includes\(lens\)/)
  assert.match(apiSource, /clientSessionSummaryLensRule\(lens\)/)
  assert.match(apiSource, /window === 'recent'/)
  assert.match(apiSource, /sources\.length >= \(window === 'recent' \? 3 : 1\)/)
  assert.match(apiSource, /therapist_guidance/)
  assert.match(apiSource, /promptVersion: PROMPT_VERSION/)
})

test('SessionWorkspace calls generateSessionSummary helper', () => {
  assert.match(source, /import \{[^}]*generateSessionSummary[^}]*\} from ['"]\.\.\/lib\/clientDocuments\.js['"]/)
  assert.match(source, /generateSessionSummary\(\{/i)
})
