import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('SupervisionSummaryTab: New wording and Supervision Pack action', async () => {
  const content = await readFile(new URL('../src/components/workspace/SupervisionSummaryTab.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  // Renamed "Add to Supervision Agenda" -> "Add to Supervision Pack"
  assert.match(content, /Add to Supervision Pack/)
  assert.match(content, /Remove from Supervision Pack/)
  assert.doesNotMatch(content, /Add to Supervision Agenda/)

  // Header and intro
  assert.match(content, /Professional Development/)
  assert.match(content, /reflective practice and supervision preparation/)

  // Interactive logic
  assert.match(content, /toggleSupervisionPack/)
  assert.match(content, /setReflectionSupervisionSelection/)
  assert.match(content, /included_in_supervision/)
  assert.match(content, /reflection\?.included_in_supervision/)

  // Loading and error states
  assert.match(content, /v-if="loading"/)
  assert.match(content, /v-if="error"/)
  assert.match(content, /updating\.value = true/)

  // Props and synchronization
  assert.match(content, /const props = defineProps/)
  assert.match(content, /clientId:/)
  assert.match(content, /sessionId:/)
  assert.match(workspace, /:clientId="session\.clientId"/)
  assert.match(workspace, /:sessionId="session\.id"/)
})
