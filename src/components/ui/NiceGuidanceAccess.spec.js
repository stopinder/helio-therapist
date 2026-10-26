import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import NiceGuidanceAccess from './NiceGuidanceAccess.vue'
import AskHeliosPanel from './AskHeliosPanel.vue'
import { buildNiceGuidanceReply, NICE_GUIDANCE_URL } from '../../lib/niceGuidance.js'
import { useAskHelios } from '../../composables/useAskHelios.js'
import { authenticatedFetch } from '../../lib/api.js'

vi.mock('../../composables/useAskHelios.js', () => ({ useAskHelios: vi.fn() }))
vi.mock('../../lib/api.js', () => ({ authenticatedFetch: vi.fn() }))

function panelContext(mode = 'research') {
  const ctx = {
    isPanelOpen: ref(true), isExpanded: ref(false), panelWidth: ref(440), mode: ref(mode), messages: ref([]),
    conversations: ref([]), activeConversationId: ref(null), clients: ref([]), selectedClientId: ref(null),
    isRestoring: ref(false), restoreError: ref(null),
    closePanel: vi.fn(), setWidth: vi.fn(), toggleExpand: vi.fn(), clearConversation: vi.fn(),
    selectConversation: vi.fn(), deleteConversation: vi.fn(), fetchConversations: vi.fn(),
    assignConversationId: vi.fn(), setSelectedClient: vi.fn(), patchMessage: vi.fn(), retryRestore: vi.fn(),
    getContextVersion: () => 1, isContextCurrent: () => true, ensureConversationReady: async () => true
  }
  ctx.setMode = next => { ctx.mode.value = next; ctx.messages.value = []; ctx.activeConversationId.value = null }
  ctx.addMessage = message => ctx.messages.value.push(message)
  return ctx
}

beforeEach(() => vi.clearAllMocks())

describe('NICE external guidance access', () => {
  it('opens official links in a new tab without a referrer or endorsement claim', () => {
    const w = mount(NiceGuidanceAccess)
    expect(w.find('a').attributes('href')).toBe(NICE_GUIDANCE_URL)
    for (const link of w.findAll('a')) {
      expect(new URL(link.attributes('href')).hostname).toBe('www.nice.org.uk')
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toContain('noreferrer')
      expect(link.attributes('referrerpolicy')).toBe('no-referrer')
    }
    expect(w.text()).toContain('Guideline content is not loaded into Ask Helios')
    expect(w.text()).toContain('Links do not imply NICE endorsement')
  })
  it('only uses a deliberately entered topic; typing does not call the app API', async () => {
    const w = mount(NiceGuidanceAccess)
    expect(w.find('input').element.value).toBe('')
    await w.find('input').setValue('OCD adults & children')
    const url = new URL(w.find('[data-nice-search-link]').attributes('href'))
    expect(url.searchParams.get('q')).toBe('OCD adults & children')
    expect([...url.searchParams.keys()]).toEqual(['q'])
    expect(authenticatedFetch).not.toHaveBeenCalled()
    expect(w.text()).toContain('Do not enter names or identifying details')
  })
  it('clears its transient topic when the component is reopened', async () => {
    const w = mount(NiceGuidanceAccess)
    await w.find('input').setValue('temporary topic')
    w.unmount()
    const reopened = mount(NiceGuidanceAccess)
    expect(reopened.find('input').element.value).toBe('')
  })
  it('appears only inside Research and labels NICE chat links as unread external guidance', async () => {
    const ctx = panelContext('workspace')
    useAskHelios.mockReturnValue(ctx)
    authenticatedFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, ...buildNiceGuidanceReply() }) })
    const w = mount(AskHeliosPanel, { global: { stubs: { 'router-link': true } } })
    expect(w.find('[data-nice-guidance-access]').exists()).toBe(false)
    await w.find('textarea').setValue('Find NICE guidance for clinicians')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(ctx.messages.value).toHaveLength(2))
    expect(ctx.mode.value).toBe('research')
    expect(w.find('[data-nice-guidance-access]').exists()).toBe(true)
    expect(w.find('[data-nice-guidance-access] input').element.value).toBe('')
    expect(w.text()).toContain('Official guidance links (not read by Helios)')
    expect(w.text()).toContain('has not retrieved or read the guideline text')
    const [path, options] = authenticatedFetch.mock.calls[0]
    expect(path).toBe('/api/ai/research')
    expect(JSON.parse(options.body)).toMatchObject({ mode: 'research', query: 'Find NICE guidance for clinicians' })
    await w.findAll('[role="tab"]')[2].trigger('click')
    expect(w.find('[data-nice-guidance-access]').exists()).toBe(false)
  })
  it('restored links keep their source label instead of becoming evidence citations', () => {
    const ctx = panelContext()
    const restored = JSON.parse(JSON.stringify(buildNiceGuidanceReply()))
    ctx.messages.value = [{ role: 'assistant', content: restored.answer, references: restored.references }]
    useAskHelios.mockReturnValue(ctx)
    const w = mount(AskHeliosPanel, { global: { stubs: { 'router-link': true } } })
    expect(w.find('h4').text()).toBe('Official guidance links (not read by Helios)')
  })
})
