import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const workspace = fs.readFileSync(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
const layout = fs.readFileSync(new URL('../src/layouts/ProfessionalDevelopmentLayout.vue', import.meta.url), 'utf8')
const reflectApi = fs.readFileSync(new URL('../api/ai/reflect.js', import.meta.url), 'utf8')
const transcribeApi = fs.readFileSync(new URL('../api/ai/transcribe.js', import.meta.url), 'utf8')

test('reflection editor exposes an explicit save then AI handoff', () => {
  assert.match(workspace, /Save & Reflect with AI/)
  assert.match(workspace, /saveReflection\(\{ keepOpen: true \}\)/)
  assert.match(workspace, /path: '\/supervision', query: \{ aiReflection: reflection\.id \}/)
  assert.match(workspace, /isRecording\.value \|\| isTranscribing\.value/)
  assert.match(workspace, /reviewed text is saved privately first/)
})

test('professional development resolves only the saved reflection id before opening AI', () => {
  assert.match(layout, /route\.query\.aiReflection/)
  assert.match(layout, /reflections\.value\.find\(item => item\.id === requestedReflectionId\)/)
  assert.match(layout, /handleOpenAIReflection\(reflection\)/)
  assert.match(layout, /aiReflection: undefined/)
})

test('AI reflection API remains reflection-id only and RLS-backed', () => {
  assert.match(reflectApi, /bodyKeys\.length === 1 && bodyKeys\[0\] === 'reflectionId'/)
  assert.match(reflectApi, /getSupabaseUserClient\(req\)/)
  assert.match(reflectApi, /from\('private_reflections'\)/)
  assert.doesNotMatch(reflectApi, /reflectionText/)
})

test('dictation remains transient server-side and returns text only', () => {
  assert.match(transcribeApi, /audio\.transcriptions\.create/)
  assert.match(transcribeApi, /return res\.status\(200\)\.json\(\{ success: true, text:/)
  assert.doesNotMatch(transcribeApi, /from\(/)
  assert.doesNotMatch(transcribeApi, /storage/)
})
