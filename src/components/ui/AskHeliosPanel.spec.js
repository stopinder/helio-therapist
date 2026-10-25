import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, config } from '@vue/test-utils'
import AskHeliosPanel from './AskHeliosPanel.vue'
import { useAskHelios } from '../../composables/useAskHelios.js'
import * as api from '../../lib/api.js'

vi.mock('../../lib/api.js')
config.global.stubs['router-link'] = true
const ok = payload => ({ ok: true, json: () => Promise.resolve({ success: true, ...payload }) })

describe('AskHeliosPanel', () => {
  let ask
  beforeEach(() => {
    vi.clearAllMocks()
    ask = useAskHelios()
    ask.setMode('research')
    ask.clearConversation()
    if (!ask.isPanelOpen.value) ask.togglePanel()
    if (ask.isExpanded.value) ask.toggleExpand()
    vi.spyOn(api, 'authenticatedFetch').mockImplementation(async url => {
      if (url === '/api/ai/conversations') return ok({ conversations: [] })
      if (url === '/api/ai/workspace-clients') return ok({ clients: [] })
      return ok({ answer: 'Research response', references: [] })
    })
  })

  it('renders all three modes with Research as the current mode', () => {
    const w = mount(AskHeliosPanel)
    expect(w.find('h2').text()).toBe('Ask Helios')
    expect(w.findAll('[role="tab"]')).toHaveLength(3)
    expect(w.find('[role="tab"][aria-selected="true"]').text()).toBe('Research')
    expect(w.find('textarea').exists()).toBe(true)
  })

  it('preserves the research endpoint and clickable references', async () => {
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/research') return ok({
        answer: 'Research suggests CBT works.', conversationId: 'research-convo',
        references: [{ title: 'CBT Study', url: 'https://pubmed.ncbi.nlm.nih.gov/123/', citation: 'Study 2024' }]
      })
      return ok({ conversations: [] })
    })
    const w = mount(AskHeliosPanel)
    await w.find('textarea').setValue('Is CBT effective?')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(ask.messages.value).toHaveLength(2))
    expect(api.authenticatedFetch).toHaveBeenCalledWith('/api/ai/research', expect.objectContaining({
      method: 'POST', body: expect.stringContaining('Is CBT effective?')
    }))
    expect(ask.activeConversationId.value).toBe('research-convo')
    expect(w.text()).toContain('CBT Study')
  })

  it('switches to workspace and queries only the workspace endpoint', async () => {
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/workspace-clients') return ok({
        clients: [{ id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc', display_name: 'Client A' }]
      })
      if (url === '/api/ai/assist') return ok({
        answer: 'Upcoming appointments — none', mode: 'workspace',
        references: [{ title: 'Calendar', url: '/calendar', citation: 'Open in Helios' }]
      })
      return ok({ conversations: [] })
    })
    const w = mount(AskHeliosPanel)
    await w.findAll('[role="tab"]')[0].trigger('click')
    await vi.waitFor(() => expect(ask.mode.value).toBe('workspace'))
    expect(w.text()).toContain('Client for session preparation')
    await w.find('textarea').setValue('What needs my attention?')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(ask.messages.value).toHaveLength(2))
    expect(api.authenticatedFetch).toHaveBeenCalledWith('/api/ai/assist', expect.objectContaining({
      body: expect.stringContaining('"mode":"workspace"')
    }))
    expect(w.text()).toContain('Upcoming appointments')
    expect(ask.messages.value[1].references[0].title).toBe('Calendar')
  })

  it('requires explicit approval before creating a reminder', async () => {
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/assist') return ok({
        answer: 'Nothing saved yet.', mode: 'workspace',
        proposedAction: { type: 'create_reminder', body: 'review my notes' }
      })
      if (url === '/api/ai/actions') return ok({ action: 'create_reminder' })
      if (url === '/api/ai/workspace-clients') return ok({ clients: [] })
      return ok({ conversations: [] })
    })
    const w = mount(AskHeliosPanel)
    await w.findAll('[role="tab"]')[0].trigger('click')
    await w.find('textarea').setValue('Remind me to review my notes')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('Create reminder'))
    expect(api.authenticatedFetch.mock.calls.filter(c => c[0] === '/api/ai/actions')).toHaveLength(0)
    const button = w.findAll('button').find(b => b.text() === 'Create reminder')
    await button.trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('Reminder created'))
    const call = api.authenticatedFetch.mock.calls.find(c => c[0] === '/api/ai/actions')
    expect(JSON.parse(call[1].body)).toEqual({ type: 'create_reminder', body: 'review my notes', confirmed: true })
  })

  it('Reflect saves only deliberately edited therapist text as private CPD', async () => {
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/assist') return ok({ answer: 'What was happening for you?', mode: 'reflect' })
      if (url === '/api/ai/actions') return ok({ action: 'save_private_reflection' })
      return ok({ conversations: [] })
    })
    const w = mount(AskHeliosPanel)
    await w.findAll('[role="tab"]')[2].trigger('click')
    await w.find('textarea').setValue('I felt impatient during that discussion')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('Save my reflection to CPD'))
    expect(api.authenticatedFetch.mock.calls.filter(c => c[0] === '/api/ai/actions')).toHaveLength(0)
    await w.findAll('button').find(b => b.text() === 'Save my reflection to CPD').trigger('click')
    await w.find('textarea[id^="ask-helios-reflection-"]').setValue('I noticed impatience and want to explore it in supervision.')
    await w.findAll('button').find(b => b.text() === 'Save private reflection').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('Saved to your private professional reflections'))
    const action = api.authenticatedFetch.mock.calls.find(c => c[0] === '/api/ai/actions')
    expect(JSON.parse(action[1].body)).toEqual({
      type: 'save_private_reflection',
      body: 'I noticed impatience and want to explore it in supervision.',
      confirmed: true
    })
  })

  it('supports panel expansion', async () => {
    const w = mount(AskHeliosPanel)
    await w.find('button[title="Expand to workspace"]').trigger('click')
    expect(ask.isExpanded.value).toBe(true)
    expect(w.find('div.fixed').classes()).toContain('inset-x-0')
    await w.find('button[title="Restore size"]').trigger('click')
    expect(ask.isExpanded.value).toBe(false)
  })

  it('shows a useful error without changing modes or sending data to an action', async () => {
    api.authenticatedFetch.mockRejectedValue(new Error('Network error'))
    const w = mount(AskHeliosPanel)
    await w.find('textarea').setValue('Test query')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(ask.messages.value).toHaveLength(2))
    expect(ask.messages.value[1].content).toContain('I could not complete that request. Network error')
    expect(api.authenticatedFetch.mock.calls.some(c => c[0] === '/api/ai/actions')).toBe(false)
  })
})
