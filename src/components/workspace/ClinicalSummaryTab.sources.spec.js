import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ClinicalSummaryTab from './ClinicalSummaryTab.vue';
import { inspectClinicalRecordMaterial, suggestClinicalRecordFields } from '../../lib/clinicalRecordSuggestions.js';
vi.mock('../../lib/clinicalRecordSuggestions.js',()=>({inspectClinicalRecordMaterial:vi.fn(),suggestClinicalRecordFields:vi.fn()}));
vi.mock('../../lib/sessions.js',()=>({saveSessionDraft:vi.fn(),completeSessionRecord:vi.fn()}));
vi.mock('../../lib/sessionCaptures.js',()=>({getSessionCapture:vi.fn().mockResolvedValue(null)}));
vi.mock('../../composables/useWhisperDictation.js',async()=>{const {ref}=await import('vue');return{appendDictation:(a,b)=>a+b,useWhisperDictation:()=>({busy:ref(false),recording:ref(false),transcribing:ref(false),error:ref('')})}});
const sessionId='11111111-1111-4111-8111-111111111111',clientId='22222222-2222-4222-8222-222222222222';
const clinical=`record:${sessionId}`,privateId='reflection:33333333-3333-4333-8333-333333333333';
const stubs={StatusBadge:true,ClinicalWorkflowIndicator:true,ClinicalRecordMetadata:true,RecordHistoryPanel:true,ApprovalConfirmationDialog:true,ApprovedClinicalRecordView:true,NoticeBanner:true,WhisperMicButton:true};
function inventory(){return{clientId,sessionId,sessionsChecked:9,sources:[{id:clinical,title:'Saved therapist notes',kind:'therapist_notes',reviewStatus:'working draft',sessionId,preview:'Therapist notes about the encounter.'},{id:privateId,title:'Private therapist reflection',kind:'private_reflection',reviewStatus:'private working material',sessionId,preview:'Therapist uncertainty about their response.',requiresSelection:true}],unavailable:[{id:'transcript:unreviewed',title:'Session transcript',sessionId,reason:'Confirm the assigned client and source before reusing its transcript.'}]}}
describe('Clinical Record source choices',()=>{
  beforeEach(()=>{vi.clearAllMocks();inspectClinicalRecordMaterial.mockResolvedValue(inventory());suggestClinicalRecordFields.mockResolvedValue({clientId,sessionId,fields:{},sources:[],fieldResults:{},availableSourceCount:2});HTMLElement.prototype.scrollIntoView=vi.fn()});
  it('checks actual material, keeps private reflection unselected and sends the therapist’s explicit choices',async()=>{
    const wrapper=mount(ClinicalSummaryTab,{props:{session:{id:sessionId,clientId,status:'in_progress',notes:''}},global:{stubs}});
    await flushPromises();
    expect(wrapper.text()).toContain('2 usable sources found across 9 encounters');
    expect(wrapper.text()).not.toContain('Source Material Checklist');
    const boxes=wrapper.findAll('[data-testid="clinical-record-source-list"] input[type="checkbox"]');
    expect(boxes[0].element.checked).toBe(true);expect(boxes[1].element.checked).toBe(false);
    expect(wrapper.findAll('a').some(link=>link.attributes('href').includes('#therapist-reflection'))).toBe(true);
    await boxes[1].setValue(true);
    const prepare=wrapper.findAll('button').find(button=>button.text()==='Prepare from existing material');
    await prepare.trigger('click');await flushPromises();
    expect(suggestClinicalRecordFields).toHaveBeenLastCalledWith({clientId,sessionId,focusField:null,selectedSourceIds:[clinical,privateId]});
    wrapper.unmount();
  });
  it('lets a therapist immediately create and edit a blank draft when generation has no sources',async()=>{
    inspectClinicalRecordMaterial.mockResolvedValue({...inventory(),sources:[]});
    const wrapper=mount(ClinicalSummaryTab,{props:{session:{id:sessionId,clientId,status:'in_progress',notes:''}},global:{stubs}});
    await flushPromises();
    expect(wrapper.text()).toContain('This does not mean the client has no saved material');
    await wrapper.findAll('button').find(button=>button.text()==='Write an editable draft').trigger('click');
    await flushPromises();
    expect(wrapper.find('#presentingConcerns').attributes('disabled')).toBeUndefined();
    await wrapper.find('#presentingConcerns').setValue('Therapist-authored presenting concerns.');
    expect(wrapper.find('#presentingConcerns').element.value).toBe('Therapist-authored presenting concerns.');
    wrapper.unmount();
  });
  it('never shows another encounter’s late source response after navigation',async()=>{
    let resolve;inspectClinicalRecordMaterial.mockReturnValueOnce(new Promise(done=>resolve=done));
    const wrapper=mount(ClinicalSummaryTab,{props:{session:{id:sessionId,clientId,status:'in_progress',notes:''}},global:{stubs}});
    await wrapper.setProps({session:{id:'44444444-4444-4444-8444-444444444444',clientId,status:'in_progress',notes:''}});
    inspectClinicalRecordMaterial.mockResolvedValue({...inventory(),sources:[],sessionId:'44444444-4444-4444-8444-444444444444'});
    resolve({...inventory(),sources:[{...inventory().sources[0],title:'STALE OLD ENCOUNTER'}]});
    await flushPromises();expect(wrapper.text()).not.toContain('STALE OLD ENCOUNTER');wrapper.unmount();
  });
});
