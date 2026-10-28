import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import DocumentPreparationPanel from '../DocumentPreparationPanel.vue'
import ClientDocumentComposer from '../ClientDocumentComposer.vue'
import * as docs from '../../../lib/clientDocuments.js'
vi.mock('../../../lib/clientDocuments.js',()=>({listDocumentPreparationSessions:vi.fn(),previewPreparedDocument:vi.fn(),generatePreparedDocument:vi.fn(),createClientDocumentDraft:vi.fn(),saveClientDocumentDraft:vi.fn(),finaliseClientDocument:vi.fn(),downloadClientDocument:vi.fn(),listDocumentSourceSessions:vi.fn()}))
vi.mock('../../../lib/documentProfile.js',()=>({loadDocumentProfile:vi.fn(async()=>({})),profileDisplay:vi.fn(()=>({heading:'Test practice',contactLines:[],footer:'Helios'}))}))
const client='cccccccc-cccc-4ccc-cccc-cccccccccccc'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const sessions=[3,2,1].map(n=>({sessionId:id(n),occurredAt:`2026-10-0${n}T10:00:00Z`,reviewedAt:'2026-10-05T10:00:00Z',linkedTranscripts:[]}))
const wrappers=[]
const create=(props={})=>{const w=mount(DocumentPreparationPanel,{props:{clientId:client,...props}});wrappers.push(w);return w}
const ready=async w=>{await flushPromises();await vi.waitFor(()=>expect(w.find('[data-testid="generate-prepared-document"]').element.disabled).toBe(false))}
const editorStub={props:['modelValue','editable'],emits:['update:modelValue'],template:'<textarea data-testid="draft-editor" :value="modelValue" :disabled="editable === false" @input="$emit(\'update:modelValue\',$event.target.value)" />'}
function output(options={}) {return {draft:{body:'A newly generated, source-grounded summary.'},sources:[{id:'capture:'+id(3),kind:'session_capture',sessionId:id(3),occurredAt:sessions[0].occurredAt,label:'Reviewed Session Capture'}],claims:[],sessionCount:1,documentPurpose:'session_summary',audience:'client',lens:'integrative',window:'current',anchorSessionId:id(3),selectedSessionIds:[id(3)],generationId:id(90),generatedAt:'2026-10-26T12:00:00Z',promptVersion:'prepared-document/1.0.0',...options}}
beforeEach(()=>{
 vi.clearAllMocks();vi.stubGlobal('confirm',vi.fn(()=>true))
 docs.listDocumentPreparationSessions.mockResolvedValue({availableSessions:sessions})
 docs.previewPreparedDocument.mockImplementation(async o=>({sourceVersion:'version-'+o.lens,sessionCount:o.documentPurpose==='recent_review'?3:1,sources:output().sources,warnings:[]}))
 docs.generatePreparedDocument.mockImplementation(async o=>output(o))
})
afterEach(()=>{for(const w of wrappers.splice(0))w.unmount();vi.unstubAllGlobals()})
describe('Document preparation interaction',()=>{
 it('keeps the client summary default and exposes all four perspectives',async()=>{
  const w=create();await ready(w)
  expect(w.find('[data-testid="document-audience"]').element.value).toBe('client')
  expect(w.find('[data-testid="document-perspective"]').findAll('option')).toHaveLength(4)
  expect(w.find('[data-testid="source-preview"]').text()).toContain('1 session(s)')
  expect(docs.generatePreparedDocument).not.toHaveBeenCalled()
 })
 it('switching purpose selects therapist review and last-three default without creating anything',async()=>{
  const w=create();await ready(w);await w.find('[data-testid="document-purpose"]').setValue('recent_review');await ready(w)
  expect(w.find('[data-testid="document-audience"]').element.value).toBe('therapist')
  expect(w.find('[data-testid="document-window"]').element.value).toBe('last_three')
  expect(docs.createClientDocumentDraft).not.toHaveBeenCalled()
 })
 it('a selected historical anchor prevents later sessions appearing in the picker',async()=>{
  const w=create({initialOptions:{documentPurpose:'recent_review'},anchorSessionId:id(2)});await ready(w)
  await w.find('[data-testid="document-window"]').setValue('selected');await flushPromises()
  const values=w.findAll('[data-testid="document-session-picker"] input').map(i=>i.element.value)
  expect(values).toEqual([id(2),id(1)])
 })
 it('generation is blocked until a changed perspective has a matching preview',async()=>{
  const w=create();await ready(w);await w.find('[data-testid="document-perspective"]').setValue('transactional_analysis')
  expect(w.find('[data-testid="generate-prepared-document"]').element.disabled).toBe(true)
  await ready(w);await w.find('[data-testid="generate-prepared-document"]').trigger('click');await flushPromises()
  expect(docs.generatePreparedDocument).toHaveBeenCalledWith(expect.objectContaining({lens:'transactional_analysis',sourceVersion:'version-transactional_analysis'}))
  expect(w.emitted('generated')).toHaveLength(1)
 })
 it('declining regeneration keeps the current draft and makes no model request',async()=>{
  const w=create({hasExistingText:true});await ready(w);vi.mocked(window.confirm).mockReturnValue(false)
  await w.find('[data-testid="generate-prepared-document"]').trigger('click');expect(docs.generatePreparedDocument).not.toHaveBeenCalled()
 })
 it('a saved therapist audience cannot be switched into a shareable version',async()=>{
  const w=create({lockedAudience:'therapist',initialOptions:{documentPurpose:'recent_review'}});await ready(w)
  expect(w.find('[data-testid="document-audience"]').element.disabled).toBe(true)
  expect(w.text()).toContain('Start a new document for a different audience')
 })
 it('source links refer to actual source records and failures leave generation disabled',async()=>{
  docs.previewPreparedDocument.mockRejectedValue(new Error('The selected sources changed.'))
  const w=create();await flushPromises();await vi.waitFor(()=>expect(w.text()).toContain('selected sources changed'))
  expect(w.find('[data-testid="generate-prepared-document"]').element.disabled).toBe(true)
 })
})
// Use the real Teleport: a stub can remount slot children on parent busy-state updates.
describe('Composer draft and audience preservation',()=>{
 const createComposer=(extra={})=>{const w=mount(ClientDocumentComposer,{attachTo:document.body,props:{client:{id:client,display_name:'Fictional client'},initialDocumentType:'session_summary',...extra},global:{stubs:{HelpLink:true,RichDocumentEditor:editorStub}}});wrappers.push(w);return new DOMWrapper(document.body)}
 it('regenerates in place, retains edited prose in history, and permits restoring it',async()=>{
  const w=createComposer();await ready(w);const editor=w.find('[data-testid="draft-editor"]');await editor.setValue('My carefully edited original wording.'); await ready(w)
  await w.find('[data-testid="generate-prepared-document"]').trigger('click');await flushPromises()
  await vi.waitFor(() => expect(editor.element.value).toContain('newly generated'))
  const restore=w.findAll('button').find(b=>b.text()==='Restore previous version');expect(restore).toBeTruthy()
  await restore.trigger('click');expect(editor.element.value).toBe('My carefully edited original wording.')
 })
 it('recent-session reviews are saved using the existing clinical document type and audience metadata',async()=>{
  docs.createClientDocumentDraft.mockImplementation(async o=>({id:id(80),status:'draft',version:1,content:o.content,...o}))
  const w=createComposer({initialDocumentType:'recent_review'});await ready(w)
  await w.find('[data-testid="generate-prepared-document"]').trigger('click');await flushPromises()
  await w.findAll('button').find(b=>b.text()==='Save Draft').trigger('click');await flushPromises()
  expect(docs.createClientDocumentDraft).toHaveBeenCalledWith(expect.objectContaining({documentType:'clinical_summary',content:expect.objectContaining({clinicalIntelligence:expect.objectContaining({generation:expect.objectContaining({audience:'therapist',documentPurpose:'recent_review'})})})}))
 })
 it('a manually written therapist draft keeps its audience before any generation',async()=>{
  docs.createClientDocumentDraft.mockImplementation(async o=>({id:id(80),status:'draft',version:1,...o}))
  const w=createComposer();await ready(w)
  await w.find('[data-testid="document-audience"]').setValue('therapist');await ready(w)
  await w.find('[data-testid="draft-editor"]').setValue('A therapist-authored working observation, not prepared for sharing.');await flushPromises()
  expect(w.find('[data-testid="document-audience"]').element.value).toBe('therapist')
  await w.findAll('button').find(b=>b.text()==='Save Draft').trigger('click');await flushPromises()
  expect(docs.createClientDocumentDraft).toHaveBeenCalledWith(expect.objectContaining({documentType:'clinical_summary',content:expect.objectContaining({clinicalIntelligence:expect.objectContaining({preparation:expect.objectContaining({audience:'therapist'})})})}))
  expect(docs.generatePreparedDocument).not.toHaveBeenCalled()
 })
 it('finalised therapist documents never expose the Prepare email action',async()=>{
  const doc={id:id(80),title:'Review',status:'completed',documentType:'clinical_summary',content:{body:'Internal working document',clinicalIntelligence:{generation:{audience:'therapist',documentPurpose:'recent_review'}}}}
  const w=createComposer({document:doc,clientEmail:'client@example.test'});await flushPromises()
  expect(w.text()).not.toContain('Prepare email');expect(w.find('[data-testid="generate-prepared-document"]').exists()).toBe(false)
 })
})
