import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAskHelios } from './useAskHelios.js'
vi.mock('../lib/supabase.js', () => ({ supabase: null }))
vi.mock('../lib/api.js', () => ({ authenticatedFetch: vi.fn(async () => ({ ok: true, json: async () => ({ success: true, clients: [], conversations: [] }) })) }))
const clientId = 'cccccccc-cccc-4ccc-cccc-cccccccccccc'
const sessionId = 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee'
const context = { clientId, clientName: 'Synthetic client', anchorSessionId: sessionId, lens: 'internal_family_systems', window: 'current' }
describe('workspace header entry', () => {
  let ask
  beforeEach(() => {
    ask = useAskHelios()
    ask.closePanel()
    ask.clearConversation()
    ask.clearClinicalContext()
  })
  it('uses the current session and preserves its conversation when reopened', async () => {
    const release = ask.registerWorkspaceContext(() => context)
    await ask.togglePanel()
    expect(ask.clinicalContext.value).toMatchObject(context)
    ask.addMessage({ role: 'user', content: 'What should I explore?' })
    await ask.togglePanel()
    expect(ask.isPanelOpen.value).toBe(false)
    await ask.togglePanel()
    expect(ask.messages.value).toHaveLength(1)
    release()
  })
  it('preserves the Clinical lens when opening from a summary workspace', async () => {
    const release = ask.registerWorkspaceContext(() => ({ ...context, lens: 'clinical' }))
    await ask.togglePanel()
    expect(ask.clinicalContext.value.lens).toBe('clinical')
    release()
  })
  it('changes scope when navigating to another session and releases the departed workspace', async () => {
    const releaseOld = ask.registerWorkspaceContext(() => context)
    await ask.togglePanel()
    ask.closePanel()
    const next = { ...context, anchorSessionId: 'dddddddd-dddd-4ddd-dddd-dddddddddddd' }
    const releaseNew = ask.registerWorkspaceContext(() => next)
    releaseOld()
    await ask.togglePanel()
    expect(ask.clinicalContext.value.anchorSessionId).toBe(next.anchorSessionId)
    releaseNew()
    ask.closePanel()
    ask.clearClinicalContext()
    await ask.togglePanel()
    expect(ask.clinicalContext.value).toBeNull()
  })
})
