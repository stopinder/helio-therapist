import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Landing Page Direction', () => {
  const landingPath = path.join(process.cwd(), 'src', 'views', 'Landing.vue');
  const landingSource = fs.readFileSync(landingPath, 'utf8');

  test('keeps the existing Helios opening splash', () => {
    assert.match(landingSource, /A place for your whole practice\./);
    assert.match(landingSource, /Sessions, clients, calendar, documents and reflection, together in one workspace\./);
  });

  test('uses the approved clinical workspace direction', () => {
    assert.match(landingSource, /The whole thread of the work, <em>in one place\.<\/em>/);
    assert.match(landingSource, /Keep each client’s story connected/);
    assert.match(landingSource, /client-workspace-section\.png/);
  });

  test('includes the practice documents section', () => {
    assert.match(landingSource, /PRACTICE DOCUMENTS/);
    assert.match(landingSource, /Create, organise and share <em>with ease\.<\/em>/);
    assert.match(landingSource, /A home for your templates, client resources and everyday documents\./);
  });

  test('shows how transcript text enters Helios without importing audio or video', () => {
    assert.match(landingSource, /TRANSCRIPT INBOX/);
    assert.match(landingSource, /Bring transcripts in <em>from wherever you work\.<\/em>/);
    assert.match(landingSource, /No audio or video is imported\./);
    assert.match(landingSource, /From Zoom/);
    assert.match(landingSource, /Paste from anywhere/);
    assert.match(landingSource, /Upload a file/);
    assert.match(landingSource, /transcript-inbox-section\.webp/);
  });

  test('feature grid matches the approved product set', () => {
    for (const label of ['Calendar', 'Session capture', 'Client records', 'Documents', 'CPD & reflection', 'Integrations']) {
      assert.ok(landingSource.includes(label), `Missing feature: ${label}`);
    }
    assert.match(landingSource, /Google Calendar sync/);
    assert.match(landingSource, /Zoom, Google and more/);
  });

  test('integrations distinguish current and future availability', () => {
    assert.match(landingSource, /Join Zoom meetings from Helios, sync your Google Calendar/);
    assert.match(landingSource, /Outlook integration is coming soon\./);
    assert.match(landingSource, /<h3>Outlook<\/h3><p>Coming soon<\/p>/);
  });

  test('header and footer retain account, legal and support routes', () => {
    for (const route of ['sign-in', 'get-started', 'privacy', 'ai-data', 'terms', 'cookies', 'support']) {
      assert.ok(landingSource.includes(`to="/${route}"`), `Landing must retain /${route}`);
    }
  });

  test('does not reintroduce the retired long-form landing sections', () => {
    assert.doesNotMatch(landingSource, /id="sessions"|id="continuity"|id="reflect"|id="trust"|id="pricing"/);
    assert.doesNotMatch(landingSource, /Sarah M\.|Daniel Reed/);
  });
});
