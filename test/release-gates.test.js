import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const quality = readFileSync(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8')

test('Quality uses committed dependencies and keeps release checks blocking', () => {
  assert.doesNotMatch(quality, /npm install --package-lock-only/)
  assert.match(quality, /run: npm ci --ignore-scripts --no-fund/)
  const requiredSteps = [
    ['Audit runtime dependencies', 'npm audit --omit=dev --audit-level=high'],
    ['Run Node tests', 'npm test'],
    ['Run Vue component tests', 'npm run test:components'],
    ['Build production bundle', 'npm run build'],
    ['Run Zoom My Notes Playwright acceptance', 'npx playwright test e2e/zoom-my-notes.spec.js --project=chromium'],
    ['Run clinical and transcript Playwright acceptance', 'npx playwright test']
  ]
  for (const [name, command] of requiredSteps) {
    const start = quality.indexOf('      - name: ' + name)
    assert.notEqual(start, -1, 'Missing required step: ' + name)
    const next = quality.indexOf('      - name:', start + 1)
    const step = quality.slice(start, next < 0 ? undefined : next)
    assert.ok(step.includes(command), name + ' must execute ' + command)
    assert.doesNotMatch(step, /continue-on-error:\s*true/, name + ' must fail the job')
  }
  assert.doesNotMatch(quality, /e2e\/session-working-material\.spec\.js/)
  assert.equal((quality.match(/continue-on-error:\s*true/g) || []).length, 1, 'Only the development advisory report may be non-blocking')
})
