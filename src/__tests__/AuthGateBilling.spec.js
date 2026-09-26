import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AuthGate from '../AuthGate.vue'

const auth = vi.hoisted(() => ({
  session: { access_token: 'test-token', user: { id: 'therapist-1' } },
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn()
}))

vi.mock('../lib/supabase.js', () => ({ supabase: { auth } }))
vi.mock('../layouts/AppShell.vue', () => ({ default: { template: '<div data-testid="workspace-shell"><slot /></div>' } }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ meta: {}, query: {}, fullPath: '/overview' }),
  useRouter: () => ({ replace: vi.fn() })
}))

describe('new-account billing gate', () => {
  let authCallback
  beforeEach(() => {
    auth.getSession.mockResolvedValue({ data: { session: auth.session }, error: null })
    auth.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    vi.stubGlobal('fetch', vi.fn())
  })

  it('holds the workspace behind checkout when the account has no subscription', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ subscription: null, hasWorkspaceAccess: false }) })
    const wrapper = mount(AuthGate)
    await flushPromises()
    expect(wrapper.text()).toContain('Start your Helios trial')
    expect(wrapper.text()).toContain('Start 30-day free trial')
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('opens the workspace for an active trial', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ subscription: { status: 'trialing' }, hasWorkspaceAccess: true }) })
    const wrapper = mount(AuthGate)
    await flushPromises()
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps an existing account open without a Stripe subscription during token refresh', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ subscription: null, hasWorkspaceAccess: true }) })
    const wrapper = mount(AuthGate)
    await flushPromises()
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(true)

    authCallback('TOKEN_REFRESHED', { access_token: 'refreshed-token', user: { id: 'therapist-1' } })
    await flushPromises()
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('shows a verification error without asking for payment when the status request fails', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Session is invalid or expired' }) })
    const wrapper = mount(AuthGate)
    await flushPromises()
    expect(wrapper.text()).toContain('Unable to verify your subscription')
    expect(wrapper.text()).not.toContain('Start 30-day free trial')
    wrapper.unmount()
  })

  it('keeps the sign-in form while the first subscription check is pending', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    let completeBilling
    fetch.mockImplementation((url) => url === '/api/billing/status'
      ? new Promise(resolve => { completeBilling = resolve })
      : Promise.resolve({ ok: true }))
    auth.signInWithPassword.mockImplementation(async () => {
      authCallback('SIGNED_IN', auth.session)
      return { data: { session: auth.session }, error: null }
    })

    const wrapper = mount(AuthGate)
    await flushPromises()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="login-page"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Opening Helios…')
    expect(wrapper.text()).not.toContain('Start your Helios trial')

    completeBilling({ ok: true, json: async () => ({ subscription: null, hasWorkspaceAccess: true }) })
    await flushPromises()
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('uses a neutral loading view for a saved session while billing is pending', async () => {
    let completeBilling
    fetch.mockImplementation(() => new Promise(resolve => { completeBilling = resolve }))
    const wrapper = mount(AuthGate)
    await flushPromises()
    expect(wrapper.text()).toContain('Opening Helios…')
    expect(wrapper.text()).not.toContain('Start your Helios trial')
    completeBilling({ ok: true, json: async () => ({ subscription: null, hasWorkspaceAccess: true }) })
    await flushPromises()
    expect(wrapper.find('[data-testid="workspace-shell"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
