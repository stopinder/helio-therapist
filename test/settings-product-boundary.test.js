import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const settings = fs.readFileSync(path.join(root, 'src/components/Settings.vue'), 'utf8')

describe('Settings product boundaries', () => {
  it('shows only supported Google and Zoom integrations', () => {
    expect(settings).toContain('Google Calendar')
    expect(settings).toContain('Zoom')
    expect(settings).not.toContain('Calendly')
  })

  it('does not expose a non-persistent default video-provider setting', () => {
    expect(settings).not.toContain('Default Video Provider')
    expect(settings).not.toContain('defaultVideoProvider')
    expect(settings).not.toContain('local demonstration state')
    expect(settings).toContain('Video links are chosen when scheduling or working with an appointment')
  })

  it('does not ship dormant Calendly server endpoints', () => {
    expect(fs.existsSync(path.join(root, 'api/calendly/connect.js'))).toBe(false)
    expect(fs.existsSync(path.join(root, 'api/calendly/disconnect.js'))).toBe(false)
    expect(fs.existsSync(path.join(root, 'api/calendly/status.js'))).toBe(false)
  })
})
