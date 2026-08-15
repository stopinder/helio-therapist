import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeClientResources } from '../src/lib/clientResources.js'

test('groups assignments into Active and Completed', () => {
  const assignments = [
    {
      id: 'a1',
      status: 'sent',
      sent_at: '2026-08-10T10:00:00Z',
      resource_versions: { client_title: 'Worksheet A', resource_library_items: { resource_kind: 'worksheet' } }
    },
    {
      id: 'a2',
      status: 'reviewed',
      sent_at: '2026-08-01T10:00:00Z',
      reviewed_at: '2026-08-05T10:00:00Z',
      resource_versions: { client_title: 'Worksheet B', resource_library_items: { resource_kind: 'worksheet' } }
    },
    {
      id: 'a3',
      status: 'awaiting_review',
      sent_at: '2026-08-12T10:00:00Z',
      resource_versions: { client_title: 'Worksheet C', resource_library_items: { resource_kind: 'worksheet' } }
    }
  ]

  const { active, completed } = normalizeClientResources(assignments)
  assert.equal(active.length, 2)
  assert.equal(completed.length, 1)
  
  // Active ordering: newest sent first
  assert.equal(active[0].id, 'a3')
  assert.equal(active[1].id, 'a1')
  
  assert.equal(completed[0].id, 'a2')
})

test('orders completed items by reviewed_at then completed_at', () => {
  const assignments = [
    {
      id: 'c1',
      status: 'completed',
      sent_at: '2026-08-01T10:00:00Z',
      completed_at: '2026-08-02T10:00:00Z',
      resource_versions: { client_title: 'Resource 1', resource_library_items: { resource_kind: 'document' } }
    },
    {
      id: 'c2',
      status: 'reviewed',
      sent_at: '2026-08-01T10:00:00Z',
      completed_at: '2026-08-02T10:00:00Z',
      reviewed_at: '2026-08-04T10:00:00Z',
      resource_versions: { client_title: 'Resource 2', resource_library_items: { resource_kind: 'document' } }
    }
  ]

  const { completed } = normalizeClientResources(assignments)
  assert.equal(completed[0].id, 'c2')
  assert.equal(completed[1].id, 'c1')
})

test('handles relationship shapes safely (arrays or objects)', () => {
  const assignments = [
    {
      id: 'a1',
      status: 'sent',
      sent_at: '2026-08-10T10:00:00Z',
      resource_versions: [{ client_title: 'Array Version', resource_library_items: [{ resource_kind: 'worksheet' }] }]
    }
  ]

  const { active } = normalizeClientResources(assignments)
  assert.equal(active[0].title, 'Array Version')
  assert.equal(active[0].kind, 'worksheet')
})

test('outcome measures in resources show title and kind but not scores', () => {
  const assignments = [
    {
      id: 'm1',
      status: 'sent',
      sent_at: '2026-08-10T10:00:00Z',
      resource_versions: { client_title: 'PHQ-9', resource_library_items: { resource_kind: 'outcome_measure' } },
      outcome_measure_results: { total: 15 }
    }
  ]

  const { active } = normalizeClientResources(assignments)
  assert.equal(active[0].title, 'PHQ-9')
  assert.equal(active[0].kind, 'outcome_measure')
  assert.strictEqual(active[0].scores, undefined)
})
