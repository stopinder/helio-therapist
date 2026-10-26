import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Workbench from '../InlineDocumentWorkbench.vue'
import Panel from '../DocumentPreparationPanel.vue'
import * as docs from '../../../lib/clientDocuments.js'
vi.mock('vue-router', () => ({ onBeforeRouteLeave: vi.fn() }))
vi.mock('../../../lib/clientDocuments.js', () => ({ createClientDocumentDraft: vi.fn(), saveClientDocumentDraft: vi.fn() }))
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
const props = { client: { id: id(99), display_name: 'Fictional client' }, anchorSessionId: id(3) }
const panelStub = { props: ['initialOptions', 'lockedAudience'], emits: ['generated', 'busy', 'options-change'], template: '<div data-testid="preparation-stub" />' }
const wrappers = []
function create() { const w = mount(Workbench, { props, global: { stubs: { DocumentPreparationPanel: panelStub } } }); wrappers.push(w); return w }
function result(purpose = 'working_formulation', audience = 'therapist') {
  return { draft: { body: purpose === 'working_formulation' ? 'PRIVATE HYPOTHESIS - provisional therapist formulation.' : 'A newly prepared client summary.' },
    generationId: id(50), generatedAt: '2026-10-26T10:00:00Z', documentPurpose: purpose, audience, lens: 'gentle_cbt', window: 'last_three',
    anchorSessionId: id(3), selectedSessionIds: [id(3), id(2)], sessionCount: 2, includeCare: true,
    sourceVersion: 'fixture-source', promptVersion: 'prepared-document/2.0.0', model: 'fixture',
    sources: [3, 2].map(n => ({ id: 'capture:' + id(n), sessionId: id(n), occurredAt: `2026-10-0${n}T10:00:00Z`, kind: 'session_capture', label: 'Reviewed Session Capture', url: '/clients/' + id(99) + '/sessions/' + id(n) })), claims: [] }
}
async function generated(w, value = result()) { w.findComponent(Panel).vm.$emit('generated', value); await flushPromises() }
const button = (w, text) => w.findAll('button').find(b => b.text() === text)
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('confirm', vi.fn(() => true))
  docs.createClientDocumentDraft.mockImplementation(async payload => ({ ...payload, id: id(70 + docs.createClientDocumentDraft.mock.calls.length), version: 1, status: 'draft', clientId: props.client.id }))
  docs.saveClientDocumentDraft.mockImplementation(async (record, payload) => ({ ...record, ...payload, version: record.version + 1 }))
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.unstubAllGlobals() })
describe('inline document workbench', () => {
  it('is an inline region, not a modal, and does not save on generation', async () => {
    const w = create(); expect(w.find('[role="dialog"]').exists()).toBe(false)
    await generated(w)
    expect(w.get('[data-testid="inline-draft-text"]').element.value).toContain('PRIVATE HYPOTHESIS')
    expect(docs.createClientDocumentDraft).not.toHaveBeenCalled()
  })
  it('saves a formulation as an internal clinical document with source metadata', async () => {
    const w = create(); await generated(w); await button(w, 'Save draft').trigger('click'); await flushPromises()
    expect(docs.createClientDocumentDraft).toHaveBeenCalledWith(expect.objectContaining({ documentType: 'clinical_summary',
      content: expect.objectContaining({ clinicalIntelligence: expect.objectContaining({ generation: expect.objectContaining({ audience: 'therapist', documentPurpose: 'working_formulation' }) }) }) }))
    expect(w.emitted('saved')).toHaveLength(1)
    expect(w.text()).not.toContain('Prepare email')
  })
  it('preserves edited prose through regeneration and restoration', async () => {
    const w = create(); await generated(w); await w.get('textarea').setValue('My edited formulation.')
    await generated(w, { ...result(), draft: { body: 'Replacement wording.' } })
    await button(w, 'Restore previous version').trigger('click')
    expect(w.get('textarea').element.value).toBe('My edited formulation.')
  })
  it('a client summary starts empty with safe selection metadata, never internal prose', async () => {
    const w = create(); await generated(w)
    await w.get('textarea').setValue('My private hypothesis and supervision reflection.')
    await button(w, 'Prepare a separate client summary').trigger('click'); await flushPromises()
    expect(w.find('textarea').exists()).toBe(false)
    const seed = w.findComponent(Panel).props('initialOptions')
    expect(seed).toMatchObject({ audience: 'client', includeCare: false, therapistGuidance: '', window: 'selected', selectedSessionIds: [id(3), id(2)] })
    expect(JSON.stringify(seed)).not.toMatch(/private|HYPOTHESIS|supervision/)
    expect(docs.createClientDocumentDraft).not.toHaveBeenCalled()
    await button(w, 'Back to internal formulation').trigger('click'); await flushPromises()
    expect(w.get('textarea').element.value).toContain('My private hypothesis')
  })
  it('saving a client summary creates a new record without replacing the saved formulation', async () => {
    const w = create(); await generated(w); await button(w, 'Save draft').trigger('click'); await flushPromises()
    const first = docs.createClientDocumentDraft.mock.calls[0][0]
    await button(w, 'Prepare a separate client summary').trigger('click'); await generated(w, result('recent_review', 'client'))
    await button(w, 'Save draft').trigger('click'); await flushPromises()
    expect(docs.createClientDocumentDraft).toHaveBeenCalledTimes(2)
    expect(docs.saveClientDocumentDraft).not.toHaveBeenCalled()
    expect(docs.createClientDocumentDraft.mock.calls[1][0].content.body).not.toContain('PRIVATE HYPOTHESIS')
    await button(w, 'Back to internal formulation').trigger('click'); await flushPromises()
    expect(w.get('textarea').element.value).toBe(first.content.body)
  })
  it('a failed save retains the draft and exposes the error', async () => {
    docs.createClientDocumentDraft.mockRejectedValue(new Error('Version conflict. Reopen the record.'))
    const w = create(); await generated(w); await button(w, 'Save draft').trigger('click'); await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('Version conflict')
    expect(w.get('textarea').element.value).toContain('PRIVATE HYPOTHESIS')
  })
  it('closing an unsaved draft requires confirmation', async () => {
    const w = create(); await generated(w); vi.mocked(window.confirm).mockReturnValue(false)
    await button(w, 'Close options').trigger('click'); expect(w.emitted('close')).toBeUndefined()
    vi.mocked(window.confirm).mockReturnValue(true)
    await button(w, 'Close options').trigger('click'); expect(w.emitted('close')).toHaveLength(1)
  })
})
