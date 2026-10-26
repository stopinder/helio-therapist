import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import ClientDocumentComposer from '../ClientDocumentComposer.vue'
import * as clientDocs from '../../../lib/clientDocuments.js'

vi.mock('../../../lib/clientDocuments.js', () => ({
  createClientDocumentDraft: vi.fn(), downloadClientDocument: vi.fn(), finaliseClientDocument: vi.fn(),
  generatePreparedDocument: vi.fn(),
  previewPreparedDocument: vi.fn(() => Promise.resolve({ sourceVersion: 'fixture-hash', sessionCount: 1, sources: [], warnings: [] })),
  listDocumentPreparationSessions: vi.fn(() => Promise.resolve({ availableSessions: [{ sessionId: '00000000-0000-4000-8000-000000000001', occurredAt: '2026-10-01T10:00:00Z', reviewedAt: '2026-10-02T10:00:00Z', linkedTranscripts: [] }] })),
  listDocumentSourceSessions: vi.fn(() => Promise.resolve([])), saveClientDocumentDraft: vi.fn()
}))
vi.mock('../../../lib/documentProfile.js', () => ({
  loadDocumentProfile: vi.fn(() => Promise.resolve({ full_name: 'Test Therapist' })),
  profileDisplay: vi.fn(() => ({ heading: 'Test Therapist', contactLines: [], footer: 'Helios' }))
}))
const RichDocumentEditorStub = {
  props: ['modelValue', 'editable'], emits: ['update:modelValue'],
  template: '<textarea data-testid="rich-document-editor-stub" :disabled="editable === false" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}
const mockClient = { id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc', display_name: 'Fictional client' }
const mockDocument = { id: 'd1', title: 'Test Draft', status: 'draft', documentType: 'other', content: { body: 'Draft body text' } }
const mounted = []
function mountComposer(props = {}) {
  // Exercise real Teleport; stubbing its slots can remount the child on busy updates.
  mounted.push(mount(ClientDocumentComposer, { attachTo: document.body,
    props: { client: mockClient, ...props }, global: { stubs: { HelpLink: true, RichDocumentEditor: RichDocumentEditorStub } } }))
  return new DOMWrapper(document.body)
}
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('confirm', vi.fn(() => true)) })
afterEach(() => { mounted.splice(0).forEach(w => w.unmount()); document.body.replaceChildren(); vi.unstubAllGlobals() })

describe('ClientDocumentComposer', () => {
  it('renders loading state initially', () => {
    const w = mountComposer()
    expect(w.find('[data-testid="client-document-composer"]').exists()).toBe(true)
    expect(w.text()).toContain('Loading document workspace')
  })
  it('renders editable workspace when loaded', async () => {
    const w = mountComposer({ document: mockDocument }); await flushPromises()
    expect(w.text()).toContain('Edit client document')
    expect(w.find('[data-testid="rich-document-editor-stub"]').element.value).toBe('Draft body text')
    expect(w.findAll('button').some(b => b.text() === 'Save Draft')).toBe(true)
  })
  it('renders finalised state without an editable canvas', async () => {
    const w = mountComposer({ document: { ...mockDocument, status: 'completed', finalizedAt: '2026-09-14T12:00:00Z' } }); await flushPromises()
    expect(w.text()).toContain('Document Finalised')
    expect(w.text()).toContain('PDF finalised and saved')
    expect(w.findAll('button').some(b => b.text() === 'Download PDF')).toBe(true)
    expect(w.find('[data-testid="rich-document-editor-stub"]').exists()).toBe(false)
  })
  it('handles session summary specific UI', async () => {
    const w = mountComposer({ initialDocumentType: 'session_summary' }); await flushPromises()
    expect(w.text()).toContain('Client-facing summary')
    expect(w.findAll('button').some(b => b.text().includes('Generate client summary'))).toBe(true)
  })
  it('preserves edited text and displays generation failure', async () => {
    clientDocs.generatePreparedDocument.mockRejectedValue(new Error('AI failed'))
    const w = mountComposer({ initialDocumentType: 'session_summary' }); await flushPromises()
    const editor = w.find('[data-testid="rich-document-editor-stub"]')
    await editor.setValue('Original Text'); await flushPromises()
    const button = w.find('[data-testid="generate-prepared-document"]')
    await vi.waitFor(() => expect(button.element.disabled).toBe(false))
    await button.trigger('click'); await flushPromises()
    expect(clientDocs.generatePreparedDocument).toHaveBeenCalledTimes(1)
    expect(w.text()).toContain('AI failed')
    expect(editor.element.value).toBe('Original Text')
    expect(editor.element.disabled).toBe(false)
  })
})
