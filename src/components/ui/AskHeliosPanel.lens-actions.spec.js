import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, config } from '@vue/test-utils'
import AskHeliosPanel from './AskHeliosPanel.vue'
import { useAskHelios } from '../../composables/useAskHelios.js'
import * as api from '../../lib/api.js'
vi.mock('../../lib/api.js')
config.global.stubs['router-link'] = true
const ok = body => ({ ok:true, json: async()=>({success:true,...body}) })
const clientId = 'cccccccc-cccc-4ccc-cccc-cccccccccccc'
const sessionId = 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee'
describe('Ask Helios lens provenance and answer controls',()=>{
  let ask
  beforeEach(async()=>{
    vi.clearAllMocks()
    ask=useAskHelios()
    ask.setMode('research')
    ask.clearConversation()
    if(ask.isExpanded.value)ask.toggleExpand()
    if(!ask.isPanelOpen.value)ask.togglePanel()
    vi.spyOn(api,'authenticatedFetch').mockImplementation(async url=>{
      if(url==='/api/ai/assist') return ok({answer:'TA analysis',conversationId:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',clinicalContext:{lens:'transactional_analysis',window:'last_three',clientId,clientName:'Synthetic client',sourceCount:3}})
      return ok({conversations:[],clients:[]})
    })
    await ask.openClinicalContext({clientId,clientName:'Synthetic client',anchorSessionId:sessionId,window:'last_three',lens:'internal_family_systems'})
  })
  it('keeps generated provenance and provides accessible Copy Edit Regenerate Focus actions',async()=>{
    ask.addMessage({role:'user',content:'What pattern is emerging?'})
    ask.addMessage({role:'assistant',content:'IFS formulation',generatedLens:'internal_family_systems',generatedWindow:'last_three'})
    ask.setClinicalContext({lens:'transactional_analysis'})
    const w=mount(AskHeliosPanel)
    expect(w.text()).toContain('Generated with IFS')
    expect(w.text()).toContain('Previous perspective')
    expect(w.find('[aria-label="Copy answer 1"]').exists()).toBe(true)
    expect(w.find('[aria-label="Edit answer 1"]').exists()).toBe(true)
    expect(w.find('[aria-label="Regenerate answer 1"]').exists()).toBe(true)
    await w.find('[aria-label="Edit answer 1"]').trigger('click')
    await w.find('textarea[maxlength="12000"]').setValue('Therapist correction')
    await w.findAll('button').find(x=>x.text()==='Use edited copy').trigger('click')
    expect(w.text()).toContain('Therapist correction')
    expect(ask.messages.value[1].content).toBe('IFS formulation')
    await w.find('[aria-label="Regenerate answer 1"]').trigger('click')
    await vi.waitFor(()=>expect(ask.messages.value.some(m=>m.role==='assistant'&&m.content==='TA analysis')).toBe(true))
    const sent=api.authenticatedFetch.mock.calls.find(([url])=>url==='/api/ai/assist')
    const payload=JSON.parse(sent[1].body)
    expect(payload.history).toEqual([])
    expect(payload.clinicalContext.lens).toBe('transactional_analysis')
    expect(payload.query).toBe('What pattern is emerging?')
    expect(w.text()).toContain('Generated with TA')
    w.unmount()
  })
})
