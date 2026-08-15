import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeOutcomeMeasureHistory } from '../src/lib/clientMeasures.js'

test('groups outcome measure results by resource and orders newest first', () => {
  const assignments = [
    {
      id: 'assignment-old',
      resource_versions: { resource_id: 'phq9', client_title: 'PHQ-9', resource_library_items: { id: 'phq9', title: 'PHQ-9', resource_kind: 'outcome_measure' } },
      outcome_measure_results: { id: 'result-old', scores: { total: 14 }, calculation_version: 'phq-9-v1', completed_at: '2026-07-20T10:00:00Z' }
    },
    {
      id: 'assignment-new',
      resource_versions: { resource_id: 'phq9', client_title: 'PHQ-9', resource_library_items: { id: 'phq9', title: 'PHQ-9', resource_kind: 'outcome_measure' } },
      outcome_measure_results: { id: 'result-new', scores: { total: 8 }, calculation_version: 'phq-9-v1', completed_at: '2026-08-12T10:00:00Z' }
    }
  ]

  const history = normalizeOutcomeMeasureHistory(assignments)
  assert.equal(history.length, 1)
  assert.equal(history[0].title, 'PHQ-9')
  assert.deepEqual(history[0].results.map(result => result.scores.total), [8, 14])
})

test('ignores non-measure assignments and incomplete measure results', () => {
  const assignments = [
    {
      id: 'worksheet',
      resource_versions: { resource_id: 'worksheet', resource_library_items: { resource_kind: 'worksheet' } },
      outcome_measure_results: null
    },
    {
      id: 'unfinished-measure',
      resource_versions: { resource_id: 'phq9', resource_library_items: { resource_kind: 'outcome_measure' } },
      outcome_measure_results: null
    }
  ]

  assert.deepEqual(normalizeOutcomeMeasureHistory(assignments), [])
})
