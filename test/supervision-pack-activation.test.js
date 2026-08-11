import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('SupervisionSummaryTab uses real reflection content and Supervision Pack action', async () => {
  const content = await readFile(new URL('../src/components/workspace/SupervisionSummaryTab.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  assert.match(content, /Add to Supervision Pack/)
  assert.match(content, /Remove from Supervision Pack/)
  assert.doesNotMatch(content, /Add to Supervision Agenda/)

  // Professional Development is grounded in the stored private reflection, not placeholder summaries.
  assert.match(content, /Private therapist reflection prepared for supervision/)
  assert.match(content, /decodeSessionReflection/)
  assert.match(content, /visibleSections/)
  assert.match(content, /Supervision Questions/)
  assert.match(content, /What Stood Out/)
  assert.doesNotMatch(content, /therapist-owned professional development areas/)

  assert.match(content, /toggleSupervisionPack/)
  assert.match(content, /setReflectionSupervisionSelection/)
  assert.match(content, /included_in_supervision/)
  assert.match(content, /reflection\?.included_in_supervision/)
  assert.match(content, /v-if="loading"/)
  assert.match(content, /v-if="error"/)
  assert.match(content, /updating\.value\s*=\s*true/)

  assert.match(content, /const props\s*=\s*defineProps/)
  assert.match(content, /clientId:/)
  assert.match(content, /sessionId:/)
  assert.match(workspace, /:clientId="session\.clientId"/)
  assert.match(workspace, /:sessionId="session\.id"/)
})
