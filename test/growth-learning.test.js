import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Growth & Learning View logic and wording', async () => {
  const growthContent = await readFile(new URL('../src/views/supervision/SupervisionGrowth.vue', import.meta.url), 'utf8')

  // 1. Editorial Prompt & Typography
  assert.match(growthContent, /What is your reflective practice showing you about the therapist you are becoming\?/)
  assert.match(growthContent, /class="[^"]*font-fraunces italic/)

  // 2. Cautious wording for strengths and ethical sections
  assert.match(growthContent, /Appearing more frequently/)
  assert.match(growthContent, /Emerging across recent reflections/)
  assert.match(growthContent, /Themes to keep under consideration/)
  assert.match(growthContent, /supervision session/)

  // 3. Learning Goals logic
  assert.match(growthContent, /const learningGoals = ref\(/)
  assert.match(growthContent, /function addGoal/)
  assert.match(growthContent, /function removeGoal/)
  assert.match(growthContent, /Learning goals are currently kept only for this visit/)

  // 4. Navigation to Supervision Workspace
  assert.match(growthContent, /to="\/supervision\/workspace"/)
  assert.match(growthContent, /Prepare for Supervision/)

  // 5. CPD wording (non-prescriptive)
  assert.match(growthContent, /Reading/)
  assert.match(growthContent, /Theoretical texts related to your recent themes/)
  assert.match(growthContent, /Peer Discussion/)
  assert.match(growthContent, /Explore these themes in a safe peer group setting/)

  // 6. Theme Landscape aggregation logic
  assert.match(growthContent, /const landscapeThemes = computed/)
  assert.match(growthContent, /props\.themes\.filter/)

  // 7. Empty state wording
  assert.match(growthContent, /Continue reflecting to see your clinical strengths emerge here/)
  assert.match(growthContent, /Your recurring themes will appear as you build your practice history/)
})
