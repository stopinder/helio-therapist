import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ClientWorkspaceHeader from '../ClientWorkspaceHeader.vue'
import { createOrResumeSession } from '../../../lib/sessions.js'
import { useRouter } from 'vue-router'

vi.mock('../../../lib/sessions.js', () => ({
  createOrResumeSession: vi.fn(),
  listSessions: vi.fn(() => Promise.resolve([]))
}))

vi.mock('../../../lib/clients.js', () => ({
  setClientArchived: vi.fn()
}))

vi.mock('../../../lib/clientSupervision.js', () => ({
  getPrivateReflectionsForClient: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: vi.fn()
}))

describe('ClientWorkspaceHeader', () => {
  let router
  const client = { id: 'c1', display_name: 'Vanya', archived: false }

  beforeEach(() => {
    vi.clearAllMocks()
    router = { push: vi.fn() }
    useRouter.mockReturnValue(router)
  })

  it('A. activeSession wins over unresolved completed session', async () => {
    const activeSession = { id: 's-active', status: 'in_progress' }
    const unresolvedSession = { id: 's-unresolved', status: 'completed', workflowStatus: 'needs_review' }
    
    const wrapper = mount(ClientWorkspaceHeader, {
      props: {
        client,
        activeSession,
        unresolvedSession
      }
    })

    await wrapper.find('[data-testid="open-clinical-workspace"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'SessionWorkspace',
      params: { clientId: 'c1', sessionId: 's-active' }
    })
    expect(createOrResumeSession).not.toHaveBeenCalled()
  })

  it('B. unresolved completed session is opened directly and createOrResumeSession is NOT called', async () => {
    const unresolvedSession = { id: 's-unresolved', status: 'completed', workflowStatus: 'needs_review' }
    
    const wrapper = mount(ClientWorkspaceHeader, {
      props: {
        client,
        activeSession: null,
        unresolvedSession
      }
    })

    await wrapper.find('[data-testid="open-clinical-workspace"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'SessionWorkspace',
      params: { clientId: 'c1', sessionId: 's-unresolved' }
    })
    expect(createOrResumeSession).not.toHaveBeenCalled()
  })

  it('C. when neither active nor unresolved session exists, createOrResumeSession IS called', async () => {
    createOrResumeSession.mockResolvedValue({ session: { id: 's-new' } })

    const wrapper = mount(ClientWorkspaceHeader, {
      props: {
        client,
        activeSession: null,
        unresolvedSession: null
      }
    })

    await wrapper.find('[data-testid="open-clinical-workspace"]').trigger('click')

    expect(createOrResumeSession).toHaveBeenCalledWith('c1')
    expect(router.push).toHaveBeenCalledWith({
      name: 'SessionWorkspace',
      params: { clientId: 'c1', sessionId: 's-new' }
    })
  })

  it('D. approved/no_further_action completed sessions do not block creation (handled by ClientWorkspace.vue passing null for unresolvedSession)', async () => {
    // This test ensures that if unresolvedSession is null (because ClientWorkspace didn't find one),
    // it falls back to createOrResumeSession
    createOrResumeSession.mockResolvedValue({ session: { id: 's-new' } })

    const wrapper = mount(ClientWorkspaceHeader, {
      props: {
        client,
        activeSession: null,
        unresolvedSession: null
      }
    })

    await wrapper.find('[data-testid="open-clinical-workspace"]').trigger('click')

    expect(createOrResumeSession).toHaveBeenCalledWith('c1')
  })
})
