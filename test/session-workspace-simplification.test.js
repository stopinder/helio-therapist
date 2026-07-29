import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('SessionWorkspace simplification: UI elements removed', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  // Remove Listening indicator
  assert.doesNotMatch(header, /Listening…/)
  assert.doesNotMatch(header, /animate-pulse/)

  // Remove Timer
  assert.doesNotMatch(header, /displayTime/)
  assert.doesNotMatch(header, /incrementTimer/)
  assert.doesNotMatch(header, /timerInterval/)
  assert.doesNotMatch(header, /onMounted/)
  assert.doesNotMatch(header, /onUnmounted/)
  assert.doesNotMatch(header, /⏱/)

  // Remove elapsedTime from workspace
  assert.doesNotMatch(workspace, /elapsedTime:/)
})

test('SessionWorkspace simplification: End Session wiring', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  // Header emits end-session
  assert.match(header, /defineEmits\(\['end-session'\]\)/)
  assert.match(header, /@click="emit\('end-session'\)"/)
  
  // Header handles ending prop
  assert.match(header, /ending: \{/)
  assert.match(header, /:disabled="ending"/)
  assert.match(header, /ending \? 'Ending Session…' : 'End Session'/)

  // Header hides/disables when completed
  assert.match(header, /isCompleted = computed/)
  assert.match(header, /v-if="!isCompleted"/)

  // Workspace listens for end-session and calls library
  assert.match(workspace, /@end-session="handleEndSession"/)
  assert.match(workspace, /import \{ .*completeSessionRecord.* \} from '\.\.\/lib\/sessions\.js'/)
  assert.match(workspace, /async function handleEndSession\(\)/)
  assert.match(workspace, /await completeSessionRecord\(session\.value, session\.value\.notes\)/)
  
  // Workspace updates state and navigates
  assert.match(workspace, /session\.value = updatedSession/)
  assert.match(workspace, /router\.push\(`\/clients\/\$\{session\.value\.clientId\}`\)/)
})
