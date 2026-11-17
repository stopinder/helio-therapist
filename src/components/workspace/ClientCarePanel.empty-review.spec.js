import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import ClientCarePanel from './ClientCarePanel.vue'
const m=vi.hoisted(()=>({list:vi.fn(),generate:vi.fn(),save:vi.fn()}))
vi.mock('../../lib/clientCare.js',()=>({listClientCareItems:m.list,generateCareSuggestions:m.generate,saveReviewedCareItem:m.save,updateClientCareItem:vi.fn()}))
vi.mock('../../composables/useWhisperDictation.js',()=>({appendDictation:vi.fn(),useWhisperDictation:()=>({busy:ref(false),recording:ref(false),transcribing:ref(false),error:ref('')})}))
const mountPanel=async(props={})=>{const w=mount(ClientCarePanel,{props:{clientId:'fictional',...props},global:{stubs:{HelpLink:true,WhisperMicButton:true}}});await flushPromises();return w}
const click=async(w,label)=>{const b=w.findAll('button').find(b=>b.text()===label);expect(b,`Missing ${label}`).toBeTruthy();await b.trigger('click');await flushPromises()}
beforeEach(()=>{vi.clearAllMocks();m.list.mockResolvedValue([]);m.generate.mockResolvedValue({sources:[{id:'session:a',sessionId:'a',occurredAt:'2026-11-01'}],coverage:{selectedSessions:1,totalSessions:1},suggestions:[]})})
describe('empty Therapy Focus review',()=>{
 it('uses the preferred Clinical lens and builds an initial Focus instead of asking for changes',async()=>{
  const w=await mountPanel({initialLensId:'clinical'})
  expect(w.find('#lens-selector').element.value).toBe('clinical')
  await click(w,'Build from session history')
  expect(w.findAll('select')[2].element.value).toBe('fill_empty')
  await click(w,'Build Therapy Focus')
  expect(m.generate).toHaveBeenCalledWith(expect.objectContaining({lensId:'clinical',reviewGoal:'fill_empty',sourceMode:'history'}))
  expect(w.text()).toContain('Therapy Focus is still empty')
  expect(w.text()).not.toContain('No supported additions or meaningful changes were identified')
  expect(m.save).not.toHaveBeenCalled()
  expect(w.find('details summary').text()).toContain('1 session source')
 })
 it('shows a failed review as an error rather than no supported changes',async()=>{
  m.generate.mockRejectedValue(new Error('Helios could not prepare Therapy Focus suggestions just now. Nothing has been saved.'))
  const w=await mountPanel();await click(w,'Build from session history');await click(w,'Build Therapy Focus')
  expect(w.text()).toContain('could not prepare Therapy Focus suggestions')
  expect(w.text()).not.toContain('No supported changes were proposed')
  expect(w.text()).not.toContain('did not return a supported starting point')
 })
 it('keeps legacy entries visible under all five perspectives without modifying them',async()=>{
  const old={id:'old',kind:'narrative',body:'Existing therapist formulation',status:'current'}
  m.list.mockResolvedValue([old])
  const w=await mountPanel()
  for(const lens of ['clinical','integrative','gentle_cbt','internal_family_systems','transactional_analysis']){
   await w.find('#lens-selector').setValue(lens)
   expect(w.text()).toContain(old.body)
  }
  expect(old.kind).toBe('narrative');expect(m.save).not.toHaveBeenCalled()
  await click(w,'Review with Helios');await click(w,'Review Therapy Focus')
  expect(m.generate).toHaveBeenCalledWith(expect.objectContaining({reviewGoal:'review_updates'}))
 })
})
