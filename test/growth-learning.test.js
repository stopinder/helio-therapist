import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Growth view keeps learning therapist-led and grounded in recorded material', async () => {
  const content = await readFile(new URL('../src/views/supervision/SupervisionGrowth.vue', import.meta.url), 'utf8')

  assert.match(content, />Growth</)
  assert.match(content, /Your learning edge/)
  assert.match(content, /without turning reflection into another task list/)
  assert.match(content, /From your reflections/)
  assert.match(content, /What keeps drawing your attention\?/)
  assert.match(content, /Frequency is not a judgement about importance, competence or meaning/)
  assert.match(content, /Growth does not have to begin with a goal/)
  assert.match(content, /Earlier recognition/)
  assert.match(content, /More room to respond/)
  assert.match(content, /A different outcome/)
  assert.match(content, /to="\/supervision\/insights"/)
  assert.match(content, /const topThemes = computed/)
  assert.match(content, /props\.themes/)

  assert.doesNotMatch(content, /Turn repeated observations into deliberate learning/)
  assert.doesNotMatch(content, /Persistent goals will be introduced as a proper therapist-owned record/)
  assert.doesNotMatch(content, /CPD activity should follow a learning need/)
  assert.doesNotMatch(content, /const learningGoals\s*=\s*ref/)
  assert.doesNotMatch(content, /you are demonstrating/i)
})
