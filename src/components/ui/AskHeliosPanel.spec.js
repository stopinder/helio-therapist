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
    ask.clearClinicalContext()
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

  it('automatically routes the reported weekly-attention question to Workspace even from an existing Research conversation', async () => {
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/assist') {
        return ok({ mode: 'workspace', answer: 'Open reminders: review session notes.', conversationId: 'workspace-new' })
      }
      return ok({ conversations: [], clients: [] })
    })
    ask.assignConversationId('old-research-conversation')
    ask.addMessage({ role: 'assistant', content: 'Previous unrelated research.' })
    const w = mount(AskHeliosPanel)
    expect(ask.mode.value).toBe('research')
    await w.find('textarea').setValue('What needs my attention this week?')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(ask.messages.value).toHaveLength(2))
    expect(ask.mode.value).toBe('workspace')
    expect(w.find('[role="status"]').text()).toContain('Switched to Workspace')
    expect(ask.messages.value[1].content).toContain('Open reminders')
    const assist = api.authenticatedFetch.mock.calls.find(call => call[0] === '/api/ai/assist')
    expect(assist).toBeTruthy()
    expect(JSON.parse(assist[1].body)).toMatchObject({
      mode: 'workspace', query: 'What needs my attention this week?', conversationId: null, history: []
    })
    expect(api.authenticatedFetch.mock.calls.filter(call => call[0] === '/api/ai/research')).toHaveLength(0)
  })

  it('routes a consent-form document search to Workspace from Research mode', async () => {
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/assist') return ok({ mode: 'workspace', answer: 'Recently updated documents matching consent', references: [] })
      return ok({ conversations: [], clients: [] })
    })
    const w = mount(AskHeliosPanel)
    expect(ask.mode.value).toBe('research')
    await w.find('textarea').setValue('Find my consent forms and documents.')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(ask.messages.value).toHaveLength(2))
    expect(ask.mode.value).toBe('workspace')
    expect(ask.messages.value[1].content).toContain('Recently updated documents matching consent')
    expect(api.authenticatedFetch.mock.calls.filter(c => c[0] === '/api/ai/research')).toHaveLength(0)
    const [, options] = api.authenticatedFetch.mock.calls.find(c => c[0] === '/api/ai/assist')
    expect(JSON.parse(options.body)).toMatchObject({ mode: 'workspace', query: 'Find my consent forms and documents.' })
  })

  it('shows paginated document results and sends the current search context on Show next', async () => {
    const previous = { kind: 'documents', type: null, status: null, page: 0, total: 19, shown: 8, hasMore: true }
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/assist') {
        return ok({
          mode: 'workspace', answer: 'Showing 1–8 of 19 matching documents',
          documentSearch: previous,
          references: [{ title: 'Document A', url: '/documents?open=aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', citation: 'draft' }]
        })
      }
      return ok({ conversations: [], clients: [] })
    })
    const w = mount(AskHeliosPanel)
    await w.findAll('[role="tab"]')[0].trigger('click')
    await w.find('textarea').setValue('Find my documents')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('Show next 8 documents'))
    const next = w.findAll('button').find(b => b.text().includes('Show next'))
    await next.trigger('click')
    await vi.waitFor(() => expect(api.authenticatedFetch.mock.calls.filter(c => c[0] === '/api/ai/assist')).toHaveLength(2))
    const [, params] = api.authenticatedFetch.mock.calls.filter(c => c[0] === '/api/ai/assist')[1]
    expect(JSON.parse(params.body)).toMatchObject({ mode: 'workspace', query: 'Show more documents' })
    expect(JSON.parse(params.body)).not.toHaveProperty('documentSearch')
    expect(api.authenticatedFetch.mock.calls.filter(c => c[0] === '/api/ai/research')).toHaveLength(0)
  })

  it('reopened Workspace conversations use their persisted identity for follow-up searches', async () => {
    const id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/conversations?id=' + id) return ok({
        conversation: { title: '[Workspace] Find my documents', id },
        messages: [
          { role: 'user', content: 'Find my documents' },
          { role: 'assistant', content: 'Showing 1–8 of 19 matching documents', citation_metadata: [] }
        ]
      })
      if (url === '/api/ai/assist') return ok({
        answer: 'Showing 9–16 of 19 matching documents.', mode: 'workspace', conversationId: id
      })
      return ok({ conversations: [], clients: [] })
    })
    await ask.selectConversation(id)
    expect(ask.mode.value).toBe('workspace')
    const w = mount(AskHeliosPanel)
    await w.find('textarea').setValue('Show more documents')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(ask.messages.value.at(-1)?.content).toContain('Showing 9'))
    const [, params] = api.authenticatedFetch.mock.calls.find(c => c[0] === '/api/ai/assist')
    const body = JSON.parse(params.body)
    expect(body).toMatchObject({ mode: 'workspace', conversationId: id, query: 'Show more documents' })
    expect(body).not.toHaveProperty('documentSearch')
  })

  it('clearly announces the transition from Workspace to published research', async () => {
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/research') return ok({ answer: 'Evidence summary', references: [] })
      return ok({ conversations: [], clients: [] })
    })
    const w = mount(AskHeliosPanel)
    await w.findAll('[role="tab"]')[0].trigger('click')
    await w.find('textarea').setValue('What does the research say about therapist appointment reminders?')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(ask.messages.value).toHaveLength(2))
    expect(ask.mode.value).toBe('research')
    expect(w.find('[role="status"]').text()).toContain('Switched to Research')
    expect(api.authenticatedFetch.mock.calls.some(c => c[0] === '/api/ai/assist')).toBe(false)
  })

  it('still sends deliberate research about appointment reminders to Research', async () => {
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/research') return ok({ answer: 'Published evidence about reminders.', references: [] })
      return ok({ conversations: [] })
    })
    const w = mount(AskHeliosPanel)
    await w.find('textarea').setValue('What does the research say about appointment reminders?')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(ask.messages.value).toHaveLength(2))
    expect(ask.mode.value).toBe('research')
    expect(api.authenticatedFetch.mock.calls.some(call => call[0] === '/api/ai/research')).toBe(true)
    expect(api.authenticatedFetch.mock.calls.some(call => call[0] === '/api/ai/assist')).toBe(false)
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

  it('Reflect prepares a reviewed reflection map and saves only after explicit confirmation', async () => {
    const conversationId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/assist') return ok({ answer: 'What was happening for you?', mode: 'reflect', conversationId })
      if (url === '/api/ai/reflection-draft') return ok({
        data: {
          conversationId,
          promptVersion: 'ask-helios-reflection-draft-v1',
          theme: 'Urgency',
          reflection: {
            stoodOut: 'I noticed myself rushing to solve the problem.',
            emotionalResponse: 'I felt impatient and urgent.',
            countertransference: '',
            uncertainties: 'I am unsure what made the silence hard to tolerate.',
            supervisionQuestions: 'What happens in me when I cannot quickly reduce distress?',
            nextSession: ''
          },
          reflectiveMap: {
            innerPosition: 'Wanting to rescue',
            protectiveIntention: 'Trying to reduce discomfort quickly',
            trigger: 'The other person becoming distressed',
            impact: 'I sped the conversation up and offered solutions',
            spaceCreated: '',
            supervisionQuestion: 'What would help me stay curious when distress rises?'
          },
          limitations: 'No clear evidence about what created more space.'
        }
      })
      if (url === '/api/ai/actions') return ok({ action: 'save_private_reflection_draft' })
      return ok({ conversations: [] })
    })
    const w = mount(AskHeliosPanel)
    await w.findAll('[role="tab"]')[2].trigger('click')
    await w.find('textarea').setValue('I felt impatient and noticed myself rushing to solve it.')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('Send to Reflect'))
    expect(api.authenticatedFetch.mock.calls.filter(c => c[0] === '/api/ai/actions')).toHaveLength(0)

    await w.findAll('button').find(b => b.text() === 'Send to Reflect').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('Review before saving'))
    expect(w.text()).toContain('Wanting to rescue')
    expect(api.authenticatedFetch.mock.calls.filter(c => c[0] === '/api/ai/actions')).toHaveLength(0)

    await w.find('#ask-reflection-stoodOut').setValue('I noticed myself moving too quickly to solve the problem.')
    await w.findAll('button').find(b => b.text() === 'Save to Reflect').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('Saved to Reflect'))
    const action = api.authenticatedFetch.mock.calls.find(c => c[0] === '/api/ai/actions')
    const body = JSON.parse(action[1].body)
    expect(body).toMatchObject({
      type: 'save_private_reflection_draft',
      sourceConversationId: conversationId,
      confirmed: true,
      theme: 'Urgency'
    })
    expect(body.reflection.stoodOut).toBe('I noticed myself moving too quickly to solve the problem.')
    expect(body.reflectiveMap.innerPosition).toBe('Wanting to rescue')
  })

  it('shows explicit client, perspective and evidence controls for clinical context', async () => {
    const clientId = 'cccccccc-cccc-4ccc-cccc-cccccccccccc'
    const sessionId = 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee'
    await ask.openClinicalContext({
      clientId, clientName: 'Client A', anchorSessionId: sessionId,
      window: 'last_five', lens: 'internal_family_systems', source: 'session_workspace'
    })
    const w = mount(AskHeliosPanel)
    expect(ask.mode.value).toBe('workspace')
    expect(w.find('[data-testid="ask-helios-clinical-context"]').exists()).toBe(true)
    expect(w.text()).toContain('Client A')
    expect(w.text()).toContain('Internal Family Systems (IFS)')
    expect(w.text()).toContain('Entire history')
    expect(w.text()).toContain('Ask Helios does not write to the clinical record')
    expect(w.text()).not.toContain('Client for session preparation')
  })

  it('sends selected clinical scope to Workspace and offers a de-identified Research handoff', async () => {
    const clientId = 'cccccccc-cccc-4ccc-cccc-cccccccccccc'
    const sessionId = 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee'
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/assist') return ok({
        mode:'workspace',
        answer:'Recorded context\nA pattern is recorded.\n\nClinical interpretation\nOne possibility is...',
        references:[{ title:'30 Oct 2026 session', url:'/clients/' + clientId + '/sessions/' + sessionId, citation:'linked transcript' }],
        clinicalContext:{
          clientId, clientName:'Client A', anchorSessionId:sessionId, window:'last_five',
          lens:'internal_family_systems', sourceCount:5,
          researchHandoff:'Find published research relevant to this therapist question: What mechanisms might explain this pattern?'
        }
      })
      if (url === '/api/ai/workspace-clients') return ok({ clients:[{ id:clientId, display_name:'Client A' }] })
      return ok({ conversations:[] })
    })
    await ask.openClinicalContext({
      clientId, clientName:'Client A', anchorSessionId:sessionId,
      window:'last_five', lens:'internal_family_systems'
    })
    const w = mount(AskHeliosPanel)
    await w.find('textarea').setValue('What might I be missing?')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('Check research evidence'))
    const assist = api.authenticatedFetch.mock.calls.find(call => call[0] === '/api/ai/assist')
    const body = JSON.parse(assist[1].body)
    expect(body.mode).toBe('workspace')
    expect(body.clientId).toBe(clientId)
    expect(body.clinicalContext).toMatchObject({
      clientId, anchorSessionId:sessionId, window:'last_five', lens:'internal_family_systems'
    })
    expect(ask.clinicalContext.value.sourceCount).toBe(5)
    const research = w.findAll('button').find(button => button.text() === 'Check research evidence')
    await research.trigger('click')
    expect(ask.mode.value).toBe('research')
    expect(ask.clinicalContext.value).toBe(null)
    expect(w.find('textarea').element.value).toContain('published research')
    expect(w.text()).toContain('client records stay in Workspace')
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


  it('does not offer Send to Reflect from general Workspace or Research answers', async () => {
    api.authenticatedFetch.mockImplementation(async url => {
      if (url === '/api/ai/assist') return ok({ answer:'Your next appointment is tomorrow.', mode:'workspace', conversationId:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' })
      if (url === '/api/ai/research') return ok({ answer:'Published evidence.', conversationId:'cccccccc-cccc-4ccc-cccc-cccccccccccc' })
      return ok({ conversations:[], clients:[] })
    })
    const w = mount(AskHeliosPanel)
    await w.findAll('[role="tab"]')[0].trigger('click')
    await w.find('textarea').setValue('What is on tomorrow?')
    await w.find('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('Your next appointment'))
    expect(w.text()).not.toContain('Send to Reflect')
  })
