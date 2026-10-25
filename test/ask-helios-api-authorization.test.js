import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiFiles = ['api/ai/research.js', 'api/ai/conversations.js'];

for (const filename of apiFiles) {
  test(`Ask Helios API enforces RLS-scoped data access: ${filename}`, async () => {
    const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8');
    assert.match(source, /getSupabaseUserClient\(req\)/, 'Database operations must use the caller JWT and RLS');
    assert.doesNotMatch(source, /const \{\s*user\s*,\s*supabase\s*\}\s*=\s*await requireAuthenticatedUser\(req\)/,
      'Do not use a service-role client for research conversation operations');
  });
}
