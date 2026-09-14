import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mock } from 'node:test';

// Stub environment
const CLIENT_ID = randomUUID();
const USER_ID = randomUUID();

// Mock dependencies (we will use these in tests)
const mockSupabase = (overrides = {}) => {
  const supabase = {
    from: mock.fn((table) => {
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: mock.fn(() => Promise.resolve(overrides.client || { data: { id: CLIENT_ID }, error: null }))
              })
            })
          })
        };
      }
      if (table === 'session_capture_drafts') {
        return {
          select: mock.fn((columns) => {
            // Regression check: verify 'id' is NOT selected
            if (columns.includes('id') && !columns.includes('sessions!inner(id')) {
              throw new Error('REGRESSION: Querying non-existent column session_capture_drafts.id');
            }
            return {
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    not: () => ({
                      order: () => ({
                        limit: mock.fn(() => Promise.resolve(overrides.captures || { data: [], error: null }))
                      })
                    })
                  })
                })
              })
            };
          })
        };
      }
      return {
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }) })
      };
    })
  };
  return supabase;
};

test('Regression: api/ai/client-session-summary.js does not select session_capture_drafts.id', async () => {
  const fs = await import('node:fs/promises');
  const content = await fs.readFile(new URL('../api/ai/client-session-summary.js', import.meta.url), 'utf8');
  
  // The query should NOT contain "id," or ",id" or "id)" in the select call for session_capture_drafts
  const captureQueryMatch = content.match(/\.from\(['"]session_capture_drafts['"]\)\.select\(['"]([^'"]+)['"]\)/);
  assert.ok(captureQueryMatch, 'Should find session_capture_drafts select call');
  
  const selectedColumns = captureQueryMatch[1];
  const columns = selectedColumns.split(',').map(c => c.trim());
  assert.ok(!columns.includes('id'), 'Should not select top-level id from session_capture_drafts');
  assert.ok(columns.includes('session_id'), 'Should select session_id');
  assert.ok(columns.includes('sessions!inner(id'), 'Should still select nested sessions id');

  // Check mapping
  assert.ok(!content.includes('id:row.id'), 'Should not map row.id to id in selectedCaptures');
  assert.ok(content.includes('sessionId:row.session_id'), 'Should map row.session_id to sessionId');
});

test('Client Session Summary Logic: Preview Mode', async () => {
  const { selectClinicalIntelligenceSources } = await import('../api/_lib/ai-client-session-summary.js');
  
  const captures = [
    { session_id: 's1', content: {}, reviewed_at: '2026-09-01T10:00:00Z', sessions: { id: 's1', occurred_at: '2026-09-01T09:00:00Z' } },
    { session_id: 's2', content: {}, reviewed_at: '2026-08-01T10:00:00Z', sessions: { id: 's2', occurred_at: '2026-08-01T09:00:00Z' } }
  ];
  
  const previewData = selectClinicalIntelligenceSources(captures, { limit: 100 }).map(row => ({
    sessionId: row.session_id,
    occurredAt: row.sessions?.occurred_at,
    reviewedAt: row.reviewed_at
  }));
  
  assert.equal(previewData.length, 2);
  assert.equal(previewData[0].sessionId, 's1');
  assert.ok(previewData[0].occurredAt);
});

test('Client Session Summary Logic: NO_REVIEWED_SESSION_CAPTURE (409)', async () => {
  const { selectClinicalIntelligenceSources } = await import('../api/_lib/ai-client-session-summary.js');
  const captures = [];
  const selectedRows = selectClinicalIntelligenceSources(captures, { limit: 1 });
  assert.equal(selectedRows.length, 0, 'Should return empty array when no captures available');
});

test('Client Session Summary Logic: Source ID contract', async () => {
  const { buildClinicalIntelligenceEvidenceMap } = await import('../api/_lib/ai-client-session-summary.js');
  const selectedCaptures = [
    { sessionId: 's1', occurredAt: '2026-09-01T09:00:00Z', reviewedAt: '2026-09-01T10:00:00Z', content: {} }
  ];
  
  const evidenceMap = buildClinicalIntelligenceEvidenceMap({ captures: selectedCaptures, careItems: [], therapistGuidance: '' });
  assert.ok(evidenceMap.reviewedSessions.some(s => s.id === 'session:s1'), 'Source ID should be session:<sessionId>');
});
