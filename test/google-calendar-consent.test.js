import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasGoogleCalendarReadScope, hasGoogleCalendarWriteScope } from '../api/_lib/google-scopes.js';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('Google scope helper accepts least-privilege Calendar grants and rejects identity-only consent',()=>{
  assert.equal(hasGoogleCalendarReadScope('openid https://www.googleapis.com/auth/userinfo.email'),false);
  assert.equal(hasGoogleCalendarReadScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email'),true);
  assert.equal(hasGoogleCalendarReadScope('https://www.googleapis.com/auth/calendar.events'),true);
  assert.equal(hasGoogleCalendarReadScope('https://www.googleapis.com/auth/calendar'),true);
  assert.equal(hasGoogleCalendarWriteScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly'),false);
  assert.equal(hasGoogleCalendarWriteScope('https://www.googleapis.com/auth/calendar.events'),true);
  assert.equal(hasGoogleCalendarWriteScope('https://www.googleapis.com/auth/calendar'),true);
});

test('Google authorization requests the least-privilege Calendar scopes',async()=>{
  const authorize=await read('../api/google/authorize.js');
  assert.match(authorize,/https:\/\/www\.googleapis\.com\/auth\/calendar\.calendarlist\.readonly/);
  assert.match(authorize,/https:\/\/www\.googleapis\.com\/auth\/calendar\.events/);
  assert.doesNotMatch(authorize,/https:\/\/www\.googleapis\.com\/auth\/calendar\.readonly/);
});

test('OAuth callback does not report success when Calendar permission is absent',async()=>{
  const callback=await read('../api/google/callback.js');
  assert.match(callback,/hasGoogleCalendarReadScope\(tokens\.scope\)/);
  assert.match(callback,/Google\+Calendar\+permission\+was\+not\+granted/);
  assert.match(callback,/google=success/);
});

test('Google OAuth callback stores encrypted credentials and clears plaintext columns',async()=>{
  const callback=await read('../api/google/callback.js');
  assert.match(callback,/encryptIntegrationToken\(tokens\.access_token\)/);
  assert.match(callback,/encrypted_refresh_token:encryptedRefreshToken/);
  assert.match(callback,/access_token:null/);
  assert.match(callback,/refresh_token:null/);
});

test('Google status exposes read, write and scheduling readiness',async()=>{
  const status=await read('../api/google/status.js');
  assert.match(status,/calendar_permission: canRead/);
  assert.match(status,/calendar_write_permission: canWrite/);
  assert.match(status,/ready_for_scheduling: Boolean\(hasAccessToken && canRead && canWrite\)/);
  assert.match(status,/GOOGLE_CALENDAR_SCOPE_MISSING/);
  assert.match(status,/GOOGLE_CALENDAR_WRITE_SCOPE_MISSING/);
  assert.match(status,/GOOGLE_REVOKED/);
});

test('Google status reads encrypted credentials while retaining legacy detection',async()=>{
  const status=await read('../api/google/status.js');
  assert.match(status,/\.select\('provider_email,last_synced_at,expires_at,encrypted_refresh_token,encrypted_access_token,refresh_token,access_token,scope'\)/);
  assert.match(status,/Boolean\(integration\.encrypted_access_token \|\| integration\.access_token\)/);
  assert.match(status,/Boolean\(integration\.encrypted_refresh_token \|\| integration\.refresh_token\)/);
  assert.match(status,/email: integration\.provider_email/);
  assert.doesNotMatch(status,/\.select\('email,/);
});
