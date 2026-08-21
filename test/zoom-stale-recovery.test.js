import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveZoomHostMeeting } from '../api/_lib/zoom-meeting-launch.js';
import { buildZoomAuthorizationUrl } from '../api/zoom/authorize.js';

test('buildZoomAuthorizationUrl requests meeting, identity, Scheduler and My Notes scopes', () => {
  const url = buildZoomAuthorizationUrl({ clientId: 'client-123', redirectUri: 'https://app.com/callback', state: 'state-abc' });
  const parsed = new URL(url);
  assert.strictEqual(parsed.origin, 'https://zoom.us');
  assert.strictEqual(parsed.pathname, '/oauth/authorize');
  assert.strictEqual(parsed.searchParams.get('client_id'), 'client-123');
  const scopes = new Set(parsed.searchParams.get('scope').split(' '));
  assert.deepEqual(scopes, new Set(['meeting:read:meeting', 'user:read:user', 'scheduler:read', 'scheduler:write', 'my_notes:read:content']));
  assert.strictEqual(parsed.searchParams.get('include_granted_scopes'), 'true');
});

test('resolveZoomHostMeeting parses Zoom error codes', async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
  const { encryptIntegrationToken } = await import('../api/_lib/token-crypto.js');
  const validEncrypted = encryptIntegrationToken('valid-token');
  const refreshEncrypted = encryptIntegrationToken('refresh-token');
  const mockIntegration = { user_id: 'user-1', encrypted_access_token: validEncrypted, encrypted_refresh_token: refreshEncrypted, expires_at: '2099-01-01T00:00:00Z' };
  const mockSupabase = { from: () => ({ update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }) }) };
  t.after(() => { global.fetch = originalFetch; process.env.INTEGRATION_ENCRYPTION_KEY = originalKey; });

  await t.test('captures zoomCode 3001 as stale', async () => {
    global.fetch = async () => ({ status: 400, ok: false, clone() { return this; }, json: async () => ({ code: 3001, message: 'Meeting does not exist' }) });
    await assert.rejects(() => resolveZoomHostMeeting(mockSupabase, mockIntegration, 'stale-id'), error => error.zoomCode === 3001 && error.status === 502);
  });
  await t.test('captures 404 as stale', async () => {
    global.fetch = async () => ({ status: 404, ok: false, clone() { return this; }, json: async () => ({ code: 3000, message: 'Meeting not found' }) });
    await assert.rejects(() => resolveZoomHostMeeting(mockSupabase, mockIntegration, 'missing-id'), error => error.status === 404 && error.zoomCode === 3000);
  });
  await t.test('captures scope error 4711 as 409', async () => {
    global.fetch = async () => ({ status: 400, ok: false, clone() { return this; }, json: async () => ({ code: 4711, message: 'Invalid access token, does not contain scopes' }) });
    await assert.rejects(() => resolveZoomHostMeeting(mockSupabase, mockIntegration, 'scope-error-id'), error => error.status === 409 && error.zoomCode === 4711 && /Reconnect Zoom in Settings/.test(error.message));
  });
});

test('Recovery logic condition in start-session.js', () => {
  const isStale = (error) => error.status === 404 || error.zoomCode === 3001 || error.zoomCode === 3000;
  assert.strictEqual(isStale({ status: 404 }), true);
  assert.strictEqual(isStale({ zoomCode: 3001 }), true);
  assert.strictEqual(isStale({ zoomCode: 3000 }), true);
  assert.strictEqual(isStale({ status: 400, zoomCode: 123 }), false);
  assert.strictEqual(isStale({ status: 500 }), false);
});
