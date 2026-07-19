import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadZoomTranscript } from '../api/_lib/zoom-download.js';

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
