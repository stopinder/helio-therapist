import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Follow-ups service uses correct Supabase table and RLS constraints', async () => {
  const service = await readFile(new URL('../src/lib/clientFollowUps.js', import.meta.url), 'utf8')
  
  // Table name
  assert.ok(service.includes(".from('client_follow_ups')"))
  
  // RLS related filter
  assert.ok(service.includes(".eq('client_id', clientId)"))
  
  // Required methods
  assert.ok(service.includes("export async function listClientFollowUps"))
  assert.ok(service.includes("export async function createClientFollowUp"))
  assert.ok(service.includes("export async function setClientFollowUpCompleted"))
  assert.ok(service.includes("export async function transcribeAudio"))
  
  // Auth check
  assert.ok(service.includes(".auth.getUser()"))
  assert.ok(/if\s*\(!auth\?\.user\)/.test(service))
})

test('Follow-ups UI components follow requirements', async () => {
  const modal = await readFile(new URL('../src/components/workspace/QuickCaptureModal.vue', import.meta.url), 'utf8')
  const panel = await readFile(new URL('../src/components/workspace/ClientFollowUps.vue', import.meta.url), 'utf8')
  
  // Modal requirements
  assert.ok(modal.includes("Quick capture"))
  assert.ok(modal.includes("A private working reminder for this client. It is not part of the clinical record."))
  assert.ok(modal.includes("<textarea"))
  assert.ok(modal.includes("toggleRecording")) // Microphone action
  assert.ok(modal.includes("Save"))
  assert.ok(modal.includes("Cancel"))
  
  // Transcription reuse
  assert.ok(/import\s+\{.*transcribeAudio.*\}\s+from\s+'\.\.\/\.\.\/lib\/clientFollowUps\.js'/.test(modal))
  
  // Panel requirements
  assert.ok(panel.includes("No follow-ups recorded."))
  assert.match(panel, /<input\s+type="checkbox"/) // Completion checkbox
  assert.ok(panel.includes("Quick capture")) // Action to open modal
})

test('Follow-ups migration follows schema requirements', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260814073500_add_client_follow_ups.sql', import.meta.url), 'utf8')
  
  assert.match(migration, /create table if not exists public\.client_follow_ups/)
  assert.match(migration, /therapist_id uuid not null references auth\.users\(id\)/)
  assert.match(migration, /client_id uuid not null references public\.clients\(id\)/)
  assert.match(migration, /body text not null/)
  assert.match(migration, /completed_at timestamptz/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /create index if not exists client_follow_ups_client_id_completed_at_idx/)
  
  // Ownership policy requirements
  assert.match(migration, /user_id = auth\.uid\(\)/)
  assert.doesNotMatch(migration, /and therapist_id = auth\.uid\(\)/)
})
