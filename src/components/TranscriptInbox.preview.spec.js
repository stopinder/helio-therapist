import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TranscriptInbox from './TranscriptInbox.vue'
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('../lib/api.js', () => ({ authenticatedFetch: mocks.fetch }))
vi.mock('../lib/clients.js', () => ({ createClient: vi.fn(), listClients: vi.fn().mockResolvedValue([]) }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ push: vi.fn() }) }))
const row = { id: 'unassigned-source', clientId: null, receivedAt: '2026-11-11T09:00:00Z', status: 'unassigned' }
const detail = { ...row, text: '[ ] Unknown: Hello. [ ] Unknown: This is the full conversation, including a distinctive clue.' }
const response = value => ({ ok: true, json: async () => value })
const button = (wrapper, label) => wrapper.findAll('button').find(node => node.text() === label)
let wrapper
beforeEach(() => { vi.clearAllMocks(); document.body.innerHTML = '' })
afterEach(() => { wrapper?.unmount() })
async function open() {
  mocks.fetch.mockResolvedValueOnce(response({ transcripts: [row] }))
  wrapper = mount(TranscriptInbox, { attachTo: document.body, global: { stubs: { SourceReviewDialog: true, TranscriptAssignmentDialog: true, AddClientModal: true } } })
  await flushPromises()
}
describe('identifying an unassigned transcript', () => {
  it('loads on demand, opens one readable source above the actions, and focuses it without assigning a client', async () => {
    await open()
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.conversation-preview').exists()).toBe(false)
    mocks.fetch.mockResolvedValueOnce(response({ transcript: detail }))
    await button(wrapper, 'Preview transcript').trigger('click')
    await flushPromises()
    const preview = wrapper.find('.conversation-preview')
    expect(preview.exists()).toBe(true)
    expect(preview.text()).toContain('distinctive clue')
    expect(wrapper.text()).not.toContain('[ ] Unknown:')
    expect(wrapper.find('.triage-preview').exists()).toBe(false)
    expect(document.activeElement).toBe(preview.element)
    expect(preview.element.compareDocumentPosition(wrapper.find('.triage-actions').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(mocks.fetch).toHaveBeenLastCalledWith('/api/zoom/transcripts?id=unassigned-source')
    expect(mocks.fetch.mock.calls.every(call => !call[1]?.method)).toBe(true)
    await button(wrapper, 'Hide preview').trigger('click')
    expect(wrapper.find('.conversation-preview').exists()).toBe(false)
    await button(wrapper, 'Preview transcript').trigger('click')
    await flushPromises()
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
  })
  it('keeps preview closed on loading failure and allows a retry', async () => {
    await open()
    mocks.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Unable to load source' }) })
    await button(wrapper, 'Preview transcript').trigger('click')
    await flushPromises()
    expect(wrapper.find('.conversation-preview').exists()).toBe(false)
    expect(wrapper.text()).toContain('Unable to load source')
    expect(button(wrapper, 'Preview transcript').attributes('disabled')).toBeUndefined()
    mocks.fetch.mockResolvedValueOnce(response({ transcript: detail }))
    await button(wrapper, 'Preview transcript').trigger('click')
    await flushPromises()
    expect(wrapper.find('.conversation-preview').text()).toContain('distinctive clue')
  })
})
