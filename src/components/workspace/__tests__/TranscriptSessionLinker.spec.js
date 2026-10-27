import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TranscriptSessionLinker from '../../TranscriptSessionLinker.vue'
import { authenticatedFetch } from '../../../lib/api.js'

vi.mock('../../../lib/api.js', () => ({ authenticatedFetch: vi.fn() }))
vi.mock('../../../lib/sessions.js', async () => {
  const actual = await vi.importActual('../../../lib/sessions.js')
  return { ...actual, createSessionFromTranscript: vi.fn() }
})

const transcript = {
  id: 'transcript-1',
  clientId: 'client-1',
  sessionRef: null,
  updatedAt: '2026-10-27T14:30:15.382Z'
}
const sessions = [
  { id: 'session-open', clientId: 'client-1', status: 'in_progress', startedAt: '2026-10-20T10:00:00Z' },
  { id: 'session-complete', clientId: 'client-1', status: 'completed', startedAt: '2026-10-05T10:00:00Z' }
]

describe('TranscriptSessionLinker', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows existing encounters before the create-session option without guessing a selection', () => {
    const wrapper = mount(TranscriptSessionLinker, { props: { transcript, clientId: 'client-1', sessions } })
    expect(wrapper.text()).toContain('Which session was this?')
    expect(wrapper.text()).toContain('Open session')
    expect(wrapper.text()).toContain('Completed session')
    expect(wrapper.text()).toContain('Create another session')
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.findAll('input[type="radio"]').some(input => input.element.checked)).toBe(false)
  })

  it('links the therapist-selected existing session and emits the saved transcript', async () => {
    authenticatedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ transcript: { ...transcript, sessionRef: 'session-complete', completedAt: '2026-10-27T15:00:00Z', updatedAt: '2026-10-27T15:00:00Z' } })
    })
    const wrapper = mount(TranscriptSessionLinker, { props: { transcript, clientId: 'client-1', sessions } })
    await wrapper.find('input[value="session-complete"]').setValue()
    await wrapper.findAll('button').find(button => button.text() === 'Link selected session').trigger('click')
    await flushPromises()

    expect(authenticatedFetch).toHaveBeenCalledTimes(1)
    const [, options] = authenticatedFetch.mock.calls[0]
    expect(JSON.parse(options.body)).toMatchObject({
      id: 'transcript-1',
      expectedUpdatedAt: transcript.updatedAt,
      sessionRef: 'session-complete'
    })
    expect(wrapper.emitted('linked')?.[0]?.[0]?.sessionRef).toBe('session-complete')
  })

  it('explains an open-session conflict before offering another session creation', async () => {
    const wrapper = mount(TranscriptSessionLinker, { props: { transcript, clientId: 'client-1', sessions } })
    await wrapper.findAll('button').find(button => button.text() === 'Create another session').trigger('click')
    expect(wrapper.text()).toContain('A session is already open for this client')
    expect(wrapper.find('input[type="date"]').exists()).toBe(false)
  })
})
