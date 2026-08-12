import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Calendar filtering logic audit', async (t) => {
  const source = await readFile(new URL('../src/composables/useCalendar.js', import.meta.url), 'utf8')

  await t.test('Filters out auto-created workspace sessions based on explicit completed state', () => {
    assert.match(source, /\.filter\(session => session\.startedAt && session\.workflowStatus === 'completed' && session\.completedAt\)/)
    assert.ok(!source.includes('Math.abs(start.getTime() - created.getTime()) < 10000'), 'Should not contain old timestamp heuristic')
  })
})
