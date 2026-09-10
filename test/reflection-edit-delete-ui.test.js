import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const timelinePath = new URL('../src/components/professional-development/ProfessionalDevelopmentTimeline.vue', import.meta.url)
const reviewPath = new URL('../src/views/supervision/SupervisionReflections.vue', import.meta.url)
const layoutPath = new URL('../src/layouts/ProfessionalDevelopmentLayout.vue', import.meta.url)
const editModalPath = new URL('../src/components/professional-development/ReflectionEditModal.vue', import.meta.url)

test('reflection timeline exposes type-aware edit and delete actions', async () => {
  const content = await readFile(timelinePath, 'utf8')
  assert.match(content, /edit-reflection/)
  assert.match(content, /delete-reflection/)
  assert.match(content, /Edit reflection/)
  assert.match(content, /Edit in session/)
  assert.match(content, /Reflect again/)
  assert.match(content, /Delete reflection/)
})

test('review page passes reflection management actions to the layout', async () => {
  const content = await readFile(reviewPath, 'utf8')
  assert.match(content, /@edit-reflection="r => \$emit\('edit-reflection', r\)"/)
  assert.match(content, /@delete-reflection="r => \$emit\('delete-reflection', r\)"/)
})

test('layout keeps structured reflections canonical and deletes retained reflections explicitly', async () => {
  const content = await readFile(layoutPath, 'utf8')
  assert.match(content, /captureSource === 'practice_reflection'/)
  assert.match(content, /router\.push\('\/supervision\/practice-reflection'\)/)
  assert.match(content, /reflection\.client_id && reflection\.session_ref/)
  assert.match(content, /updatePrivateReflectionBody/)
  assert.match(content, /deletePrivateReflection/)
  assert.match(content, /Deleted reflections will not be included in future reflective or longitudinal views/)
})

test('free-text editor requires an explicit save and keeps delete separate', async () => {
  const content = await readFile(editModalPath, 'utf8')
  assert.match(content, /Edit reflection/)
  assert.match(content, /Save changes/)
  assert.match(content, /delete it instead/)
  assert.doesNotMatch(content, /deletePrivateReflection/)
})
