import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TranscriptAssignmentDialog from './TranscriptAssignmentDialog.vue'
const mocks=vi.hoisted(()=>({fetch:vi.fn(),sessions:vi.fn()}))
vi.mock('../../lib/api.js',()=>({authenticatedFetch:mocks.fetch}))
vi.mock('../../lib/sessions.js',()=>({listSessions:mocks.sessions}))
vi.mock('../../lib/clients.js',()=>({listClients:vi.fn().mockResolvedValue([])}))
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',version='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const source={id,clientId:'old',sessionId:'session',sourceVersion:version,updatedAt:'2026-11-12T12:00:00Z',occurredAt:'2026-11-11T10:00:00Z',text:'Original session transcript',affected:[],blocked:false}
const response=data=>({ok:true,json:async()=>({data})})
let wrapper
async function open(value=source){mocks.fetch.mockResolvedValueOnce(response(value));wrapper=mount(TranscriptAssignmentDialog,{props:{transcriptId:id,clients:[{id:'old',name:'Original client'},{id:'new',name:'Correct client'}]},attachTo:document.body,global:{stubs:{Teleport:true,RouterLink:{template:'<a><slot /></a>'}}}});await flushPromises();return wrapper}
beforeEach(()=>{vi.clearAllMocks();mocks.sessions.mockResolvedValue([])})
afterEach(()=>{wrapper?.unmount();document.body.innerHTML=''})
describe('assignment correction panel',()=>{
 it('shows all four actions with destructive action last and requires confirmation',async()=>{await open();expect(wrapper.findAll('input[type=radio]')).toHaveLength(4);expect(wrapper.text()).toContain('Detach and delete');expect(wrapper.findAll('button').find(b=>b.text()==='Assign to another client').attributes('disabled')).toBeDefined()})
 it('detaches and archives with checked version and shows saved result plus undo',async()=>{
  await open();await wrapper.find('input[value=detach_archive]').setValue();await wrapper.find('input[type=checkbox]').setValue(true)
  mocks.fetch.mockResolvedValueOnce(response({id,action:'detach_archive',sourceVersion:'next',updatedAt:'next',eventId:'event',canUndo:true}));await wrapper.findAll('button').find(b=>b.text()==='Detach and archive').trigger('click');await flushPromises()
  expect(JSON.parse(mocks.fetch.mock.calls[1][1].body)).toMatchObject({id,action:'detach_archive',sourceVersion:version,confirmed:true});expect(wrapper.text()).toContain('Detached and archived.');expect(wrapper.text()).toContain('Undo correction');expect(wrapper.emitted('changed')).toHaveLength(1)
 })
 it('shows failures in place and makes no success claim',async()=>{
  await open();await wrapper.find('input[value=detach]').setValue();await wrapper.find('input[type=checkbox]').setValue(true);mocks.fetch.mockResolvedValueOnce({ok:false,json:async()=>({error:{message:'This transcript changed. Nothing changed.'}})});await wrapper.findAll('button').find(b=>b.text()==='Detach and return to Inbox').trigger('click');await flushPromises();expect(wrapper.find('[role=alert]').text()).toContain('Nothing changed');expect(wrapper.emitted('changed')).toBeUndefined()
 })
 it('lists affected work and replaces move/delete actions with explicit review',async()=>{await open({...source,blocked:true,affected:[{kind:'document',label:'Approved clinical record',status:'final',count:1}]});expect(wrapper.text()).toContain('Approved clinical record');expect(wrapper.findAll('input[type=radio]')).toHaveLength(0);expect(wrapper.text()).toContain('Mark assignment incorrect and pause source use')})
 it('requires fresh attestation after the target changes',async()=>{await open();await wrapper.find('select').setValue('new');await flushPromises();await wrapper.find('input[type=checkbox]').setValue(true);await wrapper.find('input[value=detach]').setValue();expect(wrapper.find('input[type=checkbox]').element.checked).toBe(false)})
 it('restores keyboard focus when dismissed',async()=>{const button=document.createElement('button');document.body.append(button);button.focus();await open();await wrapper.trigger('keydown',{key:'Escape'});expect(wrapper.emitted('close')).toHaveLength(1);wrapper.unmount();await flushPromises();expect(document.activeElement).toBe(button)})
})
