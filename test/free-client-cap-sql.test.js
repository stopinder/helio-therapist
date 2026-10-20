import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/migrations/20261020143022_enforce_free_active_client_limit.sql', import.meta.url), 'utf8');

test('Free client quota is enforced by a database trigger', () => {
  assert.match(sql, /before insert or update of archived, user_id on public\.clients/i);
  assert.match(sql, /security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
});
test('archived clients are excluded; Free allows at most five active clients', () => {
  assert.match(sql, /c\.archived = false/i);
  assert.match(sql, /active_client_count >= 5/i);
  assert.match(sql, /c\.id <> old\.id/i);
});
test('paid and grandfathered customers retain access', () => {
  assert.match(sql, /2026-09-25T00:00:00Z/);
  assert.match(sql, /sub\.status in \('active', 'trialing'\)/);
});
