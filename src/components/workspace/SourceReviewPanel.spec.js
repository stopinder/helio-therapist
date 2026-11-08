import { describe,it,expect,beforeEach,vi } from 'vitest'
import { mount,flushPromises } from '@vue/test-utils'
import SourceReviewPanel from './SourceReviewPanel.vue'
import { authenticatedFetch } from '../../lib/api.js'
import { listClients } from '../../lib/clients.js'
vi.mock('../../lib/api.js',()=>({authenticatedFetch:vi.fn()}))
vi.mock('../../lib/clients.js',()=>({listClients:vi.fn()}))
const clientId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const sessionId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const sourceVersion='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const note='The client discussed relationship worries, responsibilities and sleep.'
function setup({text='',evidence=[]}={}){
  listClients.mockResolvedValue([{id:clientId,display_name:'Synthetic Client'}])
  authenticatedFetch.mockImplementation(async (url,options)=>({
    ok:true,
    json:async()=>String(url).startsWith('/api/zoom/source-review?id=')
      ? {data:{id:sourceVersion,sourceVersion,clientId,sessionId,text,zoomNote:note,evidence,state:'needs_review',occurredAt:new Date().toISOString()}}
      : {data:{review:{state:'confirmed'},sourceVersion}}
  }))
}
describe('note-first source review',()=>{
 beforeEach(()=>vi.resetAllMocks())
 it('shows a Zoom note first and enables confirmation after explicit therapist acknowledgement',async()=>{
   setup()
   const w=mount(SourceReviewPanel,{props:{transcriptId:sourceVersion,embedded:true},global:{stubs:{RouterLink:true}}})
   await flushPromises()
   expect(w.find('[data-testid="review-zoom-note"]').exists()).toBe(true)
   expect(w.find('[data-testid="review-original-transcript"]').exists()).toBe(false)
   expect(w.find('[data-testid="source-review-optional-context"]').exists()).toBe(true)
   expect(w.find('textarea[maxlength="3900"]').element.value).toBe('')
   const confirm=w.findAll('button').find(button=>button.text().includes('Confirm this encounter'))
   expect(confirm.attributes('disabled')).toBeDefined()
   await w.find('input[type="checkbox"]').setValue(true)
   expect(confirm.attributes('disabled')).toBeUndefined()
   await confirm.trigger('click')
   await flushPromises()
   const post=authenticatedFetch.mock.calls.find(([url,opts])=>url==='/api/zoom/source-review'&&opts?.method==='POST')
   expect(post).toBeDefined()
   expect(JSON.parse(post[1].body)).toMatchObject({action:'confirm',reviewed:true,context:''})
   expect(w.emitted('resolved')?.length).toBe(1)
   w.unmount()
 })
 it('preserves an optional participant note when the therapist chooses to add one',async()=>{
   setup({text:'Therapist: Hello.\\nClient: A single encounter about work.'})
   const w=mount(SourceReviewPanel,{props:{transcriptId:sourceVersion,embedded:true},global:{stubs:{RouterLink:true}}})
   await flushPromises()
   await w.find('textarea[maxlength="3900"]').setValue('The mention of a partner describes Ben’s account, not another appointment.')
   await w.find('input[type="checkbox"]').setValue(true)
   await w.findAll('button').find(button=>button.text().includes('Confirm this encounter')).trigger('click')
   const post=authenticatedFetch.mock.calls.find(([url,opts])=>url==='/api/zoom/source-review'&&opts?.method==='POST')
   expect(JSON.parse(post[1].body).context).toContain('another appointment')
   w.unmount()
 })
 it('keeps primary-transcript evidence visible but does not require arbitrary filler text',async()=>{
   setup({text:'Therapist: Can you explain?\nClient: This is one encounter.',evidence:[{sourceType:'transcript',verified:true,quote:'Client: This is one encounter.'}]})
   const w=mount(SourceReviewPanel,{props:{transcriptId:sourceVersion,embedded:true},global:{stubs:{RouterLink:true}}})
   await flushPromises()
   expect(w.find('[data-testid="review-original-transcript"]').exists()).toBe(true)
   expect(w.find('textarea[maxlength="3900"]').element.value).toBe('')
   expect(w.text()).toContain('Review it above before confirming')
   const confirm=w.findAll('button').find(button=>button.text().includes('Confirm this encounter'))
   expect(confirm.attributes('disabled')).toBeDefined()
   await w.find('input[type="checkbox"]').setValue(true)
   expect(confirm.attributes('disabled')).toBeUndefined()
   await confirm.trigger('click')
   const post=authenticatedFetch.mock.calls.find(([url,opts])=>url==='/api/zoom/source-review'&&opts?.method==='POST')
   expect(JSON.parse(post[1].body).context).toBe('')
   w.unmount()
 })
})
