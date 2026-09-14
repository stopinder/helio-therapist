import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ClientMeasuresPanel from '../ClientMeasuresPanel.vue'
import * as clientMeasures from '../../../lib/clientMeasures.js'

vi.mock('../../../lib/clientMeasures.js', () => ({
  listClientMeasureHistory: vi.fn()
}))

describe('ClientMeasuresPanel', () => {
  const mockClient = { id: 'client-id', archived: false }
  const mockHistory = [
    {
      resourceId: 'phq9',
      title: 'PHQ-9',
      results: [
        {
          id: 'r2',
          completedAt: '2026-08-12T10:00:00Z',
          scores: { total: 8 },
          calculationVersion: 'phq-9-v1'
        },
        {
          id: 'r1',
          completedAt: '2026-07-20T10:00:00Z',
          scores: { total: 14 },
          calculationVersion: 'phq-9-v1'
        }
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state and not history', async () => {
    clientMeasures.listClientMeasureHistory.mockReturnValue(new Promise(() => {}))

    const wrapper = mount(ClientMeasuresPanel, {
      props: { client: mockClient }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Loading measures…')
    expect(wrapper.find('article').exists()).toBe(false)
  })

  it('renders successful history correctly', async () => {
    clientMeasures.listClientMeasureHistory.mockResolvedValue(mockHistory)
    const wrapper = mount(ClientMeasuresPanel, {
      props: { client: mockClient }
    })
    await flushPromises()

    expect(wrapper.find('#measures-heading').text()).toBe('Measures')
    expect(wrapper.text()).toContain('Outcome-measure results recorded for this client over time.')
    
    const phq9Section = wrapper.find('article')
    expect(phq9Section.text()).toContain('PHQ-9')
    
    // Latest score
    expect(phq9Section.text()).toContain('Latest result')
    expect(phq9Section.text()).toContain('8')
    expect(phq9Section.text()).toContain('12 Aug 2026')
    
    // Historical score
    expect(phq9Section.text()).toContain('20 Jul 2026')
    expect(phq9Section.text()).toContain('14')
    
    // Results ordered newest-first (verified by content order in the grid)
    const rows = phq9Section.findAll('.mt-stack-lg .grid')
    expect(rows[0].text()).toContain('12 Aug 2026')
    expect(rows[1].text()).toContain('20 Jul 2026')
  })

  it('verifies neutral presentation (no AI labels)', async () => {
    clientMeasures.listClientMeasureHistory.mockResolvedValue(mockHistory)
    const wrapper = mount(ClientMeasuresPanel, {
      props: { client: mockClient }
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).not.toContain('improving')
    expect(text).not.toContain('worsening')
    expect(text).not.toContain('AI interpretation')
  })

  it('shows "Send measure" for active clients', async () => {
    clientMeasures.listClientMeasureHistory.mockResolvedValue([])
    const wrapper = mount(ClientMeasuresPanel, {
      props: { client: { ...mockClient, archived: false } }
    })
    await flushPromises()

    expect(wrapper.find('button').text()).toContain('Send measure')
  })

  it('hides "Send measure" but shows history for archived clients', async () => {
    clientMeasures.listClientMeasureHistory.mockResolvedValue(mockHistory)
    const wrapper = mount(ClientMeasuresPanel, {
      props: { client: { ...mockClient, archived: true } }
    })
    await flushPromises()

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('article').exists()).toBe(true)
    expect(wrapper.text()).toContain('PHQ-9')
  })

  it('shows empty state', async () => {
    clientMeasures.listClientMeasureHistory.mockResolvedValue([])
    const wrapper = mount(ClientMeasuresPanel, {
      props: { client: mockClient }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('No outcome-measure results have been recorded for this client yet.')
  })

  it('handles error and retry state', async () => {
    clientMeasures.listClientMeasureHistory.mockRejectedValue(new Error('API Error'))
    
    const wrapper = mount(ClientMeasuresPanel, {
      props: { client: mockClient }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('API Error')
    const retryBtn = wrapper.findAll('button').find(b => b.text().includes('Try again'))
    expect(retryBtn.exists()).toBe(true)

    // Second call succeeds
    clientMeasures.listClientMeasureHistory.mockResolvedValue(mockHistory)
    retryBtn.trigger('click')
    
    // During retry, loading state should reappear
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Loading measures…')
    
    await flushPromises()

    expect(clientMeasures.listClientMeasureHistory).toHaveBeenCalledTimes(2)
    expect(wrapper.find('article').exists()).toBe(true)
  })

  it('handles ResourcePicker handoff', async () => {
    clientMeasures.listClientMeasureHistory.mockResolvedValue([])
    const wrapper = mount(ClientMeasuresPanel, {
      props: { client: mockClient },
      global: {
        stubs: {
          ResourcePicker: {
            template: '<div class="resource-picker-stub"><button class="close-btn" @click="$emit(\'close\')">Close</button><button class="sent-btn" @click="$emit(\'sent\')">Sent</button></div>',
            props: ['client']
          }
        }
      }
    })
    await flushPromises()

    // Open picker
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.resource-picker-stub').exists()).toBe(true)

    // Emit close
    await wrapper.find('.close-btn').trigger('click')
    expect(wrapper.find('.resource-picker-stub').exists()).toBe(false)

    // Open again
    await wrapper.find('button').trigger('click')
    
    // Emit sent
    clientMeasures.listClientMeasureHistory.mockClear()
    await wrapper.find('.sent-btn').trigger('click')
    expect(wrapper.find('.resource-picker-stub').exists()).toBe(false)
    expect(clientMeasures.listClientMeasureHistory).toHaveBeenCalledTimes(1)
  })
})
