import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('workspace mounts a focused-field Whisper fallback without duplicating local mic controls', async () => {
  const [authGate, fallback, mic] = await Promise.all([
    read('../src/AuthGate.vue'),
    read('../src/components/ui/GlobalWhisperFallback.vue'),
    read('../src/components/ui/WhisperMicButton.vue')
  ])

  assert.match(authGate, /<GlobalWhisperFallback \/>/)
  assert.match(authGate, /v-else-if="session"/)
  assert.match(fallback, /HTMLTextAreaElement/)
  assert.match(fallback, /data-global-whisper-fallback/)
  assert.match(fallback, /\[data-whisper-control\]/)
  assert.match(fallback, /dispatchEvent\(new Event\('input'/)
  assert.match(fallback, /rows >= 2/)
  assert.match(mic, /data-whisper-control/)
})

test('Ask Helios keeps mic and send inside one positioned composer shell', async () => {
  const panel = await read('../src/components/ui/AskHeliosPanel.vue')
  assert.match(panel, /data-testid="ask-helios-composer"/)
  assert.match(panel, /data-testid="ask-helios-composer-actions"/)
  assert.match(panel, /data-testid="ask-helios-mic"/)
  assert.match(panel, /data-testid="ask-helios-send"/)
  assert.match(panel, /absolute bottom-2 right-2 flex items-center gap-1/)
  assert.match(panel, /pr-20/)
})
