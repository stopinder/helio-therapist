import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Panel from './SummaryRefinementPanel.vue';
import SummaryDocument from './SessionSummaryDocument.vue';
import { authenticatedFetch } from '../../lib/api.js';
vi.mock('../../lib/api.js',()=>({authenticatedFetch:vi.fn()}));
const body='What we worked on\n\nA synthetic concern was explored without an agreed exercise.';
const contextKey='synthetic-client:encounter:lens';
let wrappers=[];
function render(props={}){const wrapper=mount(Panel,{props:{body,contextKey,...props}});wrappers.push(wrapper);return wrapper;}
beforeEach(()=>vi.clearAllMocks());
afterEach(()=>{for(const wrapper of wrappers)wrapper.unmount();wrappers=[];});
describe('one shared therapist-controlled summary refinement',()=>{
  it('starts with no named person, no resource and no exercise selected',()=>{
    const wrapper=render();expect(wrapper.find('[data-testid="summary-addition"]').element.value).toBe('none');
    expect(wrapper.find('[data-testid="summary-resource-picker"]').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/Kabat|30 minutes|YouTube/);
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });
  it('requests a revision without replacing or approving the original',async()=>{
    const wrapper=render();await wrapper.find('[data-testid="summary-refinement-instruction"]').setValue('Clarify the tentative understanding.');
    await wrapper.find('[data-testid="summary-preview-revision"]').trigger('click');
    const payload=wrapper.emitted('generate')[0][0];expect(payload.baseBody).toBe(body);expect(payload.contextKey).toBe(contextKey);
    expect(payload.summaryOptions).toEqual({audience:'auto',addition:'none',resource:null});
    expect(wrapper.emitted('accept')).toBeUndefined();expect(wrapper.props('body')).toBe(body);
  });
  it('offers a sensing exercise only after an explicit request, with no method assigned',async()=>{
    const wrapper=render();await wrapper.findAll('button').find(button=>button.text()==='Request a sensing exercise').trigger('click');
    expect(wrapper.find('[data-testid="summary-addition"]').element.value).toBe('exercise');
    expect(wrapper.emitted('generate')).toBeUndefined();
    await wrapper.find('[data-testid="summary-preview-revision"]').trigger('click');
    const payload=wrapper.emitted('generate')[0][0];expect(payload.summaryOptions.addition).toBe('exercise');expect(payload.summaryOptions.resource).toBeNull();
  });
  it('renders an actual proposed summary and waits for explicit acceptance',async()=>{
    const candidate={baseBody:body,contextKey,result:{draft:{body:'What we worked on\n\nA more specific synthetic revision.'}}};
    const wrapper=render({candidate});expect(wrapper.findComponent(SummaryDocument).text()).toContain('more specific synthetic revision');
    expect(wrapper.emitted('accept')).toBeUndefined();
    await wrapper.find('[data-testid="summary-accept-revision"]').trigger('click');expect(wrapper.emitted('accept')).toHaveLength(1);
  });
  it('can delegate revision preview to the main session reading surface without duplicating it',()=>{
    const candidate={baseBody:body,contextKey,result:{draft:{body:'A specific revised summary.'}}};
    const wrapper=render({candidate,showPreview:false});
    expect(wrapper.find('[data-testid="summary-revision-preview"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="summary-preview-revision"]').exists()).toBe(true);
    expect(wrapper.emitted('accept')).toBeUndefined();
  });
  it('discards the proposal without applying it and invalidates stale context',async()=>{
    const candidate={baseBody:body,contextKey,result:{draft:{body:'Proposed revision.'}}};
    const wrapper=render({candidate});await wrapper.find('[data-testid="summary-discard-revision"]').trigger('click');
    expect(wrapper.emitted('discard')).toBeTruthy();expect(wrapper.emitted('accept')).toBeUndefined();
    await wrapper.setProps({contextKey:'another-client'});expect(wrapper.find('[data-testid="summary-accept-revision"]').exists()).toBe(false);
  });
  it('does not allow an edited current draft to be overwritten by a stale proposal',async()=>{
    const candidate={baseBody:body,contextKey,result:{draft:{body:'Proposed revision.'}}};
    const wrapper=render({candidate});await wrapper.setProps({body:'Therapist correction.'});
    expect(wrapper.find('[data-testid="summary-revision-preview"]').exists()).toBe(false);expect(wrapper.emitted('accept')).toBeUndefined();
  });
  it('keeps resource inputs empty and requires a successful check plus clinician selection',async()=>{
    const wrapper=render();await wrapper.find('[data-testid="summary-addition"]').setValue('resource');
    expect(wrapper.find('[data-testid="summary-resource-url"]').element.value).toBe('');
    await wrapper.find('[data-testid="summary-resource-url"]').setValue('https://example.com/reference');
    authenticatedFetch.mockResolvedValue({ok:true,json:async()=>({success:true,data:{url:'https://example.com/reference',title:'Synthetic resource',status:'reachable',clinicalSuitability:'not_assessed'}})});
    await wrapper.find('[data-testid="summary-check-link"]').trigger('click');await flushPromises();
    expect(JSON.parse(authenticatedFetch.mock.calls[0][1].body)).toEqual({url:'https://example.com/reference'});
    expect(wrapper.text()).toContain('not an assessment of clinical suitability');
    await wrapper.find('[data-testid="summary-preview-revision"]').trigger('click');expect(wrapper.emitted('generate')).toBeUndefined();
    await wrapper.find('[data-testid="summary-resource-reviewed"]').setValue(true);
    await wrapper.find('[data-testid="summary-preview-revision"]').trigger('click');expect(wrapper.emitted('generate')[0][0].summaryOptions.resource.reviewed).toBe(true);
  });
  it('clears resource verification on link changes and permits no-resource continuation',async()=>{
    const wrapper=render();await wrapper.find('[data-testid="summary-addition"]').setValue('resource');
    await wrapper.find('[data-testid="summary-resource-url"]').setValue('https://example.com/reference');
    authenticatedFetch.mockResolvedValue({ok:true,json:async()=>({success:true,data:{url:'https://example.com/reference',title:'Synthetic resource',status:'reachable'}})});
    await wrapper.find('[data-testid="summary-check-link"]').trigger('click');await flushPromises();
    await wrapper.find('[data-testid="summary-resource-reviewed"]').setValue(true);
    await wrapper.find('[data-testid="summary-resource-url"]').setValue('https://example.com/changed');
    expect(wrapper.find('[data-testid="summary-resource-details"]').exists()).toBe(false);
    await wrapper.findAll('button').find(button=>button.text()==='Continue without a resource').trigger('click');
    await wrapper.find('[data-testid="summary-preview-revision"]').trigger('click');expect(wrapper.emitted('generate')[0][0].summaryOptions.resource).toBeNull();
  });
  it('refuses unsafe links locally without a request containing client material',async()=>{
    const wrapper=render();await wrapper.find('[data-testid="summary-addition"]').setValue('resource');
    await wrapper.find('[data-testid="summary-resource-url"]').setValue('https://127.0.0.1/private');
    await wrapper.find('[data-testid="summary-check-link"]').trigger('click');expect(authenticatedFetch).not.toHaveBeenCalled();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });
  it('shows checked resources as links, not oversized practitioner or raw-URL headings',()=>{
    const wrapper=mount(SummaryDocument,{props:{compact:true,body:'Optional resource\n\n[Synthetic reference](https://example.com/reference)'}});wrappers.push(wrapper);
    expect(wrapper.findAll('h2')).toHaveLength(1);expect(wrapper.find('a').text()).toBe('Synthetic reference');expect(wrapper.find('a').attributes('rel')).toBe('noopener noreferrer');
  });
});
