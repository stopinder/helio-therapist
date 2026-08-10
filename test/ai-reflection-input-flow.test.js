import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('AI reflection accepts either an owned saved reflection or therapist-reviewed draft text', async () => {
  const source = await readFile(new URL('../api/ai/reflect.js', import.meta.url), 'utf8')
  assert.match(source, /hasReflectionId/)
  assert.match(source, /hasReflectionText/)
  assert.match(source, /reflectionText/)
  assert.match(source, /requireAuthenticatedUser\(req\)/)
  assert.match(source, /getSupabaseUserClient\(req\)/)
  assert.doesNotMatch(source, /clinical_notes|sessions|transcript/)
})

test('dictation is authenticated, transient, bounded, and returns text only', async () => {
  const source = await readFile(new URL('../api/ai/transcribe.js', import.meta.url), 'utf8')
  assert.match(source, /requireAuthenticatedUser\(req\)/)
  assert.match(source, /MAX_AUDIO_BYTES/)
  assert.match(source, /SUPPORTED_AUDIO_TYPES/)
  assert.match(source, /audio\.transcriptions\.create/)
  assert.match(source, /success: true, text:/)
  assert.doesNotMatch(source, /\.from\(|storage\.|insert\(|update\(/)
})

test('reflection workspace already provides editable typed and dictated input', async () => {
  const source = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  assert.match(source, /v-model="body"/)
  assert.match(source, /Write or speak whatever feels important/)
  assert.match(source, /navigator\.mediaDevices\.getUserMedia/)
  assert.match(source, /new MediaRecorder/)
  assert.match(source, /\/api\/ai\/transcribe/)
  assert.match(source, /body\.value = `\$\{body\.value\}/)
  assert.match(source, /stream\.getTracks\(\)\.forEach\(track => track\.stop\(\)\)/)
})
