import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const clinicalEventTypes = [
  'session_completed',
  'outcome_measure_recorded',
  'risk_assessment_recorded',
  'diagnosis_updated',
  'treatment_plan_updated',
  'goal_updated',
  'referral_recorded',
  'medication_changed',
  'client_life_event',
  'clinical_milestone'
]

test('client timeline API keeps the full clinical allowlist and therapist/client ownership filters', async () => {
  const source = await readFile(new URL('../api/client-timeline.js', import.meta.url), 'utf8')

  for (const eventType of clinicalEventTypes) {
    assert.match(source, new RegExp(`['\"]${eventType}['\"]`), `missing ${eventType} from clinical timeline allowlist`)
  }

  assert.match(source, /requireAuthenticatedUser\(req\)/)
  assert.match(source, /\.eq\('user_id', user\.id\)\.eq\('client_id', clientId\)/)
  assert.match(source, /\.in\('event_type', clinicalEventTypes\)/)
  assert.doesNotMatch(source, /resource_sent|resource_completed|resource_reviewed/)
})

test('every clinical timeline event type has an explicit presentation', async () => {
  const source = await readFile(new URL('../src/lib/clinicalExchange.js', import.meta.url), 'utf8')

  for (const eventType of clinicalEventTypes) {
    assert.match(source, new RegExp(`${eventType}:\\s*\\{`), `missing presentation for ${eventType}`)
  }
})

test('timeline navigation is intentionally limited to session events', async () => {
  const source = await readFile(new URL('../src/components/workspace/TimelineItem.vue', import.meta.url), 'utf8')

  assert.match(source, /props\.subjectType === 'session' \|\| props\.eventType === 'session_completed'/)
  assert.match(source, /const sId = props\.subjectId \|\| props\.sessionId/)
  assert.match(source, /router\.push\(`\/clients\/\$\{cId\}\/sessions\/\$\{sId\}`\)/)

  for (const eventType of clinicalEventTypes.filter(type => type !== 'session_completed')) {
    assert.doesNotMatch(source, new RegExp(`eventType === ['\"]${eventType}['\"]`), `${eventType} should remain display-only until it has a canonical destination`)
  }
})

test('client timeline RLS remains therapist-owned and client-bound', async () => {
  const migrationsDir = new URL('../supabase/migrations/', import.meta.url)
  const files = (await readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort()
  const migrations = (await Promise.all(files.map(name => readFile(new URL(name, migrationsDir), 'utf8')))).join('\n')

  assert.match(migrations, /alter table public\.client_timeline_events enable row level security/i)
  assert.match(migrations, /Users manage own client_timeline_events/)
  assert.match(migrations, /auth\.uid\(\)\s*=\s*user_id|\(select auth\.uid\(\) as uid\)\s*=\s*user_id/i)
  assert.match(migrations, /client\.id\s*=\s*client_timeline_events\.client_id/i)
  assert.match(migrations, /client\.user_id\s*=\s*\(?\s*(?:select\s+)?auth\.uid\(\)/i)
})
