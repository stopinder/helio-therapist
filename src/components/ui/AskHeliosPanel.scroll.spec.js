import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import AskHeliosPanel from './AskHeliosPanel.vue'

const fixture = vi.hoisted(() => ({ ask: null }))
vi.mock('../../composables/useAskHelios.js', () => ({ useAskHelios: () => fixture.ask }))
vi.mock('../../lib/api.js', () => ({ authenticatedFetch: vi.fn() }))

const savedMessages = () => [
  { role: 'user', content: 'Find my documents' },
  { role: 'assistant', content: 'Showing 1-8 of 40 documents', references: [] },
  { role: 'user', content: 'Show more documents' },
  { role: 'assistant', content: 'Showing 9-16 of 40 documents', references: [] },
  { role: 'user', content: 'Show more documents' },
  { role: 'assistant', content: 'Showing 17-24 of 40 documents', references: [
    { title: 'Latest source', url: '/documents?open=fixture', citation: 'draft' }
  ] }
]
const rect = top => ({ top, bottom: top + 320, left: 0, right: 440, width: 440, height: 320, x: 0, y: top, toJSON() {} })
let wrappers = []
async function settle() { await nextTick(); await flushPromises(); await nextTick() }
function panel() {
  const w = mount(AskHeliosPanel, { attachTo: document.body, global: { stubs: { 'router-link': true } } })
  wrappers.push(w)
  return w
}
function scrollPane(w) { return w.find('[aria-live="polite"]').element }
function restore(messages = savedMessages(), id = 'saved-conversation') {
  fixture.ask.messages.value = messages
  fixture.ask.activeConversationId.value = id
  fixture.ask.isRestoring.value = false
}

describe('Ask Helios restored answer scroll position', () => {
  beforeEach(() => {
    fixture.ask = {
      isPanelOpen: ref(true), isExpanded: ref(false), panelWidth: ref(440), mode: ref('workspace'),
      messages: ref([]), conversations: ref([]), activeConversationId: ref(null), clients: ref([]), selectedClientId: ref(null),
      isRestoring: ref(true), restoreError: ref(''),
      closePanel: vi.fn(() => { fixture.ask.isPanelOpen.value = false }), setWidth: vi.fn(), toggleExpand: vi.fn(),
      addMessage: vi.fn(), clearConversation: vi.fn(), selectConversation: vi.fn(), deleteConversation: vi.fn(),
      fetchConversations: vi.fn(), setMode: vi.fn(), assignConversationId: vi.fn(), setSelectedClient: vi.fn(),
      patchMessage: vi.fn(), ensureConversationReady: vi.fn(async () => true), retryRestore: vi.fn(),
      getContextVersion: () => 0, isContextCurrent: () => true
    }
    // happy-dom has no layout. Deterministic geometry lets these tests verify
    // which answer is positioned; the browser test verifies actual CSS layout.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.hasAttribute('data-ask-message-index')) {
        const index = Number(this.getAttribute('data-ask-message-index'))
        return rect(120 + 16 + index * 320 - this.parentElement.scrollTop)
      }
      return rect(120)
    })
  })
  afterEach(() => {
    wrappers.forEach(w => w.unmount()); wrappers = []
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('waits for asynchronous history restoration and positions the last answer, not the first answer or references', async () => {
    const w = panel()
    await settle()
    expect(scrollPane(w).scrollTop).toBe(0)
    restore()
    await settle()
    expect(scrollPane(w).scrollTop).toBe(16 + 5 * 320)
    expect(w.find('[data-ask-message-index="5"]').element.getBoundingClientRect().top).toBe(120)
    expect(w.findAll('[data-ask-message-index]')).toHaveLength(6)
    expect(w.text()).toContain('Showing 1-8 of 40')
    expect(w.text()).toContain('Showing 17-24 of 40')
  })

  it('handles an already restored conversation when the panel mounts', async () => {
    restore()
    const w = panel()
    await settle()
    expect(scrollPane(w).scrollTop).toBe(1616)
  })

  it('returns to the latest answer after leaving the history list', async () => {
    restore()
    const w = panel()
    await settle()
    await w.find('button[title="Conversation history"]').trigger('click')
    expect(w.find('[aria-live="polite"]').exists()).toBe(false)
    await w.find('button[title="Back to chat"]').trigger('click')
    await settle()
    expect(scrollPane(w).scrollTop).toBe(1616)
  })

  it('does not jump while restoration is still in progress or if restoration fails', async () => {
    const w = panel()
    fixture.ask.messages.value = savedMessages()
    fixture.ask.activeConversationId.value = 'pending'
    await settle()
    expect(scrollPane(w).scrollTop).toBe(0)
    fixture.ask.restoreError.value = 'History temporarily unavailable'
    fixture.ask.isRestoring.value = false
    await settle()
    expect(scrollPane(w).scrollTop).toBe(0)
  })

  it('does not pull the reader back down when non-layout message metadata changes', async () => {
    restore()
    const w = panel()
    await settle()
    scrollPane(w).scrollTop = 400
    fixture.ask.messages.value[5].actionStatus = 'Saved'
    await settle()
    expect(scrollPane(w).scrollTop).toBe(400)
  })

  it('ignores completion while closed, then positions the restored answer when reopened', async () => {
    const w = panel()
    await settle()
    fixture.ask.isPanelOpen.value = false
    await settle()
    restore()
    await settle()
    expect(w.find('[aria-live="polite"]').exists()).toBe(false)
    fixture.ask.isPanelOpen.value = true
    await settle()
    expect(scrollPane(w).scrollTop).toBe(1616)
  })

  it('does not reuse an earlier conversation scroll target when a different history item loads', async () => {
    restore()
    const w = panel()
    await settle()
    fixture.ask.isRestoring.value = true
    fixture.ask.activeConversationId.value = null
    fixture.ask.messages.value = []
    await settle()
    scrollPane(w).scrollTop = 0
    restore(savedMessages().slice(0, 2), 'different-conversation')
    await settle()
    expect(scrollPane(w).scrollTop).toBe(336)
  })
})
