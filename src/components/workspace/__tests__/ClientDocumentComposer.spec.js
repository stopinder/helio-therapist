import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ClientDocumentComposer from '../ClientDocumentComposer.vue'
import * as clientDocs from '../../../lib/clientDocuments.js'
import * as docProfile from '../../../lib/documentProfile.js'

vi.mock('../../../lib/clientDocuments.js', () => ({
  createClientDocumentDraft: vi.fn(),
  downloadClientDocument: vi.fn(),
  finaliseClientDocument: vi.fn(),
  generateClientSessionSummary: vi.fn(),
  listClientSummaryEvidence: vi.fn(() => Promise.resolve([])),
  listDocumentSourceSessions: vi.fn(() => Promise.resolve([])),
  saveClientDocumentDraft: vi.fn()
}))

vi.mock('../../../lib/documentProfile.js', () => ({
  loadDocumentProfile: vi.fn(() => Promise.resolve({ full_name: 'Dr. Therapist' })),
  profileDisplay: vi.fn(() => ({ heading: 'Dr. Therapist', contactLines: [], footer: 'Helios' }))
}))

describe('ClientDocumentComposer', () => {
  const mockClient = { id: 'c1', display_name: 'Jane Doe' }
  const mockDocument = {
    id: 'd1',
    title: 'Test Draft',
    status: 'draft',
    documentType: 'other',
    content: { body: 'Draft body text' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.confirm to always return true
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  it('renders loading state initially', async () => {
    const wrapper = mount(ClientDocumentComposer, {
      props: { client: mockClient },
      global: {
        stubs: {
          teleport: true
        }
      }
    })
    expect(wrapper.find('[data-testid="client-document-composer"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading document workspace…')
  })

  it('renders editable workspace when loaded', async () => {
    const wrapper = mount(ClientDocumentComposer, {
      props: { client: mockClient, document: mockDocument },
      global: { stubs: { teleport: true } }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Edit client document')
    expect(wrapper.find('textarea[aria-label="Clinical document content"]').element.value).toBe('Draft body text')
    const buttons = wrapper.findAll('button')
    expect(buttons.some(b => b.text().includes('Save Draft'))).toBe(true)
  })

  it('renders finalised state', async () => {
    const finalisedDoc = { ...mockDocument, status: 'completed', finalizedAt: '2026-09-14T12:00:00Z' }
    const wrapper = mount(ClientDocumentComposer, {
      props: { client: mockClient, document: finalisedDoc },
      global: { stubs: { teleport: true } }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Document Finalised')
    expect(wrapper.text()).toContain('✓ PDF finalised and saved')
    const buttons = wrapper.findAll('button')
    expect(buttons.some(b => b.text().includes('Download PDF'))).toBe(true)
    // Should NOT show editable canvas textarea in finalised view
    expect(wrapper.find('textarea.clinical-body').exists()).toBe(false)
  })

  it('handles session summary specific UI', async () => {
    const wrapper = mount(ClientDocumentComposer, {
      props: { client: mockClient, initialDocumentType: 'session_summary' },
      global: { stubs: { teleport: true } }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Client-facing summary')
    const buttons = wrapper.findAll('button')
    expect(buttons.some(b => b.text().includes('Generate client summary'))).toBe(true)
  })

  it('preserves text on generation failure', async () => {
    clientDocs.generateClientSessionSummary.mockRejectedValue(new Error('AI failed'))
    
    const wrapper = mount(ClientDocumentComposer, {
      props: { client: mockClient, initialDocumentType: 'session_summary' },
      global: { stubs: { teleport: true } }
    })
    await flushPromises()

    const textarea = wrapper.find('textarea[aria-label="Client session summary content"]')
    await textarea.setValue('Original Text')
    
    const generateBtn = wrapper.findAll('button').find(b => b.text().includes('Generate client summary'))
    await generateBtn.trigger('click')
    await flushPromises()

    expect(textarea.element.value).toBe('Original Text')
  })
})
