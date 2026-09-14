import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ClientResourcesPanel from '../ClientResourcesPanel.vue'
import * as clientResources from '../../../lib/clientResources.js'

vi.mock('../../../lib/clientResources.js', () => ({
  listClientResources: vi.fn()
}))

describe('ClientResourcesPanel', () => {
  const mockClient = { id: 'client-id', archived: false }
  
  const mockGroups = {
    active: [
      {
        id: 'a1',
        title: 'Active Worksheet',
        kind: 'worksheet',
        status: 'sent',
        statusLabel: 'Sent',
        sentAt: '2026-08-10T10:00:00Z',
        dueAt: '2026-08-15T10:00:00Z'
      }
    ],
    completed: [
      {
        id: 'a2',
        title: 'Completed Document',
        kind: 'document',
        status: 'reviewed',
        statusLabel: 'Reviewed',
        sentAt: '2026-08-01T10:00:00Z',
        reviewedAt: '2026-08-04T10:00:00Z'
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially and not content', async () => {
    clientResources.listClientResources.mockReturnValue(new Promise(() => {}))

    const wrapper = mount(ClientResourcesPanel, {
      props: { client: mockClient }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Loading resources…')
    expect(wrapper.find('h3').exists()).toBe(false) // No Active/Completed headers
  })

  it('renders successful grouped history correctly', async () => {
    clientResources.listClientResources.mockResolvedValue(mockGroups)
    
    const wrapper = mount(ClientResourcesPanel, {
      props: { client: mockClient },
      global: {
        stubs: {
          StatusBadge: true
        }
      }
    })
    await flushPromises()

    expect(wrapper.find('#resources-heading').text()).toBe('Resources')
    
    // Active section
    const activeSection = wrapper.find('section[aria-labelledby="active-resources-heading"]')
    expect(activeSection.exists()).toBe(true)
    expect(activeSection.text()).toContain('Active Worksheet')
    expect(activeSection.text()).toContain('Worksheet')
    expect(activeSection.text()).toContain('Sent 10 Aug 2026')
    expect(activeSection.text()).toContain('Due 15 Aug 2026')

    // Completed section
    const completedSection = wrapper.find('section[aria-labelledby="completed-resources-heading"]')
    expect(completedSection.exists()).toBe(true)
    expect(completedSection.text()).toContain('Completed Document')
    expect(completedSection.text()).toContain('Document')
    expect(completedSection.text()).toContain('Reviewed 4 Aug 2026')
  })

  it('shows "Send resource" for active clients', async () => {
    clientResources.listClientResources.mockResolvedValue({ active: [], completed: [] })
    
    const wrapper = mount(ClientResourcesPanel, {
      props: { client: { ...mockClient, archived: false } }
    })
    await flushPromises()

    expect(wrapper.find('button').text()).toContain('Send resource')
  })

  it('hides "Send resource" but shows history for archived clients', async () => {
    clientResources.listClientResources.mockResolvedValue(mockGroups)
    
    const wrapper = mount(ClientResourcesPanel, {
      props: { client: { ...mockClient, archived: true } }
    })
    await flushPromises()

    const sendBtn = wrapper.findAll('button').find(b => b.text().includes('Send resource'))
    expect(sendBtn).toBeUndefined()
    
    expect(wrapper.find('section[aria-labelledby="active-resources-heading"]').exists()).toBe(true)
  })

  it('shows empty state', async () => {
    clientResources.listClientResources.mockResolvedValue({ active: [], completed: [] })
    
    const wrapper = mount(ClientResourcesPanel, {
      props: { client: mockClient }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('No resources have been sent to this client yet.')
  })

  it('handles error and retry state', async () => {
    clientResources.listClientResources.mockRejectedValue(new Error('Fetch Failed'))
    
    const wrapper = mount(ClientResourcesPanel, {
      props: { client: mockClient }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Fetch Failed')
    const retryBtn = wrapper.findAll('button').find(b => b.text().includes('Try again'))
    expect(retryBtn.exists()).toBe(true)

    // Second call succeeds
    clientResources.listClientResources.mockResolvedValue(mockGroups)
    retryBtn.trigger('click')
    
    // Check loading state reappears
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Loading resources…')
    
    await flushPromises()
    expect(clientResources.listClientResources).toHaveBeenCalledTimes(2)
    expect(wrapper.find('section[aria-labelledby="active-resources-heading"]').exists()).toBe(true)
  })

  it('handles ResourcePicker handoff', async () => {
    clientResources.listClientResources.mockResolvedValue({ active: [], completed: [] })
    
    const wrapper = mount(ClientResourcesPanel, {
      props: { client: mockClient },
      global: {
        stubs: {
          ResourcePicker: {
            template: '<div class="resource-picker-stub"><button class="close-btn" @click="$emit(\'close\')">Close</button><button class="sent-btn" @click="$emit(\'sent\')">Sent</button></div>'
          },
          StatusBadge: true
        }
      }
    })
    await flushPromises()

    // Open picker
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.resource-picker-stub').exists()).toBe(true)

    // Close picker
    await wrapper.find('.close-btn').trigger('click')
    expect(wrapper.find('.resource-picker-stub').exists()).toBe(false)

    // Open again and emit sent
    await wrapper.find('button').trigger('click')
    clientResources.listClientResources.mockClear()
    await wrapper.find('.sent-btn').trigger('click')
    
    expect(wrapper.find('.resource-picker-stub').exists()).toBe(false)
    expect(clientResources.listClientResources).toHaveBeenCalledTimes(1)
  })

  it('maps type labels correctly', async () => {
    const mixedGroups = {
      active: [
        { id: '1', title: 'T1', kind: 'worksheet', status: 'sent', sentAt: '2026-08-10' },
        { id: '2', title: 'T2', kind: 'document', status: 'sent', sentAt: '2026-08-10' },
        { id: '3', title: 'T3', kind: 'unknown_thing', status: 'sent', sentAt: '2026-08-10' }
      ],
      completed: []
    }
    clientResources.listClientResources.mockResolvedValue(mixedGroups)
    
    const wrapper = mount(ClientResourcesPanel, {
      props: { client: mockClient },
      global: { stubs: { StatusBadge: true } }
    })
    await flushPromises()

    const articles = wrapper.findAll('article')
    expect(articles[0].text()).toContain('Worksheet')
    expect(articles[1].text()).toContain('Document')
    expect(articles[2].text()).toContain('Resource') // fallback
  })
})
