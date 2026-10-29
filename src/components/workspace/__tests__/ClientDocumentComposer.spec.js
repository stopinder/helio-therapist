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

const RichDocumentEditorStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<textarea data-testid="rich-document-editor-stub" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
}

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
      global: { stubs: { teleport: true, RichDocumentEditor: RichDocumentEditorStub } }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Edit client document')
    expect(wrapper.find('[data-testid="rich-document-editor-stub"]').element.value).toBe('Draft body text')
    const buttons = wrapper.findAll('button')
    expect(buttons.some(b => b.text().includes('Save Draft'))).toBe(true)
  })

  it('renders finalised state', async () => {
    const finalisedDoc = { ...mockDocument, status: 'completed', finalizedAt: '2026-09-14T12:00:00Z' }
    const wrapper = mount(ClientDocumentComposer, {
      props: { client: mockClient, document: finalisedDoc },
      global: { stubs: { teleport: true, RichDocumentEditor: RichDocumentEditorStub } }
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
      global: { stubs: { teleport: true, RichDocumentEditor: RichDocumentEditorStub } }
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
      global: { stubs: { teleport: true, RichDocumentEditor: RichDocumentEditorStub } }
    })
    await flushPromises()

    const editor = wrapper.find('[data-testid="rich-document-editor-stub"]')
    expect(editor.exists()).toBe(true)
    await editor.setValue('Original Text')
    await flushPromises()
    
    const generateBtn = wrapper.findAll('button').find(b => b.text().includes('Generate client summary'))
    await generateBtn.trigger('click')
    await flushPromises()

    expect(clientDocs.generateClientSessionSummary).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('AI failed')
    expect(editor.element.value).toBe('Original Text')
  })
})


const historyMockClient = { id: 'c1', display_name: 'Jane Doe' }

it('offers last five and entire history and auto-fills editable period dates from the evidence window', async () => {
    clientDocs.listClientSummaryEvidence.mockResolvedValueOnce([
      { sessionId: 's1', occurredAt: '2026-10-29T10:00:00Z', reviewedAt: '2026-10-29T12:00:00Z' },
      { sessionId: 's2', occurredAt: '2026-10-22T10:00:00Z', reviewedAt: '2026-10-22T12:00:00Z' },
      { sessionId: 's3', occurredAt: '2026-10-15T10:00:00Z', reviewedAt: '2026-10-15T12:00:00Z' },
      { sessionId: 's4', occurredAt: '2026-10-08T10:00:00Z', reviewedAt: '2026-10-08T12:00:00Z' },
      { sessionId: 's5', occurredAt: '2026-10-01T10:00:00Z', reviewedAt: '2026-10-01T12:00:00Z' },
      { sessionId: 's6', occurredAt: '2026-09-24T10:00:00Z', reviewedAt: '2026-09-24T12:00:00Z' }
    ])

    const wrapper = mount(ClientDocumentComposer, {
      props: { client: historyMockClient, initialDocumentType: 'session_summary' },
      global: { stubs: { teleport: true, RichDocumentEditor: RichDocumentEditorStub } }
    })
    await flushPromises()

    const continuity = wrapper.findAll('select').find(select => select.text().includes('Last 5 reviewed sessions'))
    expect(continuity).toBeTruthy()
    expect(continuity.text()).toContain('Entire history')

    const dateValues = () => wrapper.findAll('input[type="date"]').map(input => input.element.value)
    expect(dateValues()).toEqual(['2026-10-15', '2026-10-29'])

    await continuity.setValue('last_five')
    await flushPromises()
    expect(continuity.element.value).toBe('last_five')
    expect(dateValues()).toEqual(['2026-10-01', '2026-10-29'])

    await continuity.setValue('history')
    await flushPromises()
    expect(continuity.element.value).toBe('history')
    expect(dateValues()).toEqual(['2026-09-24', '2026-10-29'])

    const dates = wrapper.findAll('input[type="date"]')
    await dates[0].setValue('2026-10-03')
    expect(wrapper.findAll('input[type="date"]')[0].element.value).toBe('2026-10-03')
    expect(wrapper.text()).toContain('Auto-filled from the selected evidence window. You can edit or clear either date.')
  })
