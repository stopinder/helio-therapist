import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Overview from '../Overview.vue'
import { ref, computed } from 'vue'

// Mock dependencies
const mockLoadData = vi.fn().mockResolvedValue({})
const mockLoadTherapistIdentity = vi.fn().mockResolvedValue({})
const mockUpdateUnmatchedCount = vi.fn().mockResolvedValue({})

vi.mock('../../composables/useCalendar', () => ({
  useCalendar: vi.fn(() => ({
    loading: ref(false),
    todayEvents: ref([]),
    loadData: mockLoadData,
    sessions: ref([]),
    clients: ref([]),
  }))
}))

vi.mock('../../composables/useGreeting', () => ({
  useGreeting: vi.fn(() => ({
    eyebrow: ref('Monday, 14 September 2026'),
    phrase: ref('Good afternoon'),
    therapistDisplayName: ref('Test'),
    supportingInformation: ref('You have no appointments today.'),
  }))
}))

vi.mock('../../composables/useTherapistIdentity', () => ({
  useTherapistIdentity: vi.fn(() => ({
    displayName: ref('Test'),
    loadTherapistIdentity: mockLoadTherapistIdentity,
  }))
}))

vi.mock('../../lib/reflections', () => ({
  getAllPrivateReflections: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../lib/api', () => ({
  authenticatedFetch: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        is: vi.fn(() => Promise.resolve({ count: 0, error: null })),
      })),
    })),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

describe('OverviewZoomNotes.spec.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountOverview = () => {
    return mount(Overview, {
      global: {
        stubs: {
          GreetingHeader: true,
          SectionHeader: true,
          SurfaceCard: {
            template: '<div><slot /></div>'
          },
          AppButton: {
            template: '<button><slot /></button>'
          },
          StatusIndicator: true,
          'router-link': true,
          'router-view': true
        }
      }
    })
  }

  it('initial state: "Check for new notes" button is visible and enabled', () => {
    const wrapper = mountOverview()
    const buttons = wrapper.findAll('button')
    const zoomButton = buttons.find(b => b.text().includes('Check for new notes'))
    
    expect(zoomButton).toBeDefined()
    expect(zoomButton.element.disabled).toBe(false)
    expect(zoomButton.attributes('aria-busy')).toBe('false')
  })

  it('in-flight request: shows loading state when button is clicked', async () => {
    let resolveRequest
    const deferredPromise = new Promise(resolve => {
      resolveRequest = resolve
    })

    const api = await import('../../lib/api')
    vi.mocked(api.authenticatedFetch).mockReturnValue(deferredPromise)

    const wrapper = mountOverview()
    const zoomButton = wrapper.findAll('button').find(b => b.text().includes('Check for new notes'))
    
    await zoomButton.trigger('click')

    expect(zoomButton.text()).toBe('Checking…')
    expect(zoomButton.element.disabled).toBe(true)
    expect(zoomButton.attributes('aria-busy')).toBe('true')
    
    expect(wrapper.text()).toContain('Checking Zoom for new notes… This can take up to a minute.')
    
    // Complete the request
    resolveRequest({
      ok: true,
      json: () => Promise.resolve({ imported: 0, imports: [] })
    })
    
    await vi.dynamicImportSettled()
    await wrapper.vm.$nextTick()
  })

  it('successful completion: resets button and shows success message', async () => {
    const api = await import('../../lib/api')
    vi.mocked(api.authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ imported: 0, imports: [] })
    })

    const wrapper = mountOverview()
    const zoomButton = wrapper.findAll('button').find(b => b.text().includes('Check for new notes'))
    
    await zoomButton.trigger('click')
    await vi.dynamicImportSettled()
    await wrapper.vm.$nextTick()

    expect(zoomButton.text()).toBe('Check for new notes')
    expect(zoomButton.element.disabled).toBe(false)
    expect(wrapper.text()).toContain('0 notes imported.')
  })

  it('request deduplication: calls authenticatedFetch only once if clicked twice', async () => {
    const api = await import('../../lib/api')
    let resolveRequest
    const deferredPromise = new Promise(resolve => {
      resolveRequest = resolve
    })
    vi.mocked(api.authenticatedFetch).mockReturnValue(deferredPromise)

    const wrapper = mountOverview()
    const zoomButton = wrapper.findAll('button').find(b => b.text().includes('Check for new notes'))
    
    // First click
    await zoomButton.trigger('click')
    // Second click while pending
    await zoomButton.trigger('click')

    expect(api.authenticatedFetch).toHaveBeenCalledTimes(1)

    resolveRequest({
      ok: true,
      json: () => Promise.resolve({ imported: 0, imports: [] })
    })
    await vi.dynamicImportSettled()
  })

  it('error state: shows error message when request fails', async () => {
    const api = await import('../../lib/api')
    vi.mocked(api.authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to check Zoom notes' })
    })

    const wrapper = mountOverview()
    const zoomButton = wrapper.findAll('button').find(b => b.text().includes('Check for new notes'))
    
    await zoomButton.trigger('click')
    await vi.dynamicImportSettled()
    await wrapper.vm.$nextTick()

    expect(zoomButton.text()).toBe('Check for new notes')
    expect(zoomButton.element.disabled).toBe(false)
    expect(wrapper.text()).toContain('Failed to check Zoom notes')
  })
})
