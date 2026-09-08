import test from 'node:test';
import assert from 'node:assert';
import { validateClientSessionSummaryResponse } from '../api/_lib/ai-client-session-summary.js';

test('validateClientSessionSummaryResponse with diagnostic logging', async (t) => {
  const validSourceIds = new Set(['transcript-123']);
  
  await t.test('fails when evidenceStrength is recurring but only one source is present', () => {
    const data = {
      sections: {
        opening: 'Test opening',
        whatWeWorkedOn: 'Test work',
        patternsOverTime: 'Test patterns',
        changesAndExceptions: 'Test changes',
        strengthsAndResources: 'Test strengths',
        perspectiveReflection: 'Test perspective',
        betweenSession: 'Test between',
        closing: 'Test closing'
      },
      claims: [
        {
          section: 'patternsOverTime',
          text: 'Test patterns',
          sourceIds: ['transcript-123'],
          evidenceStrength: 'recurring'
        }
      ]
    };
    
    // The validator expects sourceIds to start with 'session:' to count towards recurring
    // In our session-summary.js, we passed transcript.id as sourceId.
    // Let's check how validateClientSessionSummaryResponse handles non-'session:' IDs for recurring.
    // Line 132: if(claim.evidenceStrength==='recurring'&&sourceIds.filter(id=>id.startsWith('session:')).length<2)return null;

    const result = validateClientSessionSummaryResponse(JSON.stringify(data), validSourceIds);
    assert.strictEqual(result, null, 'Should fail because recurring needs 2+ session: sources');
  });

  await t.test('fails when claim text is missing from section', () => {
    const data = {
      sections: {
        opening: 'Test opening',
        whatWeWorkedOn: 'Test work',
        patternsOverTime: '',
        changesAndExceptions: '',
        strengthsAndResources: '',
        perspectiveReflection: '',
        betweenSession: '',
        closing: ''
      },
      claims: [
        {
          section: 'opening',
          text: 'NOT PRESENT',
          sourceIds: ['transcript-123'],
          evidenceStrength: 'current_observation'
        }
      ]
    };
    const result = validateClientSessionSummaryResponse(JSON.stringify(data), validSourceIds);
    assert.strictEqual(result, null, 'Should fail because claim text is not in section');
  });

  await t.test('fails when a non-empty section has no claims', () => {
    const data = {
      sections: {
        opening: 'Test opening',
        whatWeWorkedOn: '',
        patternsOverTime: '',
        changesAndExceptions: '',
        strengthsAndResources: '',
        perspectiveReflection: '',
        betweenSession: '',
        closing: ''
      },
      claims: [] // empty claims
    };
    const result = validateClientSessionSummaryResponse(JSON.stringify(data), validSourceIds);
    assert.strictEqual(result, null, 'Should fail because non-empty opening has no claims');
  });
});
