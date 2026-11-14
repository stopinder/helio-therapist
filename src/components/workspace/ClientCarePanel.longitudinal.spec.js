import {describe,it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {ref} from 'vue'
import ClientCarePanel from './ClientCarePanel.vue'
const m=vi.hoisted(()=>({list:vi.fn(),generate:vi.fn(),save:vi.fn()}))
vi.mock('../../lib/clientCare.js',()=>({listClientCareItems:m.list,generateCareSuggestions:m.generate,saveReviewedCareItem:m.save,updateClientCareItem:vi.fn()}))
vi.mock('../../composables/useWhisperDictation.js',()=>({appendDictation:vi.fn(),useWhisperDictation:()=>({busy:ref(false),recording:ref(false),transcribing:ref(false),error:ref('')})}))
const click=async(w,text)=>{await w.findAll('button').find(b=>b.text()===text).trigger('click');await flushPromises()}
describe('history review acceptance',()=>{
 it('saves evidence and coverage with a replacement and does not retry an already-saved item after partial failure',async()=>{
  m.list.mockResolvedValue([{id:'old',kind:'learning',body:'Old',status:'current'}])
  const source={id:'session:a',sessionId:'a',occurredAt:'2026-10-02'}
  const coverage={selectedSessions:1,totalSessions:4,selectedSessionIds:['a'],reviewedAt:'2026-11-14'}
  m.generate.mockResolvedValue({sources:[source],coverage,suggestions:[{id:'one',kind:'learning',body:'New understanding',action:'update',targetItemId:'old',sourceIds:['session:a'],epistemic:'observation',promptVersion:'v2'},{id:'two',kind:'trying',body:'Proposed next step',action:'add',sourceIds:['session:a'],epistemic:'possible_next_step',promptVersion:'v2'}]})
  m.save.mockResolvedValueOnce({id:'new',kind:'learning',body:'New understanding',status:'current'}).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({id:'next',kind:'trying',body:'Proposed next step',status:'current'})
  const w=mount(ClientCarePanel,{props:{clientId:'client'},global:{stubs:{HelpLink:true,WhisperMicButton:true}}})
  await flushPromises();await click(w,'Review with Helios');await click(w,'Review Therapy Focus')
  expect(m.generate.mock.calls[0][0].window).toBe('history')
  expect(w.text()).toContain('1 of 4 recorded sessions included')
  await click(w,'Accept');await click(w,'Save 1 accepted change')
  expect(m.save.mock.calls[0][0]).toMatchObject({replacesId:'old',evidence:{sources:[source],coverage}})
  expect(w.text()).toContain('Earlier Therapy Focus')
  await click(w,'Accept');await click(w,'Save 1 accepted change')
  expect(w.text()).toContain('could not be saved')
  await click(w,'Save 1 accepted change')
  expect(m.save.mock.calls.filter(([p])=>p.replacesId==='old')).toHaveLength(1)
 })
})
