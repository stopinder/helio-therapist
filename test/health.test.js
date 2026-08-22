import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const health = await readFile(new URL('../api/health.js', import.meta.url), 'utf8')
const workflow = await readFile(new URL('../.github/workflows/production-health.yml', import.meta.url), 'utf8')

test('health endpoint exposes only a minimal dependency status contract', () => {
  assert.match(health, /status: 'ok'/)
  assert.match(health, /status: 'degraded'/)
  assert.match(health, /Cache-Control', 'no-store'/)
  assert.match(health, /from\('profiles'\).*head: true/)
  assert.doesNotMatch(health, /process\.env\.[A-Z0-9_]+.*json/)
  assert.doesNotMatch(health, /user_id|client_id|session_id|email/)
})

test('health endpoint is bounded and logs dependency failures server-side', () => {
  assert.match(health, /HEALTH_TIMEOUT_MS = 4_000/)
  assert.match(health, /\[Health\] dependency check failed/)
  assert.match(health, /return res\.status\(503\)/)
})

test('scheduled production health workflow checks the canonical production domain', () => {
  assert.match(workflow, /schedule:/)
  assert.match(workflow, /cron: '17 \* \* \* \*'/)
  assert.match(workflow, /https:\/\/helio\.works\/api\/health/)
  assert.match(workflow, /--retry 2/)
  assert.match(workflow, /workflow_dispatch:/)
})
