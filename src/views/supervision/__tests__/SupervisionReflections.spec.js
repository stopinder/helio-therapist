import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import SupervisionReflections from '../SupervisionReflections.vue'

// Mock the child component to avoid deep rendering complexities if needed,
// but we want to test filtering which involves the child.
// We'll just mock the Lucide icons which are likely used in the child.
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
    body: 'Therapeutic alliance and rapport',
    theme: 'Clinical',
    clients: { display_name: 'John Doe' },
    session_ref: 'SESS-001'
  },
  {
    id: '2',
    created_at: '2026-08-15T10:00:00Z',
    body: 'Exploring countertransference',
    theme: 'Personal Growth',
    clients: { display_name: 'Jane Smith' },
    session_ref: 'SESS-002'
  }
]

describe('SupervisionReflections.spec.js', () => {
  it('filters reflections based on search query', async () => {
    const wrapper = mount(SupervisionReflections, {
      props: {
        reflections: mockReflections,
        themes: [{ name: 'All', count: 2 }, { name: 'Clinical', count: 1 }]
      },
      global: {
        stubs: ['router-link']
      }
    })

    const searchInput = wrapper.find('input[placeholder="Search reflections..."]')
    
    // Search by body
    await searchInput.setValue('alliance')
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).not.toContain('Jane Smith')

    // Search by client name
    await searchInput.setValue('Jane')
    expect(wrapper.text()).toContain('Jane Smith')
    expect(wrapper.text()).not.toContain('John Doe')

    // Search by theme
    await searchInput.setValue('Personal')
    expect(wrapper.text()).toContain('Jane Smith')
    expect(wrapper.text()).not.toContain('John Doe')

    // Search by session_ref
    await searchInput.setValue('SESS-001')
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).not.toContain('Jane Smith')
  })

  it('clears filters when the button is clicked', async () => {
    const wrapper = mount(SupervisionReflections, {
      props: {
        reflections: mockReflections,
        themes: [{ name: 'All', count: 2 }]
      },
      global: {
        stubs: ['router-link']
      }
    })

    const searchInput = wrapper.find('input[placeholder="Search reflections..."]')
    await searchInput.setValue('alliance')
    
    const clearButton = wrapper.find('button.text-action-link')
    expect(clearButton.exists()).toBe(true)
    
    await clearButton.trigger('click')
    
    expect(searchInput.element.value).toBe('')
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('Jane Smith')
  })

  it('shows "Your Reflective Space" for zero-result search', async () => {
    const wrapper = mount(SupervisionReflections, {
      props: {
        reflections: mockReflections,
        themes: [{ name: 'All', count: 2 }]
      },
      global: {
        stubs: ['router-link']
      }
    })

    const searchInput = wrapper.find('input[placeholder="Search reflections..."]')
    await searchInput.setValue('NON_EXISTENT_MATCH')
    
    // Current implementation renders "Your Reflective Space" when reflections.length === 0
    expect(wrapper.text()).toContain('Your Reflective Space')
    // Confirm stale assertion text is not there
    expect(wrapper.text()).not.toContain('No reflections found for this search.')
  })
})
