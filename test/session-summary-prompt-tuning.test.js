import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('session summary prompt tuning rules', async (t) => {
  const filePath = path.join(process.cwd(), 'api', 'ai', 'session-summary.js');
  const content = fs.readFileSync(filePath, 'utf8');

  await t.test('includes tentative inference guidance', (t) => {
    assert.ok(content.includes('Use tentative language for inferred psychological meaning'), 'Missing tentative language instruction');
    assert.ok(content.includes('“may help explain…”'), 'Missing example: may help explain');
    assert.ok(content.includes('“we wondered whether…”'), 'Missing example: we wondered whether');
  });

  await t.test('includes repetition avoidance guidance', (t) => {
    assert.ok(content.includes('Avoid repetition across sections'), 'Missing repetition avoidance instruction');
    // Normalize spaces and newlines for matching
    const normalized = content.replace(/\s+/g, ' ');
    assert.ok(normalized.includes('no more than two sections'), 'Missing core formulation limit');
  });

  await t.test('includes section uniqueness guidance', (t) => {
    assert.ok(content.includes('Each section should add something new'), 'Missing section uniqueness instruction');
    assert.ok(content.includes('opening = current context'), 'Missing opening focus');
    assert.ok(content.includes('whatWeWorkedOn = main material'), 'Missing whatWeWorkedOn focus');
    assert.ok(content.includes('perspectiveReflection = synthesis/clinical meaning'), 'Missing perspectiveReflection focus');
  });

  await t.test('preserves core grounding and evidenceStrength rules', (t) => {
    assert.ok(content.includes('Allowed evidenceStrength values'), 'Missing evidenceStrength rules');
    assert.ok(content.includes('current_observation'), 'Missing current_observation');
    assert.ok(content.includes('DO NOT use "recurring"'), 'Missing recurring restriction');
    assert.ok(content.includes('sourceIds must contain only'), 'Missing source ID grounding rule');
    assert.ok(content.includes('verbatim within its section'), 'Missing verbatim claim rule');
  });
});
