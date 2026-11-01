import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import HelpBrowser from './HelpBrowser.vue'
import HelpPanel from './HelpPanel.vue'
import HelpLink from './HelpLink.vue'
import ClientCarePanel from '../workspace/ClientCarePanel.vue'
import ReflectionTab from '../workspace/ReflectionTab.vue'
import { useHelp } from '../../composables/useHelp.js'
import * as care from '../../lib/clientCare.js'
import * as reflections from '../../lib/reflections.js'

vi.mock('../../lib/clientCare.js', () => ({
  listClientCareItems: vi.fn(async () => []), generateCareSuggestions: vi.fn(),
  transcribeCareAudio: vi.fn(), createClientCareItem: vi.fn(), updateClientCareItem: vi.fn()
}))
vi.mock('../../lib/reflections.js', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, getPrivateReflection: vi.fn(async () => null), upsertPrivateReflection: vi.fn() }
})
const wrappers = []
function render(component, options = {}) {
  const wrapper = mount(component, { attachTo: document.body, ...options })
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  useHelp().closeHelp()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('shared Help browser', () => {
  it('presents reviewed Help as four grouped areas with no search or filter controls', () => {
    const wrapper = render(HelpBrowser)
    expect(wrapper.findAll('input')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Search Help')
    expect(wrapper.text()).not.toContain('All topics')
    for (const heading of ['Clients', 'Therapy Focus', 'Sessions', 'Reflection']) {
      expect(wrapper.findAll('h2').some(node => node.text() === heading)).toBe(true)
    }
    expect(wrapper.findAll('[data-testid="help-topic-card"]')).toHaveLength(12)
  })

  it('opens an article from the grouped catalogue and returns to Help', async () => {
    const wrapper = render(HelpBrowser)
    const reflection = wrapper.findAll('[data-testid="help-topic-card"]')
      .find(button => button.text().includes('Follow a reflection from the session into your Practice Map'))
    expect(reflection).toBeTruthy()
    await reflection.trigger('click')
    expect(wrapper.find('article').text()).toContain('One example from input to result')
    expect(wrapper.find('article').text()).toContain('Saving does not automatically')
    const back = wrapper.findAll('button').find(button => button.text() === 'Back to Help')
    await back.trigger('click')
    expect(wrapper.find('article').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="help-topic-card"]')).toHaveLength(12)
  })

  it('shows an invalid-article state above the grouped catalogue without HTML injection', () => {
    const wrapper = render(HelpBrowser, { props: { articleId: 'unknown' } })
    expect(wrapper.text()).toContain('That help article is not available')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.findAll('input')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="help-topic-card"]')).toHaveLength(12)
  })

  it('renders the same full article in page and contextual modes', () => {
    const full = render(HelpBrowser, { props: { articleId: 'care-suggestions' } })
    const compact = render(HelpBrowser, { props: { articleId: 'care-suggestions', compact: true } })
    expect(full.get('article').text()).toBe(compact.get('article').text())
    expect(full.findAll('input')).toHaveLength(0)
    expect(compact.findAll('input')).toHaveLength(0)
  })
})

describe('contextual Help leaves work in place', () => {
  it('does not submit a surrounding form', async () => {
    const submit = vi.fn()
    const host = defineComponent({ components: { HelpLink }, setup: () => ({ submit }), template: '<form @submit.prevent="submit"><HelpLink topic="dictate" /></form>' })
    const wrapper = render(host)
    expect(wrapper.get('button').attributes('type')).toBe('button')
    await wrapper.get('button').trigger('click')
    expect(submit).not.toHaveBeenCalled()
    expect(useHelp().helpTopic.value).toBe('dictate')
  })
  it('preserves unsaved Therapy Focus text and does not run generation or persistence when Help opens', async () => {
    const host = defineComponent({ components: { ClientCarePanel, HelpPanel }, template: '<ClientCarePanel client-id="fictional-client" /><HelpPanel />' })
    const wrapper = render(host)
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === '+ Add reflection').trigger('click')
    await wrapper.get('textarea').setValue('Unsaved fictional observation')
    const field = wrapper.get('textarea').element
    await wrapper.get('[aria-label="How Therapy Focus works"]').trigger('click')
    await flushPromises()
    expect(useHelp().isHelpOpen.value).toBe(true)
    expect(document.querySelector('dialog').textContent).toContain('From your thought to a saved change')
    document.querySelector('[aria-label="Close Help"]').click()
    await flushPromises()
    expect(wrapper.get('textarea').element).toBe(field)
    expect(field.value).toBe('Unsaved fictional observation')
    expect(care.listClientCareItems).toHaveBeenCalledTimes(1)
    expect(care.generateCareSuggestions).not.toHaveBeenCalled()
    expect(care.createClientCareItem).not.toHaveBeenCalled()
    expect(care.updateClientCareItem).not.toHaveBeenCalled()
  })
  it('preserves unsaved session Reflection text and never saves it from Help', async () => {
    const host = defineComponent({ components: { ReflectionTab, HelpPanel }, template: '<ReflectionTab client-id="fictional-client" session-id="fictional-session" /><HelpPanel />' })
    const wrapper = render(host)
    await flushPromises()
    await wrapper.get('#stoodOut').setValue('An unsaved fictional reflection')
    await wrapper.get('[aria-label="How Therapist Reflection works"]').trigger('click')
    await flushPromises()
    document.querySelector('[aria-label="Close Help"]').click()
    await flushPromises()
    expect(wrapper.get('#stoodOut').element.value).toBe('An unsaved fictional reflection')
    expect(reflections.getPrivateReflection).toHaveBeenCalledTimes(1)
    expect(reflections.upsertPrivateReflection).not.toHaveBeenCalled()
  })
})
