import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../supabase/migrations/20260818190000_protect_completed_session_deletion.sql', import.meta.url);

test('completed clinical sessions are protected from deletion at database level', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /create or replace function public\.prevent_completed_session_deletion\(\)/i);
  assert.match(sql, /if old\.status = 'completed' then/i);
  assert.match(sql, /Approved clinical records cannot be deleted/i);
  assert.match(sql, /before delete on public\.sessions/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /set search_path = ''/i);
});

test('delete protection targets completed records rather than blocking all session deletion', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.doesNotMatch(sql, /raise exception[\s\S]*?end if;[\s\S]*?raise exception/i);
  assert.match(sql, /return old;/i);
});
