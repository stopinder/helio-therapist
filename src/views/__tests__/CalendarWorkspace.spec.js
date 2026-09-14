import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Calendar from '../Calendar.vue'
import { ref } from 'vue'

const ROUTER_KEY = 'Symbol(router)'

const mockRouter = {
  push: vi.fn(),
  resolve: vi.fn((to) => ({ href: to.name })),
}

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: vi.fn(() => mockRouter),
  }
})

const mockNormalizedEvents = ref([])
const mockIsGoogleConnected = ref(false)
const mockGoogleAccount = ref('')
const mockGoogleError = ref(null)
const mockGoogleLoading = ref(false)

vi.mock('../../composables/useCalendar', () => ({
  useCalendar: vi.fn(() => ({
    loading: ref(false),
    error: ref(null),
    normalizedEvents: mockNormalizedEvents,
    todayEvents: ref([]),
    upcomingEvents: ref([]),
    loadData: vi.fn().mockResolvedValue({}),
    isGoogleConnected: mockIsGoogleConnected,
    googleLoading: mockGoogleLoading,
    googleError: mockGoogleError,
    googleAccount: mockGoogleAccount,
    lastSyncedAt: ref(null),
    loadGoogleEvents: vi.fn().mockResolvedValue([]),
  }))
}))

vi.mock('../../lib/sessions', () => ({
  createOrResumeSession: vi.fn(),
}))

describe('CalendarWorkspace.spec.js', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockNormalizedEvents.value = []
    mockIsGoogleConnected.value = false
    mockGoogleAccount.value = ''
    mockGoogleError.value = null
    mockGoogleLoading.value = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mountCalendar = () => {
    return mount(Calendar, {
      global: {
        stubs: ['router-link', 'router-view'],
        provide: {
          [ROUTER_KEY]: mockRouter,
          'router': mockRouter
        },
        mocks: {
          $route: { query: {} }
        }
      }
    })
  }

  it('renders Week view by default on a weekday', async () => {
    // 2026-09-14 is a Monday
    vi.setSystemTime(new Date('2026-09-14T10:00:00'))
    const wrapper = mountCalendar()
    
    expect(wrapper.vm.viewMode).toBe('week')
    expect(wrapper.find('[data-testid="week-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="month-view"]').exists()).toBe(false)
  })

  it('switches between Day, Month, and Week views', async () => {
    vi.setSystemTime(new Date('2026-09-14T10:00:00'))
    const wrapper = mountCalendar()
    
    // Switch to Day
    const dayButton = wrapper.findAll('button').find(b => b.text().toLowerCase() === 'day')
    await dayButton.trigger('click')
    expect(wrapper.vm.viewMode).toBe('day')
    // Both day and week view use timed-grid-scroll, so we check for day-specific elements if any,
    // or just rely on viewMode if data-testid is shared.
    // In day view, we have ref="timedGridScrollDay" but we can't easily check refs from wrapper.find
    expect(wrapper.find('[data-testid="week-view"]').exists()).toBe(false)
    
    // Switch to Month
    const monthButton = wrapper.findAll('button').find(b => b.text().toLowerCase() === 'month')
    await monthButton.trigger('click')
    expect(wrapper.vm.viewMode).toBe('month')
    expect(wrapper.find('[data-testid="month-view"]').exists()).toBe(true)
    
    // Switch back to Week
    const weekButton = wrapper.findAll('button').find(b => b.text().toLowerCase() === 'week')
    await weekButton.trigger('click')
    expect(wrapper.vm.viewMode).toBe('week')
    expect(wrapper.find('[data-testid="week-view"]').exists()).toBe(true)
  })

  it('renders Google connected state and account email', async () => {
    mockIsGoogleConnected.value = true
    mockGoogleAccount.value = 'therapist@example.com'
    
    const wrapper = mountCalendar()
    const agenda = wrapper.find('[data-testid="calendar-agenda"]')
    
    expect(agenda.text()).toContain('Connected')
    expect(agenda.text()).toContain('therapist@example.com')
  })

  it('renders Google events correctly', async () => {
    const event = {
      id: 'google-1',
      source: 'google',
      clientName: 'Google Event',
      start: new Date('2026-09-14T11:00:00'),
      end: new Date('2026-09-14T12:00:00'),
      status: 'external'
    }
    mockNormalizedEvents.value = [event]
    
    vi.setSystemTime(new Date('2026-09-14T10:00:00'))
    const wrapper = mountCalendar()
    
    // In week view, should find the event text
    expect(wrapper.text()).toContain('Google Event')
  })

  it('renders reconnect-required state when Google token expires', async () => {
    mockIsGoogleConnected.value = true
    mockGoogleError.value = 'RECONNECT_REQUIRED'
    
    const wrapper = mountCalendar()
    
    expect(wrapper.text()).toContain('Connection expired')
    
    // Find button by text
    const reconnectButton = wrapper.findAll('button').find(b => b.text().includes('Reconnect'))
    expect(reconnectButton.exists()).toBe(true)
  })
})
