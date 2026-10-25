import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AskHeliosPanel from './AskHeliosPanel.vue';
import { useAskHelios } from '../../composables/useAskHelios.js';
import * as api from '../../lib/api.js';

vi.mock('../../lib/api.js');

describe('AskHeliosPanel', () => {
  let askHelios;

  beforeEach(() => {
    vi.clearAllMocks();
    askHelios = useAskHelios();
    askHelios.clearConversation();
    if (!askHelios.isPanelOpen.value) {
      askHelios.togglePanel();
    }
    if (askHelios.isExpanded.value) {
      askHelios.toggleExpand();
    }
  });

  it('renders correctly when open', () => {
    const wrapper = mount(AskHeliosPanel);
    expect(wrapper.find('h2').text()).toBe('Ask Helios');
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('allows typing and sending a message', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        answer: 'Research suggests that CBT is effective.',
        references: [{ title: 'CBT Study', url: 'https://pubmed.gov', citation: 'APA 2024' }]
      })
    };
    vi.spyOn(api, 'authenticatedFetch').mockResolvedValue(mockResponse);

    const wrapper = mount(AskHeliosPanel);
    const textarea = wrapper.find('textarea');
    const form = wrapper.find('form');

    await textarea.setValue('Is CBT effective?');
    await form.trigger('submit');

    expect(api.authenticatedFetch).toHaveBeenCalledWith('/api/ai/research', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Is CBT effective?')
    }));

    // Wait for the async message update
    await vi.waitFor(() => {
      expect(askHelios.messages.value.length).toBe(2);
    });

    expect(askHelios.messages.value[1].content).toBe('Research suggests that CBT is effective.');
    expect(wrapper.text()).toContain('CBT Study');
  });

  it('handles expansion and resizing', async () => {
    const wrapper = mount(AskHeliosPanel);
    const expandButton = wrapper.find('button[title="Expand to workspace"]');
    
    await expandButton.trigger('click');
    expect(askHelios.isExpanded.value).toBe(true);
    expect(wrapper.find('div.fixed').classes()).toContain('inset-x-0');

    await wrapper.find('button[title="Restore size"]').trigger('click');
    expect(askHelios.isExpanded.value).toBe(false);
  });

  it('displays error message on failure', async () => {
    vi.spyOn(api, 'authenticatedFetch').mockRejectedValue(new Error('Network error'));
    
    const wrapper = mount(AskHeliosPanel);
    await wrapper.find('textarea').setValue('Test query');
    await wrapper.find('form').trigger('submit');

    await vi.waitFor(() => {
        expect(askHelios.messages.value.length).toBe(2);
    });
    
    expect(askHelios.messages.value[1].content).toContain('I\'m sorry, I encountered an error while researching: Network error');
  });
});
