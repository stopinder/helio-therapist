import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadZoomTranscript, downloadZoomTranscriptWithRetry } from '../api/_lib/zoom-download.js';

function response(status, body = '', headers = {}) {
  return new Response(body, { status, headers });
}

test('downloads a transcript with an OAuth bearer token', async () => {
  let receivedAuthorization;
  const result = await downloadZoomTranscript('https://api.zoom.us/recording/download', 'token-1', async (_url, options) => {
    receivedAuthorization = options.headers.Authorization;
    return response(200, 'WEBVTT');
  });
  assert.equal(receivedAuthorization, 'Bearer token-1');
  assert.equal(await result.text(), 'WEBVTT');
});

test('follows a signed non-Zoom redirect without leaking the bearer token', async () => {
  const requests = [];
  const result = await downloadZoomTranscript('https://api.zoom.us/recording/download', 'token-1', async (url, options) => {
    requests.push({ url, authorization: options.headers.Authorization || null });
    if (requests.length === 1) return response(302, '', { location: 'https://cdn.example.test/signed-file' });
    return response(200, 'WEBVTT');
  });
  assert.equal(await result.text(), 'WEBVTT');
  assert.deepEqual(requests.map((request) => request.authorization), ['Bearer token-1', null]);
});

test('uses a pre-expiry refreshed token before downloading', async () => {
  const calls = [];
  const result = await downloadZoomTranscriptWithRetry('https://api.zoom.us/download', async (options) => {
    calls.push(options);
    return { accessToken: 'fresh-token', refreshed: true };
  }, async (_url, options) => response(options.headers.Authorization === 'Bearer fresh-token' ? 200 : 401, 'WEBVTT'));
  assert.equal(result.retried, false);
  assert.equal(result.refreshState, 'pre-expiry');
  assert.deepEqual(calls, [{ forceRefresh: false }]);
});

test('retries exactly once with a refreshed token after a 401', async () => {
  const tokenCalls = [];
  const headers = [];
  const result = await downloadZoomTranscriptWithRetry('https://api.zoom.us/download', async (options) => {
    tokenCalls.push(options);
    return { accessToken: options.forceRefresh ? 'new-token' : 'old-token', refreshed: options.forceRefresh };
  }, async (_url, options) => {
    headers.push(options.headers.Authorization);
    return response(options.headers.Authorization === 'Bearer new-token' ? 200 : 401, 'WEBVTT');
  });
  assert.equal(result.retried, true);
  assert.deepEqual(tokenCalls, [{ forceRefresh: false }, { forceRefresh: true }]);
  assert.deepEqual(headers, ['Bearer old-token', 'Bearer new-token']);
});

test('leaves a persistent 401 for the caller to record as a failure', async () => {
  const result = await downloadZoomTranscriptWithRetry('https://api.zoom.us/download', async () => ({ accessToken: 'token', refreshed: false }), async () => response(401));
  assert.equal(result.response.status, 401);
  assert.equal(result.retried, true);
});
