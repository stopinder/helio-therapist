import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Professional Development Insights View logic and wording', async () => {
  const insightsContent = await readFile(new URL('../src/views/supervision/SupervisionInsights.vue', import.meta.url), 'utf8')

  // 1. Editorial Prompt & Typography
  assert.match(insightsContent, /What feels most consistent across your recent reflections\?/)
  assert.match(insightsContent, /class="[^"]*font-fraunces italic/)
  assert.match(insightsContent, /Notice recurring patterns across your reflective practice/)

  // 2. Cautious and non-judgemental wording
  assert.match(insightsContent, /Appearing consistently/)
  assert.match(insightsContent, /Newly emerging/)
  assert.match(insightsContent, /Appearing less frequently/)
  assert.match(insightsContent, /Your reflective rhythm appears/)
  assert.match(insightsContent, /steady and deliberate/)

  // 3. Reflection Activity logic (gentle presentation, no charts)
  assert.match(insightsContent, /const activity = computed/)
  assert.match(insightsContent, /recentCount/)
  assert.match(insightsContent, /frequency/)
  assert.match(insightsContent, /rhythm/)
  assert.ok(!insightsContent.includes('chart'))
  assert.ok(!insightsContent.includes('percent')) // Except for internal calculations if any, but UI should avoid them per Goal

  // 4. Questions Worth Exploring (neutral prompts)
  assert.match(insightsContent, /What continues to draw your attention across different sessions\?/)
  assert.match(insightsContent, /Which situations seem to repeat in your recent reflections\?/)
  assert.match(insightsContent, /What might deserve further curiosity in your next piece of work\?/)

  // 5. Reflective Balance (prompts not measurements)
  assert.match(insightsContent, /Reflective Balance/)
  assert.match(insightsContent, /Clinical Work/)
  assert.match(insightsContent, /Self-awareness/)
  assert.match(insightsContent, /Boundaries/)
  assert.match(insightsContent, /Development/)
  assert.match(insightsContent, /Supervision/)

  // 6. Suggested Next Reflection (optional prompts)
  assert.match(insightsContent, /Suggested Next Reflection/)
  assert.match(insightsContent, /A meaningful moment/)
  assert.match(insightsContent, /An ethical question/)
  assert.match(insightsContent, /A therapeutic relationship/)
  assert.match(insightsContent, /A personal learning point/)

  // 7. Theme aggregation
  assert.match(insightsContent, /const themeGroups = computed/)
  assert.match(insightsContent, /props\.themes\.filter/)
})
