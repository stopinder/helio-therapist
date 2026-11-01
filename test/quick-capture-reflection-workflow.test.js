import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { isCapturedThought, normalizeWorkspaceReflection } from '../src/lib/reflections.js'

const quickCapture = await readFile(new URL('../src/components/reminders/GlobalQuickCapture.vue', import.meta.url), 'utf8')
const appShell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')
const reflectionsView = await readFile(new URL('../src/views/supervision/SupervisionReflections.vue', import.meta.url), 'utf8')
const pdLayout = await readFile(new URL('../src/layouts/ProfessionalDevelopmentLayout.vue', import.meta.url), 'utf8')
const developmentModal = await readFile(new URL('../src/components/professional-development/QuickReflectionDevelopmentModal.vue', import.meta.url), 'utf8')
const reflectionLib = await readFile(new URL('../src/lib/reflections.js', import.meta.url), 'utf8')

test('Quick Capture saves a captured thought and does not close immediately', () => {
  assert.match(quickCapture, /Saved to Reflect/)
  assert.match(quickCapture, /This is a captured thought, not a finished reflection/)
  assert.match(quickCapture, /Develop reflection/)
  assert.match(quickCapture, /Save to Reflect/)
  assert.doesNotMatch(quickCapture, /emit\('close'\).*createQuickReflection/)
  assert.match(reflectionLib, /quickCaptureState: 'captured'/)
})

test('client and session context are optional rather than silently attached', () => {
  assert.match(quickCapture, /v-model="linkContext"/)
  assert.match(quickCapture, /Optional\. Leave unticked for a therapist-only reflection/)
  assert.match(appShell, /quickCaptureContext/)
  assert.match(appShell, /clientId:linkContext\.value/)
})

test('captured thoughts have a distinct queue in Reflect', () => {
  assert.match(reflectionsView, /Captured thoughts/)
  assert.match(reflectionsView, /Thoughts waiting to be developed/)
  assert.match(reflectionsView, /quickCaptureState !== 'developed'/)
  assert.match(reflectionsView, /@click="\$emit\('develop-reflection', reflection\)"/)
  assert.match(pdLayout, /helios-reflections-changed/)
  assert.match(pdLayout, /QuickReflectionDevelopmentModal/)
})

test('development marks the thought as developed and mapping stays optional', () => {
  assert.match(developmentModal, /Keep as captured/)
  assert.match(developmentModal, /Save developed reflection/)
  assert.match(developmentModal, /Ask Helios for suggestions/)
  assert.match(developmentModal, /Blank fields stay out of the map/)
  assert.match(reflectionLib, /quickCaptureState: 'developed'/)
  assert.match(reflectionLib, /reflectiveMap: normalizeReflectiveMap\(mapping\)/)
})

test('captured-thought classification remains stable through normalisation', () => {
  assert.equal(isCapturedThought({workspace_content:{captureSource:'quick_capture',quickCaptureState:'captured'}}), true)
  assert.equal(isCapturedThought({workspace_content:{captureSource:'quick_capture',quickCaptureState:'developed'}}), false)
  assert.equal(normalizeWorkspaceReflection({captureSource:'quick_capture',quickCaptureState:'captured'}).quickCaptureState, 'captured')
})
