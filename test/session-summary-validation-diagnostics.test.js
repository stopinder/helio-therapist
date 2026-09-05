import test from 'node:test';
import assert from 'node:assert';
import { validateClientSessionSummaryResponse } from '../api/_lib/ai-client-session-summary.js';

test('validateClientSessionSummaryResponse diagnostics and constraints', async (t) => {
  const validSourceIds = new Set(['transcript-123']);
  
  const baseSections = {
    opening: 'This was a good session.',
    whatWeWorkedOn: '',
    patternsOverTime: '',
    changesAndExceptions: '',
    strengthsAndResources: '',
    perspectiveReflection: '',
    betweenSession: '',
    closing: ''
  };

  await t.test('rejects recurring evidence strength for single source', (t) => {
    const data = {
      sections: { ...baseSections },
      claims: [{
        section: 'opening',
        text: 'This was a good session.',
        sourceIds: ['transcript-123'],
        evidenceStrength: 'recurring'
      }]
    };
    
    let warningCalled = false;
    const originalWarn = console.warn;
    console.warn = (msg) => {
      if (msg.includes('invalid_evidence_strength (recurring requires 2 sessions)')) warningCalled = true;
    };

    const result = validateClientSessionSummaryResponse(JSON.stringify(data), validSourceIds);
    console.warn = originalWarn;

    assert.strictEqual(result, null);
    assert.strictEqual(warningCalled, true, 'Should log invalid_evidence_strength');
  });

  await t.test('rejects claim text not in section', (t) => {
    const data = {
      sections: { ...baseSections },
      claims: [{
        section: 'opening',
        text: 'Not in section',
        sourceIds: ['transcript-123'],
        evidenceStrength: 'current_observation'
      }]
    };

    let warningCalled = false;
    const originalWarn = console.warn;
    console.warn = (msg) => {
      if (msg.includes('claim_not_present_in_section')) warningCalled = true;
    };

    const result = validateClientSessionSummaryResponse(JSON.stringify(data), validSourceIds);
    console.warn = originalWarn;

    assert.strictEqual(result, null);
    assert.strictEqual(warningCalled, true);
  });

  await t.test('rejects missing claim for non-empty section', (t) => {
    const data = {
      sections: { ...baseSections },
      claims: []
    };

    let warningCalled = false;
    const originalWarn = console.warn;
    console.warn = (msg) => {
      if (msg.includes('missing_claim_for_nonempty_section (opening)')) warningCalled = true;
    };

    const result = validateClientSessionSummaryResponse(JSON.stringify(data), validSourceIds);
    console.warn = originalWarn;

    assert.strictEqual(result, null);
    assert.strictEqual(warningCalled, true);
  });

  await t.test('rejects invalid source ID', (t) => {
    const data = {
      sections: { ...baseSections },
      claims: [{
        section: 'opening',
        text: 'This was a good session.',
        sourceIds: ['invalid-id'],
        evidenceStrength: 'current_observation'
      }]
    };

    let warningCalled = false;
    const originalWarn = console.warn;
    console.warn = (msg) => {
      if (msg.includes('invalid_source_id')) warningCalled = true;
    };

    const result = validateClientSessionSummaryResponse(JSON.stringify(data), validSourceIds);
    console.warn = originalWarn;

    assert.strictEqual(result, null);
    assert.strictEqual(warningCalled, true);
  });

  await t.test('accepts valid single-session response', (t) => {
    const data = {
      sections: { ...baseSections },
      claims: [{
        section: 'opening',
        text: 'This was a good session.',
        sourceIds: ['transcript-123'],
        evidenceStrength: 'current_observation'
      }]
    };

    const result = validateClientSessionSummaryResponse(JSON.stringify(data), validSourceIds);
    assert.ok(result);
    assert.strictEqual(result.sections.opening, 'This was a good session.');
  });
});
