import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// We will use a regex-based verification approach as seen in other Helios tests.
// This is because proxyquire is not available and we want to verify the logic.

const handlerPath = path.resolve('api/ai/session-summary.js');
const handlerSource = fs.readFileSync(handlerPath, 'utf8');

describe('Session Summary API Timeout Verification (Static Analysis)', () => {
  test('passes explicit timeout of 60000 to runTextAI', () => {
    // Look for runTextAI call and verify timeout property
    // Pattern matches runTextAI({ ... timeout: 60000 ... })
    const runTextAICall = /runTextAI\(\{[\s\S]*?timeout:\s*60000[\s\S]*?\}\)/;
    assert.ok(runTextAICall.test(handlerSource), 'Should contain runTextAI call with timeout: 60000');
  });

  test('maps timeout/provider errors to 504 status', () => {
    // Look for catch block that handles timeout status
    // We expect something like if (error.status === 408 || error.code === 'ETIMEDOUT') return res.status(504)...
    // Or just a general catch that maps timeout to 504.
    // The requirement says: return HTTP 504 rather than a generic 500
    
    const status504Check = /res\.status\(504\)/;
    assert.ok(status504Check.test(handlerSource), 'Should return 504 status in error handler');
    
    const safeMessageCheck = /Session summary generation is temporarily unavailable\./;
    assert.ok(safeMessageCheck.test(handlerSource), 'Should return user-safe message');
  });
});
