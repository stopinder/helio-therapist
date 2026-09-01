import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { normalizeCaptureContent } from '../src/lib/sessionCaptures.js'

const migration = readFileSync(new URL('../supabase/migrations/20260831151726_add_session_capture_drafts.sql', import.meta.url), 'utf8')
const ownershipFix = readFileSync(new URL('../supabase/migrations/20260831155000_fix_session_capture_transcript_ownership.sql', import.meta.url), 'utf8')
const privateHelper = readFileSync(new URL('../supabase/migrations/20260831155800_move_capture_ownership_helper_private.sql', import.meta.url), 'utf8')
const service = readFileSync(new URL('../src/lib/sessionCaptures.js', import.meta.url), 'utf8')

test('Session Capture persists separately with ownership and review boundaries', () => {
  assert.match(migration, /create table public\.session_capture_drafts/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/)
  assert.match(migration, /session\.status <> 'completed'/)
  assert.match(migration, /status in \('working', 'reviewed'\)/)
  assert.match(migration, /previous_versions jsonb/)
  assert.doesNotMatch(service, /sessions.*notes/)
  assert.match(ownershipFix, /security definer/)
  assert.match(ownershipFix, /set search_path = ''/)
  assert.match(ownershipFix, /therapist_user_id = \(select auth\.uid\(\)\)/)
  assert.match(ownershipFix, /revoke all .* from public, anon/)
  assert.match(ownershipFix, /grant execute .* to authenticated/)
  assert.match(privateHelper, /create schema if not exists private/)
  assert.match(privateHelper, /set schema private/)
  assert.match(privateHelper, /grant usage on schema private to authenticated/)
})

test('Session Capture normalization does not accept invented fields', () => {
  const capture = normalizeCaptureContent({ sessionThemes: 'Theme', diagnosis: 'No' })
  assert.equal(capture.sessionThemes, 'Theme')
  assert.equal(Object.hasOwn(capture, 'diagnosis'), false)
  assert.equal(Object.keys(capture).length, 7)
})
