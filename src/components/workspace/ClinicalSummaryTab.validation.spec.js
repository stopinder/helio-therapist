import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ClinicalSummaryTab from './ClinicalSummaryTab.vue';
import ClinicalRecordSuggestionFeedback from './ClinicalRecordSuggestionFeedback.vue';
import { suggestClinicalRecordFields } from '../../lib/clinicalRecordSuggestions.js';
import { saveSessionDraft, completeSessionRecord } from '../../lib/sessions.js';
import { getSessionCapture } from '../../lib/sessionCaptures.js';
import { CLINICAL_RECORD_FIELDS, validateClinicalRecordSuggestions } from '../../../api/_lib/clinical-record-evidence.js';
vi.mock('../../lib/clinicalRecordSuggestions.js',()=>({suggestClinicalRecordFields:vi.fn()}));
vi.mock('../../lib/sessions.js',()=>({saveSessionDraft:vi.fn(),completeSessionRecord:vi.fn()}));
vi.mock('../../lib/sessionCaptures.js',()=>({getSessionCapture:vi.fn()}));
vi.mock('../../composables/useWhisperDictation.js',async()=>{
  const {ref}=await import('vue');
  return {appendDictation:(value,text)=>value+'\n'+text,useWhisperDictation:()=>({busy:ref(false),recording:ref(false),transcribing:ref(false),error:ref(''),toggle:vi.fn(),resetError:vi.fn()})};
});
const clientId='11111111-1111-4111-8111-111111111111',sessionId='22222222-2222-4222-8222-222222222222';
const quote='We explored responses to workplace stress.';
const sources=[{id:'capture:synthetic',recordId:'synthetic',kind:'reviewed_capture',reviewStatus:'reviewed',title:'Synthetic Session Capture',updatedAt:'v1',text:quote}];
const empty=()=>Object.fromEntries(CLINICAL_RECORD_FIELDS.map(key=>[key,{text:'',evidence:[]}]));
function response({partial=true,focusField=null}={}){
  const fields=empty();
  if(!focusField)fields.sessionThemes={text:'Workplace stress was explored.',evidence:[{sourceId:sources[0].id,quote}]};
  if(partial)fields.riskSafeguarding={text:'REJECTED_RISK_FINDING',evidence:[]};
  return {...validateClinicalRecordSuggestions({fields},sources,focusField),sources:sources.map(({text,...source})=>source),clientId,sessionId};
}
const stubs={StatusBadge:true,ClinicalWorkflowIndicator:true,ClinicalRecordMetadata:true,RecordHistoryPanel:true,ApprovalConfirmationDialog:true,ApprovedClinicalRecordView:true,NoticeBanner:true,WhisperMicButton:true};
let wrappers=[];
function screen(){const wrapper=mount(ClinicalSummaryTab,{props:{session:{id:sessionId,clientId,status:'in_progress',notes:JSON.stringify({presentingConcerns:'Existing therapist wording.'})}},global:{stubs}});wrappers.push(wrapper);return wrapper;}
const button=(wrapper,text)=>wrapper.findAll('button').find(item=>item.text()===text);
async function prepare(wrapper){await flushPromises();await button(wrapper,'Prepare from existing material').trigger('click');await flushPromises();}
describe('Clinical Record partial suggestions on the real record screen',()=>{
  beforeEach(()=>{
    vi.clearAllMocks();getSessionCapture.mockResolvedValue(null);
    suggestClinicalRecordFields.mockResolvedValue(response());
    HTMLElement.prototype.scrollIntoView=vi.fn();
  });
  afterEach(()=>{for(const wrapper of wrappers)wrapper.unmount();wrappers=[];});
  it('shows passing fields and specific failed-field messages without applying or saving anything',async()=>{
    const wrapper=screen();await prepare(wrapper);
    expect(wrapper.find('[data-testid="clinical-record-validation-feedback"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('The suggested wording had no supporting passage');
    expect(wrapper.text()).toContain('Workplace stress was explored.');
    expect(wrapper.text()).not.toContain('REJECTED_RISK_FINDING');
    expect(wrapper.find('#presentingConcerns').element.value).toBe('Existing therapist wording.');
    expect(wrapper.find('#sessionThemes').element.value).toBe('');
    expect(wrapper.find('#riskSafeguarding').element.value).toBe('');
    expect(saveSessionDraft).not.toHaveBeenCalled();expect(completeSessionRecord).not.toHaveBeenCalled();
  });
  it('only applies supported suggestions after explicit choice and keeps the review gate',async()=>{
    const wrapper=screen();await prepare(wrapper);
    await button(wrapper,'Use suggestions in empty fields').trigger('click');
    expect(wrapper.find('#presentingConcerns').element.value).toBe('Existing therapist wording.');
    expect(wrapper.find('#sessionThemes').element.value).toBe('Workplace stress was explored.');
    expect(wrapper.find('#riskSafeguarding').element.value).toBe('');
    expect(button(wrapper,'Mark Ready for Review').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('I have checked the suggested wording against its supporting records');
    expect(saveSessionDraft).not.toHaveBeenCalled();expect(completeSessionRecord).not.toHaveBeenCalled();
  });
  it('retrying one field keeps other current suggestions and all therapist edits',async()=>{
    const wrapper=screen();await prepare(wrapper);
    await wrapper.find('#presentingConcerns').setValue('New unsaved therapist correction.');
    suggestClinicalRecordFields.mockResolvedValue(response({partial:false,focusField:'riskSafeguarding'}));
    await wrapper.find('[aria-label="Retry risk and safeguarding"]').trigger('click');await flushPromises();
    expect(suggestClinicalRecordFields).toHaveBeenLastCalledWith({clientId,sessionId,focusField:'riskSafeguarding'});
    expect(wrapper.text()).toContain('Workplace stress was explored.');
    expect(wrapper.find('#presentingConcerns').element.value).toBe('New unsaved therapist correction.');
    expect(wrapper.text()).not.toContain('The suggested wording had no supporting passage');
    expect(saveSessionDraft).not.toHaveBeenCalled();
  });
  it('clears stale suggestions on a source confidentiality failure but leaves the draft intact',async()=>{
    const wrapper=screen();await prepare(wrapper);
    suggestClinicalRecordFields.mockRejectedValue(Object.assign(new Error('Source needs review. Your draft is unchanged.'),{code:'SOURCE_REVIEW_REQUIRED'}));
    await button(wrapper,'Refresh suggestions').trigger('click');await flushPromises();
    expect(wrapper.find('[data-testid="clinical-record-suggested-fields"]').exists()).toBe(false);
    expect(wrapper.find('#presentingConcerns').element.value).toBe('Existing therapist wording.');
    expect(wrapper.text()).toContain('Source needs review');
    expect(saveSessionDraft).not.toHaveBeenCalled();
  });
  it('does not offer application controls for an entirely blank result',async()=>{
    suggestClinicalRecordFields.mockResolvedValue(response({partial:false,focusField:'riskSafeguarding'}));
    const wrapper=screen();await prepare(wrapper);
    expect(wrapper.text()).toContain('No source-backed suggestions are ready to use');
    expect(button(wrapper,'Use suggestions in empty fields')).toBeUndefined();
    expect(wrapper.find('#riskSafeguarding').element.value).toBe('');
  });
  it('feedback explains provenance limits and provides a field-specific retry without raw rejected data',async()=>{
    const wrapper=mount(ClinicalRecordSuggestionFeedback,{props:{result:response()}});wrappers.push(wrapper);
    expect(wrapper.text()).toContain('not that the proposed clinical interpretation is correct');
    expect(wrapper.text()).toContain('Blank fields do not mean that a concern or risk is absent');
    await wrapper.find('[aria-label="Retry risk and safeguarding"]').trigger('click');
    expect(wrapper.emitted('retry')).toEqual([['riskSafeguarding']]);
    expect(wrapper.text()).not.toContain('REJECTED_RISK_FINDING');
  });
});
