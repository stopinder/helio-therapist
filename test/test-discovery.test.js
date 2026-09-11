import test from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('test discovery regression', async (t) => {
  const tempDir = join(tmpdir(), `helio-test-discovery-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    // 1. Root-level test discovery
    writeFileSync(join(tempDir, 'root.test.js'), "import test from 'node:test'; test('root pass', () => {});");

    // 2. Nested test discovery
    const nestedDir = join(tempDir, 'nested');
    mkdirSync(nestedDir);
    writeFileSync(join(nestedDir, 'nested.test.js'), "import test from 'node:test'; test('nested pass', () => {});");

    // 3. Failing fixture to verify exit status
    const failingDir = join(tempDir, 'failing');
    mkdirSync(failingDir);
    writeFileSync(join(failingDir, 'fail.test.js'), "import test from 'node:test'; test('fail', () => { throw new Error('intentional'); });");

    // Execute node --test with quoted glob
    // Note: On Windows, we need to be careful with how we pass the glob.
    // The issue description suggests "node --test \"test/**/*.test.js\"".
    // Since we are in a temp dir, we will run it there.
    
    const result = spawnSync('node', ['--test', '"**/*.test.js"'], {
      cwd: tempDir,
      shell: true,
      encoding: 'utf8',
      env: { ...process.env, NODE_TEST_CONTEXT: undefined }
    });

    // Check discovery evidence in stdout/stderr
    assert.ok(result.stdout.includes('root pass'), 'Should discover root-level test');
    assert.ok(result.stdout.includes('nested pass'), 'Should discover nested test');
    assert.ok(result.stdout.includes('fail'), 'Should discover failing test');

    // Verify nonzero exit status for failing fixture
    assert.notStrictEqual(result.status, 0, 'Should have nonzero exit status when a test fails');
    
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error(`Failed to cleanup temp dir: ${tempDir}`, e);
    }
  }
});
