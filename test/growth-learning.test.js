import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Development view uses evidence-led learning language', async () => {
  const content = await readFile(new URL('../src/views/supervision/SupervisionGrowth.vue', import.meta.url), 'utf8')
  assert.match(content, /Professional development/)
  assert.match(content, />Development</)
  assert.match(content, /Turn repeated observations into deliberate learning/)
  assert.match(content, /These are counts, not interpretations/)
  assert.match(content, /What keeps appearing in the work or in you\?/)
  assert.match(content, /What tends to activate it, and what might the response be trying to protect\?/)
  assert.match(content, /Test your understanding with another human/)
  assert.match(content, /Persistent goals will be introduced as a proper therapist-owned record/)
  assert.match(content, /CPD activity should follow a learning need/)
  assert.match(content, /Human supervision/)
  assert.match(content, /Focused reading/)
  assert.match(content, /Skills practice/)
  assert.match(content, /Further reflection/)
  assert.match(content, /to="\/supervision\/workspace"/)
  assert.match(content, /const topThemes = computed/)
  assert.match(content, /props\.themes/)
  assert.doesNotMatch(content, /const learningGoals\s*=\s*ref/)
  assert.doesNotMatch(content, /Learning goals are currently kept only for this visit/)
  assert.doesNotMatch(content, /Emerging Strengths/)
  assert.doesNotMatch(content, /you are demonstrating/i)
})
