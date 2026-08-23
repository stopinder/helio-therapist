import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Practice Map is grounded in therapist-authored mapping and measured observations', async () => {
  const content = await readFile(new URL('../src/views/supervision/SupervisionInsights.vue', import.meta.url), 'utf8')
  assert.match(content, /Reflective mapping/)
  assert.match(content, />Practice Map</)
  assert.match(content, /Mapping is based on what you have written into your own reflective maps/)
  assert.match(content, /Helios does not infer an inner position from free text/)
  assert.match(content, /Mapped reflections/)
  assert.match(content, /Therapist-authored map/)
  assert.match(content, /Only positions you have named yourself appear here/)
  assert.match(content, /Recent triggers you recorded/)
  assert.match(content, /What you noticed helped/)
  assert.match(content, /Counts compare the last 30 days with the preceding 30 days/)
  assert.match(content, /More frequent/)
  assert.match(content, /Less frequent/)
  assert.match(content, /No change/)
  assert.match(content, /A map, not a verdict/)
  assert.match(content, /Hold patterns lightly/)
  assert.match(content, /const mappedReflections = computed/)
  assert.match(content, /workspace_content\?\.reflectiveMap/)
  assert.match(content, /const positionCounts = computed/)
  assert.match(content, /const themeTrends = computed/)
  assert.doesNotMatch(content, /Newly emerging/)
  assert.doesNotMatch(content, /Your reflective rhythm appears/)
  assert.doesNotMatch(content, /steady and deliberate/)
})
