import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptIntegrationToken } from '../api/_lib/token-crypto.js';
import { refreshZoomAccessToken, getZoomAccessTokenContext } from '../api/_lib/zoom-oauth.js';

// Setup environment for testing
process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.from('12345678901234567890123456789012').toString('base64');
process.env.ZOOM_CLIENT_ID = 'test-client-id';
process.env.ZOOM_CLIENT_SECRET = 'test-client-secret';

test('refreshZoomAccessToken failure includes sanitized diagnostic info', async () => {
  const mockSupabase = {};
  const integration = {
    user_id: 'user-1',
    encrypted_refresh_token: encryptIntegrationToken('refresh-123')
  };

  // Mock global fetch
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url === 'https://zoom.us/oauth/token') {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Refresh token is expired',
          code: 3003,
          message: 'Invalid refresh token',
          secret: 'should-be-removed'
        })
      };
    }
    return { ok: false, status: 404 };
  };

  try {
    await refreshZoomAccessToken(mockSupabase, integration);
    assert.fail('Should have thrown');
  } catch (error) {
    assert.equal(error.status, 409);
    assert.match(error.message, /Zoom connection requires reconnection/);
    assert.match(error.message, /invalid_grant/);
    assert.match(error.message, /Refresh token is expired/);
    assert.ok(!error.message.includes('should-be-removed'));
  } finally {
    global.fetch = originalFetch;
  }
});

test('getZoomAccessTokenContext correctly identifies fresh tokens', async () => {
  const now = Date.now();
  const integration = {
    user_id: 'user-1',
    encrypted_access_token: encryptIntegrationToken('access-123'),
    encrypted_refresh_token: encryptIntegrationToken('refresh-123'),
    expires_at: new Date(now + 30 * 60 * 1000).toISOString() // 30 mins away
  };

  const context = await getZoomAccessTokenContext({}, integration);
  assert.equal(context.accessToken, 'access-123');
  assert.equal(context.refreshed, false);

  // Mock global fetch for refresh
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      access_token: 'new-access-123',
      expires_in: 3600
    })
  });
  const mockSupabase = {
    from: () => ({
      update: () => ({
        eq: () => ({
          eq: () => ({ error: null })
        })
      })
    })
  };

  try {
    const contextForced = await getZoomAccessTokenContext(mockSupabase, integration, { forceRefresh: true });
    assert.equal(contextForced.accessToken, 'new-access-123');
    assert.equal(contextForced.refreshed, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('zoomJson avoids double-refresh on fresh token 401', async () => {
  const { zoomJson } = await import('../api/_lib/zoom-my-notes-reconciliation.js');
  
  let refreshCount = 0;
  const getToken = async ({ forceRefresh }) => {
    if (forceRefresh) refreshCount++;
    return {
      accessToken: 'fresh-token',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      refreshed: forceRefresh
    };
  };

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    text: async () => 'Unauthorized',
    json: async () => ({ error: 'unauthorized' })
  });

  try {
    await zoomJson(getToken, 'https://api.zoom.us/v2/test');
    assert.fail('Should have thrown');
  } catch (error) {
    assert.equal(error.status, 401);
    assert.equal(refreshCount, 0, 'Should NOT have tried to refresh a fresh token');
  } finally {
    global.fetch = originalFetch;
  }
});
