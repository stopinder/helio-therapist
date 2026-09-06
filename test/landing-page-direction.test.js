import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Landing Page Direction', () => {
  const landingPath = path.join(process.cwd(), 'src', 'views', 'Landing.vue');
  const landingSource = fs.readFileSync(landingPath, 'utf8');

  test('Practice flow section matches tightened copy', () => {
    assert.match(landingSource, /Continuity across the therapist’s day\./);
    assert.match(landingSource, /Helios keeps the client relationship in view before, after and across sessions\./);
  });

  test('Hero section matches therapist-first direction', () => {
    assert.match(landingSource, /See your clients\. Helios remembers what matters\./);
    assert.match(landingSource, /A calm workspace for sessions, continuity and clinical understanding/);
  });

  test('Representative navigation reflects current product structure', () => {
    // Current navigation should be Today, Clients, Calendar, Reflect
    assert.match(landingSource, /Today/);
    assert.match(landingSource, /Clients/);
    assert.match(landingSource, /Calendar/);
    assert.match(landingSource, /Reflect/);

    // Old navigation should NOT be present in representative sidebar
    // We search within the representative sidebar area specifically if possible, 
    // but a global check for these as navigation items is a good start.
    // The instruction says "representative primary navigation does NOT contain permanent Transcripts or Documents destinations"
    
    // To be more specific, we check for them NOT being in the sidebar nav list
    const navMatch = landingSource.match(/aria-label="Representative workspace navigation"[\s\S]*?<\/nav>/);
    if (navMatch) {
      const navContent = navMatch[0];
      assert.strictEqual(navContent.includes('Transcripts'), false, 'Should not contain Transcripts in representative navigation');
      assert.strictEqual(navContent.includes('Documents'), false, 'Should not contain Documents in representative navigation');
      assert.strictEqual(navContent.includes('Sessions'), false, 'Should not contain Sessions in representative navigation');
    }
  });

  test('Client-centred sections are present', () => {
    assert.match(landingSource, /The client stays at the centre/);
    assert.match(landingSource, /Overview/);
    assert.match(landingSource, /Sessions/);
    assert.match(landingSource, /Insights/);
    assert.match(landingSource, /Files/);
  });

  test('Session Summary is emphasized', () => {
    assert.match(landingSource, /From a session to something genuinely useful/);
    assert.match(landingSource, /client-facing Session Summary/);
    assert.match(landingSource, /A clear summary of what you explored together, ready for your therapist to review and edit/);
  });

  test('Therapist reflection (Reflect) is present instead of CPD', () => {
    assert.match(landingSource, /Your own work deserves continuity too/);
    assert.match(landingSource, /private therapist reflection/i);
    // CPD should not be a primary nav label
    const headerNavMatch = landingSource.match(/aria-label="Landing page sections"[\s\S]*?<\/nav>/);
    if (headerNavMatch) {
        assert.strictEqual(headerNavMatch[0].includes('CPD'), false, 'Header nav should use Reflect or similar instead of CPD');
    }
  });

  test('Trust and Control section matches new direction', () => {
    assert.match(landingSource, /Clinical judgement stays with you/);
    assert.match(landingSource, /Client-facing summaries stay editable until you decide they are ready/);
    assert.match(landingSource, /Your professional reflection stays separate from client-facing material/);
  });

  test('Legal and account routes remain present', () => {
    assert.match(landingSource, /to="\/sign-in"/);
    assert.match(landingSource, /to="\/get-started"/);
    assert.match(landingSource, /to="\/privacy"/);
    assert.match(landingSource, /to="\/terms"/);
    assert.match(landingSource, /to="\/ai-data"/);
    assert.match(landingSource, /to="\/support"/);
  });
});
