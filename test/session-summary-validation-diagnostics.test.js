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

  await t.test('repairs recurring evidence strength to current observation for one session source', (t) => {
    const data = {
      sections: { ...baseSections },
      claims: [{
        section: 'opening',
        text: 'This was a good session.',
        sourceIds: ['session:11111111-1111-4111-8111-111111111111'],
        evidenceStrength: 'recurring'
      }]
    };
    
    const sourceIds = new Set(['session:11111111-1111-4111-8111-111111111111']);
    let warningCalled = false;
    const originalWarn = console.warn;
    console.warn = (msg) => {
      if (msg.includes('evidence strength repaired: recurring -> current_observation')) warningCalled = true;
    };

    const result = validateClientSessionSummaryResponse(JSON.stringify(data), sourceIds);
    console.warn = originalWarn;

    assert.ok(result);
    assert.strictEqual(result.claims[0].evidenceStrength, 'current_observation');
    assert.strictEqual(warningCalled, true, 'Should log the safe evidence-strength repair');
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
