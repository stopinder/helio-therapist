import test from 'node:test';
import assert from 'node:assert/strict';
import { isZoomTokenExpiring } from '../api/_lib/zoom-oauth.js';

test('isZoomTokenExpiring logic', () => {
  const now = Date.now();
  // 10 minutes from now -> not expiring (skew is 5 mins)
  assert.equal(isZoomTokenExpiring(new Date(now + 10 * 60 * 1000).toISOString(), now), false);
  // 4 minutes from now -> expiring
  assert.equal(isZoomTokenExpiring(new Date(now + 4 * 60 * 1000).toISOString(), now), true);
  // null -> expiring (force refresh)
  assert.equal(isZoomTokenExpiring(null, now), true);
});
