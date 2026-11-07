import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AuthGate from '../AuthGate.vue'

const auth = vi.hoisted(() => ({
  session: { access_token: 'test-token', user: { id: 'therapist-one' } },
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn()
}))

vi.mock('../lib/supabase.js', () => ({ supabase: { auth } }))
vi.mock('../layouts/AppShell.vue', () => ({ default: {
  data: () => ({ unsavedDraft: '' }),
  template: '<div data-testid="workspace-shell"><input data-testid="unsaved-work" v-model="unsavedDraft" /><slot /></div>'
} }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ meta: {}, query: {}, fullPath: '/overview' }),
  useRouter: () => ({ replace: vi.fn() })
}))

describe('new-account billing gate', () => {
  beforeEach(() => {
    auth.getSession.mockResolvedValue({ data: { session: auth.session }, error: null })
    auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    vi.stubGlobal('fetch', vi.fn())
  })


  it('shows a neutral access check while billing status is unresolved', async () => {
    let resolveStatus
    fetch.mockReturnValue(new Promise(resolve => { resolveStatus = resolve }))
    const wrapper = mount(AuthGate)
    await flushPromises()
    expect(wrapper.text()).toContain('Checking your access…')
    expect(wrapper.text()).not.toContain('Choose your Helios plan')
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(false)
    resolveStatus({ ok: true, json: async () => ({ subscription: { status: 'trialing' }, hasWorkspaceAccess: true }) })
    await flushPromises()
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('does not show the trial offer when the access check fails', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Temporary billing status error' }) })
    const wrapper = mount(AuthGate)
    await flushPromises()
    expect(wrapper.text()).toContain('We couldn’t check your access')
    expect(wrapper.text()).toContain('Temporary billing status error')
    expect(wrapper.text()).not.toContain('Choose your Helios plan')
    wrapper.unmount()
  })

  it('opens a Free workspace when the therapist has no subscription', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ subscription: null, plan: 'free', activeClientLimit: 5, hasWorkspaceAccess: true }) })
    const wrapper = mount(AuthGate)
    await flushPromises()
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Start 7-day free trial')
    wrapper.unmount()
  })

  it('opens the workspace for an active trial', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ subscription: { status: 'trialing' }, hasWorkspaceAccess: true }) })
    const wrapper = mount(AuthGate)
    await flushPromises()
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(true)
    wrapper.unmount()
  })
  it('preserves workspace and typed content through TOKEN_REFRESHED', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ hasWorkspaceAccess: true, subscription: null }) })
    const wrapper = mount(AuthGate)
    await flushPromises()
    const shell = wrapper.find('[data-testid="workspace-shell"]')
    const input = wrapper.find('[data-testid="unsaved-work"]')
    await input.setValue('unfinished clinical notes')
    const calls = fetch.mock.calls.length
    const listener = auth.onAuthStateChange.mock.calls.at(-1)[0]
    listener('TOKEN_REFRESHED', { access_token: 'rotated-token', user: { id: 'therapist-one' } })
    await flushPromises()
    expect(wrapper.find('[data-testid="workspace-shell"]').element).toBe(shell.element)
    expect(wrapper.find('[data-testid="unsaved-work"]').element).toBe(input.element)
    expect(wrapper.find('[data-testid="unsaved-work"]').element.value).toBe('unfinished clinical notes')
    expect(wrapper.text()).not.toContain('Checking your access…')
    expect(fetch.mock.calls.length).toBe(calls)
    wrapper.unmount()
  })

  it('rechecks access when a different user signs in', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ hasWorkspaceAccess: true, subscription: null }) })
    const wrapper = mount(AuthGate)
    await flushPromises()
    const calls = fetch.mock.calls.length
    const listener = auth.onAuthStateChange.mock.calls.at(-1)[0]
    listener('SIGNED_IN', { access_token: 'another-token', user: { id: 'therapist-two' } })
    await flushPromises()
    expect(fetch.mock.calls.length).toBe(calls + 1)
    wrapper.unmount()
  })

})
