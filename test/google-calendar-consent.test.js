import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasGoogleCalendarReadScope, hasGoogleCalendarWriteScope } from '../api/_lib/google-scopes.js';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('Google scope helper accepts Calendar grants and rejects identity-only consent',()=>{
  assert.equal(hasGoogleCalendarReadScope('openid https://www.googleapis.com/auth/userinfo.email'),false);
  assert.equal(hasGoogleCalendarReadScope('https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email'),true);
  assert.equal(hasGoogleCalendarReadScope('https://www.googleapis.com/auth/calendar'),true);
  assert.equal(hasGoogleCalendarWriteScope('https://www.googleapis.com/auth/calendar.readonly'),false);
  assert.equal(hasGoogleCalendarWriteScope('https://www.googleapis.com/auth/calendar.events'),true);
  assert.equal(hasGoogleCalendarWriteScope('https://www.googleapis.com/auth/calendar'),true);
});

test('OAuth callback does not report success when Calendar permission is absent',async()=>{
  const callback=await read('../api/google/callback.js');
  assert.match(callback,/hasGoogleCalendarReadScope\(tokens\.scope\)/);
  assert.match(callback,/Google\+Calendar\+permission\+was\+not\+granted/);
  assert.match(callback,/google=success/);
});

test('Google status exposes read, write and scheduling readiness',async()=>{
  const status=await read('../api/google/status.js');
  assert.match(status,/calendar_permission: canRead/);
  assert.match(status,/calendar_write_permission: canWrite/);
  assert.match(status,/ready_for_scheduling: Boolean\(integration\.access_token && canRead && canWrite\)/);
  assert.match(status,/GOOGLE_CALENDAR_SCOPE_MISSING/);
  assert.match(status,/GOOGLE_CALENDAR_WRITE_SCOPE_MISSING/);
  assert.match(status,/GOOGLE_REVOKED/);
});

test('Google status reads the canonical integrations provider email column',async()=>{
  const status=await read('../api/google/status.js');
  assert.match(status,/\.select\('provider_email,last_synced_at,expires_at,refresh_token,access_token,scope'\)/);
  assert.match(status,/email: integration\.provider_email/);
  assert.doesNotMatch(status,/\.select\('email,/);
});
