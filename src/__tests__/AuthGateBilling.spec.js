import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AuthGate from '../AuthGate.vue'

const auth = vi.hoisted(() => ({
  session: { access_token: 'test-token' },
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn()
}))

vi.mock('../lib/supabase.js', () => ({ supabase: { auth } }))
vi.mock('../layouts/AppShell.vue', () => ({ default: { template: '<div data-testid="workspace-shell"><slot /></div>' } }))
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
})
