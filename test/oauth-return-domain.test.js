import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('OAuth callbacks always return users to the Helios application', async () => {
  const [googleCallback, zoomCallback] = await Promise.all([
    read('../api/google/callback.js'),
    read('../api/zoom/callback.js')
  ]);

  for (const callback of [googleCallback, zoomCallback]) {
    assert.match(callback, /const appUrl = 'https:\/\/helio\.works'/);
    assert.doesNotMatch(callback, /therapyworks\.works/);
    assert.doesNotMatch(callback, /process\.env\.APP_URL/);
  }
});

test('deployment guidance uses the Helios production domain', async () => {
  const [authGuide, calendlyGuide] = await Promise.all([
    read('../docs/supabase-auth-rollout.md'),
    read('../docs/calendly-setup.md')
  ]);

  for (const guide of [authGuide, calendlyGuide]) {
    assert.match(guide, /https:\/\/helio\.works/);
    assert.doesNotMatch(guide, /therapyworks\.works/);
  }
});
