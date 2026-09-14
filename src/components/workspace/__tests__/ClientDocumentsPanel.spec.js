import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ClientDocumentsPanel from '../ClientDocumentsPanel.vue'

describe('ClientDocumentsPanel', () => {
  const mockDocuments = [
    {
      id: 'd1',
      title: 'Draft Document',
      status: 'draft',
      documentType: 'clinical_summary',
      updatedAt: '2026-08-10T10:00:00Z'
    },
    {
      id: 'f1',
      title: 'Finalised Document',
      status: 'completed',
      documentType: 'progress_report',
      finalizedAt: '2026-08-05T10:00:00Z',
      storagePath: 'documents/f1.pdf'
    }
  ]

  it('renders draft and finalised documents', () => {
    const wrapper = mount(ClientDocumentsPanel, {
      props: {
        documents: mockDocuments
      }
    })

    expect(wrapper.text()).toContain('Draft Document')
    expect(wrapper.text()).toContain('Finalised Document')
    
    const draftSection = wrapper.find('section[aria-labelledby="draft-documents-heading"]')
    expect(draftSection.exists()).toBe(true)
    expect(draftSection.text()).toContain('Continue editing')

    const finalisedSection = wrapper.find('section[aria-labelledby="finalised-documents-heading"]')
    expect(finalisedSection.exists()).toBe(true)
    expect(finalisedSection.text()).toContain('Download')
  })

  it('shows create actions only when not archived', async () => {
    const wrapper = mount(ClientDocumentsPanel, {
      props: {
        documents: mockDocuments,
        archived: false
      }
    })
    expect(wrapper.find('button.button-primary').text()).toBe('Create Document')
    expect(wrapper.find('button.button-secondary').text()).toBe('Create session summary')

    await wrapper.setProps({ archived: true })
    expect(wrapper.find('button.button-primary').exists()).toBe(false)
  })

  it('restricts draft editing for archived clients but allows finalised download', () => {
    const wrapper = mount(ClientDocumentsPanel, {
      props: {
        documents: mockDocuments,
        archived: true
      }
    })

    const draftSection = wrapper.find('section[aria-labelledby="draft-documents-heading"]')
    expect(draftSection.text()).not.toContain('Continue editing')
    expect(draftSection.text()).not.toContain('Delete')

    const finalisedSection = wrapper.find('section[aria-labelledby="finalised-documents-heading"]')
    expect(finalisedSection.text()).toContain('Download')
  })

  it('shows loading state', () => {
    const wrapper = mount(ClientDocumentsPanel, {
      props: {
        loading: true
      }
    })
    expect(wrapper.text()).toContain('Loading documents…')
  })

  it('shows empty state', () => {
    const wrapper = mount(ClientDocumentsPanel, {
      props: {
        documents: []
      }
    })
    expect(wrapper.text()).toContain('No documents yet.')
  })
})
