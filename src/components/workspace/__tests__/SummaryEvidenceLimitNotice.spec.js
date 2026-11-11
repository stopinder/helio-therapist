import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Notice from '../SummaryEvidenceLimitNotice.vue';

describe('compact evidence and generation recovery',()=>{
  it('always explains draft preservation without duplicating server reassurance', async()=>{
    const wrapper=mount(Notice,{props:{kind:'generation',message:'AI failed'}});
    expect(wrapper.text()).toContain('AI failed The current draft is unchanged.');
    await wrapper.setProps({message:'Your existing work is unchanged.'});
    expect(wrapper.text().match(/unchanged/g)).toHaveLength(1);
  });
  it('offers adjustment only for a deterministic size limit',async()=>{
    const wrapper=mount(Notice,{props:{message:'Too much selected material.'}});
    expect(wrapper.text()).toContain('Retrying the same selection will not help.');
    expect(wrapper.findAll('button')).toHaveLength(1);
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('adjust')).toHaveLength(1);expect(wrapper.emitted('retry')).toBeUndefined();
  });
  it('offers explicit retry or selection change without an automatic generation',async()=>{
    const wrapper=mount(Notice,{props:{kind:'generation',message:'A supporting passage could not be verified.'}});
    expect(wrapper.get('[role="alert"]').classes()).not.toContain('bg-state-danger-surface');
    expect(wrapper.emitted()).toEqual({});
    const buttons=wrapper.findAll('button');
    expect(buttons.map(b=>b.text())).toEqual(['Try again','Adjust evidence']);
    await buttons[1].trigger('click');expect(wrapper.emitted('adjust')).toHaveLength(1);expect(wrapper.emitted('retry')).toBeUndefined();
    await buttons[0].trigger('click');expect(wrapper.emitted('retry')).toHaveLength(1);
  });
  it('cannot launch a duplicate request when retry is disabled',async()=>{
    const wrapper=mount(Notice,{props:{kind:'generation',message:'An incomplete review.',retryDisabled:true}});
    expect(wrapper.findAll('button')[0].element.disabled).toBe(true);
    await wrapper.findAll('button')[0].trigger('click');expect(wrapper.emitted('retry')).toBeUndefined();
  });
});
