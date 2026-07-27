import test from 'node:test'
import assert from 'node:assert/strict'
import { videoProviderService } from '../src/lib/videoProvider.js'

test('videoProviderService returns provider-neutral labels', () => {
  const scheduledSession = { status: 'Scheduled', videoProvider: 'zoom' }
  const activeSession = { status: 'In Progress', videoProvider: 'microsoft_teams' }
  const googleMeetSession = { status: 'Scheduled', videoProvider: 'google_meet' }

  assert.strictEqual(videoProviderService.getVideoActionLabel(scheduledSession), 'Join Video Session')
  assert.strictEqual(videoProviderService.getVideoActionLabel(activeSession), 'Return to Video Session')
  assert.strictEqual(videoProviderService.getVideoActionLabel(googleMeetSession), 'Join Video Session')
  assert.strictEqual(videoProviderService.getVideoActionLabel(null), 'Join Video Session')
})

test('videoProviderService does not include provider names in labels', () => {
  const zoomSession = { status: 'Scheduled', videoProvider: 'zoom' }
  const label = videoProviderService.getVideoActionLabel(zoomSession)
  
  assert.strictEqual(label.includes('Zoom'), false)
  assert.strictEqual(label.includes('Microsoft Teams'), false)
  assert.strictEqual(label.includes('Google Meet'), false)
})
