import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('session summary prompt tuning rules', async (t) => {
  const filePath = path.join(process.cwd(), 'api', 'ai', 'session-summary.js');
  const content = fs.readFileSync(filePath, 'utf8');

  await t.test('includes tentative inference guidance', () => {
    assert.ok(content.includes('Preserve uncertainty. Use tentative language for inferred psychological meaning'), 'Missing tentative language instruction');
    assert.ok(content.includes('do not force model terminology'), 'Missing model restraint');
  });

  await t.test('includes repetition avoidance guidance', () => {
    assert.ok(content.includes('Each section must add distinct value and avoid repetition'), 'Missing repetition avoidance instruction');
  });

  await t.test('keeps section roles and longitudinal boundaries explicit', () => {
    assert.ok(content.includes('patternsOverTime is only for genuinely supported recurrence'), 'Missing patternsOverTime boundary');
    assert.ok(content.includes('betweenSession contains only agreed intentions'), 'Missing between-session boundary');
    assert.ok(content.includes('A recurring pattern requires substantially similar evidence in at least two supplied session sources'), 'Missing recurrence threshold');
    assert.ok(content.includes('Change requires explicit comparative evidence; silence is not improvement'), 'Missing change threshold');
  });

  await t.test('preserves grounding and evidenceStrength rules for both evidence scopes', () => {
    assert.ok(content.includes('Allowed evidenceStrength values'), 'Missing evidenceStrength rules');
    assert.ok(content.includes('current_observation'), 'Missing current_observation');
    assert.ok(content.includes('therapist_guidance'), 'Missing therapist_guidance');
    assert.ok(content.includes('Every claim must cite only supplied IDs'), 'Missing source ID grounding rule');
    assert.ok(content.includes('each claim text must appear verbatim in its section'), 'Missing verbatim claim rule');
    assert.ok(content.includes("window === 'recent'"), 'Missing recent-session branch');
    assert.ok(content.includes('Treat this as a single-session summary'), 'Missing single-session branch');
  });
});
