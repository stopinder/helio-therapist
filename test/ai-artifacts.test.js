import test from 'node:test';
import assert from 'node:assert/strict';
import { AI_MODEL_POLICY_VERSION, hashArtifactSource } from '../api/_lib/ai-artifacts.js';

test('artifact source hash is deterministic and content-sensitive', () => {
  const source = 'A private reflection used for supervision.';
  assert.equal(hashArtifactSource(source), hashArtifactSource(source));
  assert.notEqual(hashArtifactSource(source), hashArtifactSource(`${source} changed`));
  assert.match(hashArtifactSource(source), /^[0-9a-f]{64}$/);
});

test('model policy version is explicit and stable', () => {
  assert.equal(AI_MODEL_POLICY_VERSION, 'text-model-policy-v1');
});
