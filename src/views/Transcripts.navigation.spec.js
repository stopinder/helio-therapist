import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import Transcripts from './Transcripts.vue';
import { listClients } from '../lib/clients.js';
import { authenticatedFetch } from '../lib/api.js';

vi.mock('../lib/clients.js',()=>({listClients:vi.fn()}));
vi.mock('../lib/api.js',()=>({authenticatedFetch:vi.fn()}));
vi.mock('vue-router',()=>({useRoute:()=>({query:{}}),useRouter:()=>({push:vi.fn(),back:vi.fn()})}));

let mounts=0,refreshCalls=0,allowRefresh=true;
const FakeInbox=defineComponent({
  name:'TranscriptInbox',
  setup(_props,{expose}){
    mounts++;
    expose({refreshAfterImport:async()=>{refreshCalls++;return allowRefresh;}});
    return ()=>h('div',{'data-testid':'inbox-preserved'},'Transcript Inbox stays mounted');
  }
});
const stubs={
  TranscriptInbox:FakeInbox,
  RouterLink:{props:['to'],template:'<a><slot /></a>'}
};
const button=(wrapper,label)=>wrapper.findAll('button').find(node=>node.text().includes(label));

describe('Transcript Inbox keeps active work intact during Zoom checks',()=>{
  beforeEach(()=>{
    vi.clearAllMocks();mounts=0;refreshCalls=0;allowRefresh=true;
    listClients.mockResolvedValue([]);
    authenticatedFetch.mockResolvedValue({ok:true,json:async()=>({imported:1,refreshed:0})});
  });
  it('opens the Inbox without issuing a surprise second Zoom reconciliation',async()=>{
    const wrapper=mount(Transcripts,{global:{stubs}});
    await flushPromises();
    expect(mounts).toBe(1);
    expect(authenticatedFetch).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('after an explicit Zoom check, refreshes the existing Inbox instance rather than remounting it',async()=>{
    const wrapper=mount(Transcripts,{global:{stubs}});
    await flushPromises();
    await button(wrapper,'Check Zoom Notes').trigger('click');
    await flushPromises();
    expect(authenticatedFetch).toHaveBeenCalledTimes(1);
    expect(refreshCalls).toBe(1);
    expect(mounts).toBe(1);
    expect(wrapper.text()).toContain('transcript imported');
    wrapper.unmount();
  });
  it('when the Inbox is busy, retains the work and offers a deliberate refresh instead',async()=>{
    allowRefresh=false;
    const wrapper=mount(Transcripts,{global:{stubs}});
    await flushPromises();
    await button(wrapper,'Check Zoom Notes').trigger('click');
    await flushPromises();
    expect(refreshCalls).toBe(1);
    expect(mounts).toBe(1);
    expect(wrapper.text()).toContain('finish your current assignment');
    allowRefresh=true;
    await button(wrapper,'refresh the inbox').trigger('click');
    await flushPromises();
    expect(refreshCalls).toBe(2);
    expect(mounts).toBe(1);
    expect(wrapper.text()).not.toContain('finish your current assignment');
    wrapper.unmount();
  });
});
