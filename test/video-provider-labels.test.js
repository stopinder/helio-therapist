import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { videoProviderService } from '../src/lib/videoProvider.js'

test('videoProviderService keeps join actions compact', () => {
  const scheduledSession = { status: 'Scheduled', videoProvider: 'zoom' }
  const activeSession = { status: 'In Progress', videoProvider: 'zoom' }
  assert.strictEqual(videoProviderService.getVideoActionLabel(scheduledSession), 'Join')
  assert.strictEqual(videoProviderService.getVideoActionLabel(activeSession), 'Return')
})

test('videoProviderService keeps the same compact fallback for other providers', () => {
  const otherSession = { status: 'Scheduled', videoProvider: 'google_meet' }
  assert.strictEqual(videoProviderService.getVideoActionLabel(otherSession), 'Join')
  assert.strictEqual(videoProviderService.getVideoActionLabel(null), 'Join')
})

test('session workspace explains the difference between Zoom and Helio workspace', async () => {
  const content = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  assert.match(content, /Zoom opens the video call in a separate tab/)
  assert.match(content, /Keep Clinical Workspace open in Helio for session capture, notes and review/)
})
