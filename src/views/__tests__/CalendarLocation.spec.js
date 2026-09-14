import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Calendar from '../Calendar.vue'
import { ref } from 'vue'

// We need the router key for injection
const ROUTER_KEY = 'Symbol(router)'

const mockRouter = {
  push: vi.fn(),
  resolve: vi.fn((to) => ({ href: to.name })),
}

// Mock vue-router
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: vi.fn(() => mockRouter),
  }
})

// Mock dependencies
const mockEvents = ref([])
vi.mock('../../composables/useCalendar', () => ({
  useCalendar: vi.fn(() => ({
    loading: ref(false),
    error: ref(null),
    normalizedEvents: mockEvents,
    todayEvents: ref([]),
    upcomingEvents: ref([]),
    loadData: vi.fn().mockResolvedValue({}),
    isGoogleConnected: ref(true),
    googleLoading: ref(false),
    googleError: ref(null),
    googleAccount: ref(null),
    lastSyncedAt: ref(null),
    loadGoogleEvents: vi.fn().mockResolvedValue([]),
  }))
}))

vi.mock('../../lib/sessions', () => ({
  createOrResumeSession: vi.fn(),
}))

describe('CalendarLocation.spec.js', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockEvents.value = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mountCalendar = () => {
    const wrapper = mount(Calendar, {
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
    
    // Initialize popoverPosition so the popover renders
    wrapper.vm.popoverPosition = { top: 100, left: 100 }
    
    return wrapper
  }

  it('renders safe HTTPS BetterHelp meeting URL as a link', async () => {
    const longUrl = 'https://www.betterhelp.com/session/verify?token=very-long-token-that-would-overflow-the-ui-normally-1234567890-abcdefghijklmnopqrstuvwxyz&user=therapist-123'
    const event = {
      id: 'event-1',
      summary: 'BetterHelp Session',
      start: new Date('2026-08-01T10:00:00'),
      end: new Date('2026-08-01T11:00:00'),
      location: longUrl,
      status: 'confirmed'
    }
    mockEvents.value = [event]

    const wrapper = mountCalendar()
    
    // Select the event to show the popover
    await wrapper.vm.selectAppointment(event)
    
    const anchor = wrapper.find('a[href^="https://"]')
    expect(anchor.exists()).toBe(true)
    expect(anchor.attributes('href')).toBe(longUrl)
    expect(anchor.attributes('target')).toBe('_blank')
    expect(anchor.attributes('rel')).toBe('noopener noreferrer')
    expect(anchor.text()).toContain('Open meeting link')
    
    // Check hostname display
    expect(wrapper.text()).toContain('www.betterhelp.com')
    // Check that long token is truncated or hidden in hostname display
    // The hostname display should ONLY contain the hostname.
    expect(wrapper.text()).not.toContain('very-long-token-that-would-overflow')
  })

  it('renders plain text location without meeting link', async () => {
    const longText = 'Building 4, Floor 3, Room 302, North Wing, Near the elevator, Main Campus, 123 University Ave, Palo Alto, CA 94301'
    const event = {
      id: 'event-2',
      summary: 'Office Meeting',
      start: new Date('2026-08-01T10:00:00'),
      end: new Date('2026-08-01T11:00:00'),
      location: longText,
      status: 'confirmed'
    }
    mockEvents.value = [event]

    const wrapper = mountCalendar()
    await wrapper.vm.selectAppointment(event)
    
    const anchor = wrapper.find('a[href^="http"]')
    expect(anchor.exists()).toBe(false)
    
    const locationSpan = wrapper.find('.break-words.whitespace-pre-wrap')
    expect(locationSpan.exists()).toBe(true)
    expect(locationSpan.text()).toBe(longText)
  })

  it('treats unsafe protocol as plain text', async () => {
    const xss = 'javascript:alert(1)'
    const event = {
      id: 'event-3',
      summary: 'Unsafe Location',
      start: new Date('2026-08-01T10:00:00'),
      end: new Date('2026-08-01T11:00:00'),
      location: xss,
      status: 'confirmed'
    }
    mockEvents.value = [event]

    const wrapper = mountCalendar()
    await wrapper.vm.selectAppointment(event)
    
    const anchor = wrapper.find(`a[href="${xss}"]`)
    expect(anchor.exists()).toBe(false)
    
    // Should be in the plain text span
    const locationSpan = wrapper.find('.break-words.whitespace-pre-wrap')
    expect(locationSpan.exists()).toBe(true)
    expect(locationSpan.text()).toBe(xss)
  })

  it('renders normal Google Meet HTTPS URL as a link', async () => {
    const meetUrl = 'https://meet.google.com/abc-defg-hij'
    const event = {
      id: 'event-4',
      summary: 'Google Meet',
      start: new Date('2026-08-01T10:00:00'),
      end: new Date('2026-08-01T11:00:00'),
      location: meetUrl,
      status: 'confirmed'
    }
    mockEvents.value = [event]

    const wrapper = mountCalendar()
    await wrapper.vm.selectAppointment(event)
    
    const anchor = wrapper.find(`a[href="${meetUrl}"]`)
    expect(anchor.exists()).toBe(true)
    expect(anchor.attributes('target')).toBe('_blank')
    expect(wrapper.text()).toContain('meet.google.com')
  })
})
