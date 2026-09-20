import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Landing Page Direction', () => {
  const landingPath = path.join(process.cwd(), 'src', 'views', 'Landing.vue');
  const landingSource = fs.readFileSync(landingPath, 'utf8');

  test('Practice flow section matches tightened copy', () => {
    assert.match(landingSource, /See how the work is developing over time\./);
    assert.match(landingSource, /Helios brings reviewed session material into a longitudinal view, with links back to the source — helping you revisit changes, open questions and the thread of the work without deciding what they mean for you\./);
  });

  test('Hero section matches therapist-first direction', () => {
    assert.match(landingSource, /Less to hold in your head\. More space for the work that matters\./);
    assert.match(landingSource, /Helios is a continuity and reflection system for therapists\./);
  });

  test('Representative navigation reflects current product structure', () => {
    // These destinations remain part of the approved representative navigation.
    assert.match(landingSource, /Today/);
    assert.match(landingSource, /Clients/);
    assert.match(landingSource, /Calendar/);
    assert.match(landingSource, /Reflect/);

    // The approved sidebar also includes Sessions, Transcripts and Documents.
    const navMatch = landingSource.match(/aria-label="Representative workspace navigation"[\s\S]*?<\/nav>/);
    if (navMatch) {
      const navContent = navMatch[0];
      assert.strictEqual(navContent.includes('Transcripts'), true, 'Should contain Transcripts in representative navigation');
      assert.strictEqual(navContent.includes('Documents'), true, 'Should contain Documents in representative navigation');
      assert.strictEqual(navContent.includes('Sessions'), true, 'Should contain Sessions in representative navigation');
    }
  });

  test('Client-centred sections are present', () => {
    assert.match(landingSource, /The whole thread of the work, in one place\./);
    assert.match(landingSource, /Current focus/);
    assert.match(landingSource, /Sessions/);
    assert.match(landingSource, /Follow-ups/);
    assert.match(landingSource, /Recent sessions/);
  });

  test('Session Summary is emphasized', () => {
    assert.match(landingSource, /The session doesn’t disappear when the call ends\./);
    assert.match(landingSource, /create an editable Session Summary/);
    assert.match(landingSource, /shape it in your own voice, and keep formal Clinical Records distinct from working notes\./);
  });

  test('Therapist reflection is present and CPD is not a primary navigation label', () => {
    assert.match(landingSource, /A private place to think across the work\./);
    assert.match(landingSource, /private professional reflection/i);
    // CPD should not be a primary nav label
    const headerNavMatch = landingSource.match(/aria-label="Landing page sections"[\s\S]*?<\/nav>/);
    if (headerNavMatch) {
        assert.strictEqual(headerNavMatch[0].includes('CPD'), false, 'Header nav should use Reflect or similar instead of CPD');
    }
  });

  test('Reflection section keeps authorship, privacy and supervision selection explicit', () => {
    const reflection = landingSource.match(/<section id="reflect"[\s\S]*?(?=<section id="trust")/)?.[0];
    assert.ok(reflection, 'Reflection section must be present');
    assert.match(reflection, /Therapist-authored mapping/);
    assert.match(reflection, /Private reflection — not part of the Clinical Record\./);
    assert.match(reflection, /Bring selected reflections into supervision preparation\./);
    assert.match(reflection, /Client names excluded by default; case aliases used\./);
    assert.doesNotMatch(reflection, /continuity engine|pattern detected|Helios identified|possible transference|recurring relational pattern|Supervision &amp; CPD/i);
  });

  test('Trust and Control section matches new direction', () => {
    assert.match(landingSource, /AI assists\. You remain the clinician\./);
    assert.match(landingSource, /Session Summaries stay editable/);
    assert.match(landingSource, /Private professional reflection is kept apart from client-facing and formal record material\./);
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
