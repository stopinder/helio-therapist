import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('forwards the calendar settings action from Today to the application settings view', async () => {
  const [todayView, app] = await Promise.all([
    readFile(new URL('../src/components/NeedsAttention.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  ])

  assert.match(todayView, /@open-settings="\$emit\('open-settings'\)"/)
  assert.match(todayView, /defineEmits\(\['open-settings', 'open-transcript', 'open-session', 'select-appointment'\]\)/)
  assert.match(app, /<NeedsAttention[\s\S]*?@open-settings="selectedNav = 'Settings'"/)
})
