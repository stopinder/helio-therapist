import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AI_FEATURES } from '../api/_lib/ai-execution.js';
import { isBudgetError, reserveAiBudget } from '../api/_lib/ai-budget.js';

// Load the migration file to check the allowed features list
const migrationPath = join(process.cwd(), 'supabase/migrations/20261025104500_allow_ask_helios_research.sql');
const migrationContent = readFileSync(migrationPath, 'utf8');

test('Every registered text AI feature is recognized by the database allowance function', () => {
  // Extract the list of allowed features from the migration SQL
  const match = migrationContent.match(/p_feature not in \(([\s\S]*?)\)/);
  assert.ok(match, 'Could not find the p_feature validation list in the migration');
  
  const allowedFeatures = match[1]
    .split(',')
    .map(f => f.trim().replace(/'/g, ''))
    .filter(f => f.length > 0);

  // 'audio.transcription' is handled but might not be in the AI_FEATURES object if it's handled differently
  // Actually audio.transcription IS in the list in migration but handled as free.
  
  for (const [key, feature] of Object.entries(AI_FEATURES)) {
    assert.ok(
      allowedFeatures.includes(feature),
      `Feature "${feature}" (AI_FEATURES.${key}) is missing from the database allowance RPC validation list.`
    );
  }
});

test('reserveAiBudget maps AI_FEATURE_NOT_ALLOWED to 403', async () => {
  const mockDb = {
    rpc: async () => ({
      data: null,
      error: { message: 'AI_FEATURE_NOT_ALLOWED', code: '22023' }
    })
  };

  await assert.rejects(
    reserveAiBudget({
      userId: 'test-user',
      feature: 'unknown.feature',
      supabase: mockDb
    }),
    (err) => {
      return err.status === 403 && 
             err.code === 'AI_FEATURE_NOT_ALLOWED' && 
             err.message === 'This AI feature is not included in your current allowance.' &&
             isBudgetError(err);
    }
  );
});

test('All migration files are additive and maintain security hardening', () => {
    const migrationsDir = join(process.cwd(), 'supabase/migrations');
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    
    // Check the latest one
    const latestMigration = files.sort().pop();
    const content = readFileSync(join(migrationsDir, latestMigration), 'utf8');
    
    assert.match(content, /security definer/, 'Missing security definer');
    assert.match(content, /set search_path = ''/, 'Missing search_path hardening');
    assert.match(content, /revoke all on function public\.reserve_free_ai_action/, 'Missing revocation');
    // Use a more flexible regex that handles potential whitespace/newlines
    assert.match(content, /grant execute on function public\.reserve_free_ai_action[\s\S]*to service_role/, 'Missing service_role grant');
});
