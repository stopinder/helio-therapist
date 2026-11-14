import {describe,it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {ref} from 'vue'
import CurrentCareFocus from './CurrentCareFocus.vue'
const mocks=vi.hoisted(()=>({list:vi.fn()}))
vi.mock('../../lib/clientCare.js',()=>({listClientCareItems:mocks.list,createClientCareItem:vi.fn()}))
vi.mock('../../lib/clients.js',()=>({updateClientFocus:vi.fn()}))
vi.mock('../../composables/useWhisperDictation.js',()=>({appendDictation:vi.fn(),useWhisperDictation:()=>({busy:ref(false),recording:ref(false),transcribing:ref(false),error:ref('')})}))
describe('longitudinal Therapy Focus overview',()=>{
 it('renders change, learning, coverage and honest missing evidence without hiding older categories',async()=>{
  mocks.list.mockResolvedValue(['trying','trying','current_focus','shared_understanding','change_noticed'].map((kind,i)=>({id:String(i),kind,status:'current',body:`Clinical ${kind}`})))
  const w=mount(CurrentCareFocus,{props:{client:{id:'a'},sessions:[{id:'s'}]},global:{stubs:{WhisperMicButton:true}}})
  await flushPromises()
  expect(w.text()).toContain('Clinical change_noticed')
  expect(w.text()).toContain('No learning from the work has been recorded yet.')
  expect(w.text()).toContain('Evidence coverage not recorded')
  expect(w.text()).toContain('+ 1 more')
  expect(w.text()).toContain('No dated history review')
 })
 it('does not present a loading failure as an empty clinical record',async()=>{
  mocks.list.mockRejectedValue(new Error('offline'))
  const w=mount(CurrentCareFocus,{props:{client:{id:'a'}},global:{stubs:{WhisperMicButton:true}}})
  await flushPromises()
  expect(w.get('[role="alert"]').text()).toContain('could not be loaded')
  expect(w.text()).not.toContain('No Therapy Focus has been established')
 })
})
