import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ProfessionalDevelopmentTimeline from '../ProfessionalDevelopmentTimeline.vue'

// Mock Lucide icons
vi.mock('@lucide/vue', () => ({
  CalendarDays: { render: () => 'CalendarDays' },
  ChevronDown: { render: () => 'ChevronDown' },
  ChevronUp: { render: () => 'ChevronUp' },
  CircleMinus: { render: () => 'CircleMinus' },
  CirclePlus: { render: () => 'CirclePlus' },
  FileText: { render: () => 'FileText' },
  MoreVertical: { render: () => 'MoreVertical' },
  NotebookPen: { render: () => 'NotebookPen' },
  Pencil: { render: () => 'Pencil' },
  Sparkles: { render: () => 'Sparkles' },
  Trash2: { render: () => 'Trash2' },
  UserRound: { render: () => 'UserRound' }
}))

const mockReflections = [
  {
    id: '1',
    created_at: '2026-09-01T10:00:00Z',
    body: 'First reflection body',
    theme: 'Clinical',
    clients: { display_name: 'Client A' },
    included_in_supervision: false
  },
  {
    id: '2',
    created_at: '2026-08-15T10:00:00Z',
    body: 'Second reflection body',
    theme: 'Growth',
    clients: { display_name: 'Client B' },
    included_in_supervision: true
  }
]

describe('ProfessionalDevelopmentTimeline.spec.js', () => {
  it('renders reflections correctly', () => {
    const wrapper = mount(ProfessionalDevelopmentTimeline, {
      props: {
        reflections: mockReflections
      }
    })

    const rows = wrapper.findAll('[data-testid="pd-timeline-row"]')
    expect(rows).toHaveLength(2)

    expect(wrapper.text()).toContain('Client A')
    expect(wrapper.text()).toContain('Clinical')
    expect(wrapper.text()).toContain('Client B')
    expect(wrapper.text()).toContain('Growth')
    expect(wrapper.text()).toContain('Supervision Pack')
  })

  it('expands a reflection when clicked', async () => {
    const wrapper = mount(ProfessionalDevelopmentTimeline, {
      props: {
        reflections: mockReflections
      }
    })

    const firstRowHeader = wrapper.findAll('.reflection-row').at(0).find('.cursor-pointer')
    await firstRowHeader.trigger('click')

    // Verify expanded content
    expect(wrapper.text()).toContain('First reflection body')
    expect(wrapper.text()).toContain('Collapse')
    expect(wrapper.text()).toContain('Date')
    
    // focus-change event
    expect(wrapper.emitted('focus-change')).toBeTruthy()
    expect(wrapper.emitted('focus-change')[0]).toEqual([true])
  })

  it('applies focus mode classes when a reflection is expanded', async () => {
    const wrapper = mount(ProfessionalDevelopmentTimeline, {
      props: {
        reflections: mockReflections
      }
    })

    const rows = wrapper.findAll('.reflection-row')
    await rows.at(0).find('.cursor-pointer').trigger('click')

    // First row is expanded
    expect(rows.at(0).classes()).toContain('ring-2')
    
    // Second row should be dimmed
    expect(rows.at(1).classes()).toContain('opacity-35')
    
    // Collapse
    await wrapper.find('button').findAll('span').find(s => s.text() === 'Collapse')?.trigger('click')
    // Actually the button is "Collapse" text in a button
    const collapseButton = wrapper.findAll('button').find(b => b.text().includes('Collapse'))
    await collapseButton.trigger('click')
    
    expect(rows.at(1).classes()).not.toContain('opacity-35')
    expect(wrapper.emitted('focus-change')[1]).toEqual([false])
  })

  it('renders "Your Reflective Space" when reflections are empty', () => {
    const wrapper = mount(ProfessionalDevelopmentTimeline, {
      props: {
        reflections: []
      }
    })

    expect(wrapper.text()).toContain('Your Reflective Space')
    // Verify that the stale assertion text is NOT present
    expect(wrapper.text()).not.toContain('No reflections found for this search.')
  })
})
