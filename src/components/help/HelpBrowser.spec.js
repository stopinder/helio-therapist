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
  it('finds an article by a normal question and keeps search/filter state on return', async () => {
    const wrapper = render(HelpBrowser)
    await wrapper.get('input').setValue('where does my reflection go?')
    expect(wrapper.text()).toContain('Follow a reflection from the session')
    await wrapper.get('ul button').trigger('click')
    expect(wrapper.find('article').text()).toContain('One example from input to result')
    expect(wrapper.find('article').text()).toContain('Saving does not automatically')
    await wrapper.findAll('button').find(button => button.text() === 'Back to results').trigger('click')
    expect(wrapper.get('input').element.value).toBe('where does my reflection go?')
  })
  it('shows useful empty and invalid-article states without HTML injection', async () => {
    const wrapper = render(HelpBrowser, { props: { articleId: 'unknown' } })
    expect(wrapper.text()).toContain('That help article is not available')
    await wrapper.get('input').setValue('<img src=x onerror=alert(1)>')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('No matching help yet')
    await wrapper.findAll('button').find(button => button.text() === 'Clear search and filters').trigger('click')
    expect(wrapper.get('input').element.value).toBe('')
    expect(wrapper.findAll('ul > li').length).toBeGreaterThanOrEqual(10)
  })
  it('renders the same full article in page and contextual modes', () => {
    const full = render(HelpBrowser, { props: { articleId: 'care-suggestions' } })
    const compact = render(HelpBrowser, { props: { articleId: 'care-suggestions', compact: true } })
    expect(full.get('article').text()).toBe(compact.get('article').text())
    expect(compact.findAll('input')[0].attributes('id')).not.toBe(full.get('input').attributes('id'))
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
  it('preserves unsaved Care text and does not run generation or persistence when Help opens', async () => {
    const host = defineComponent({ components: { ClientCarePanel, HelpPanel }, template: '<ClientCarePanel client-id="fictional-client" /><HelpPanel />' })
    const wrapper = render(host)
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === '+ Reflect on Care').trigger('click')
    await wrapper.get('textarea').setValue('Unsaved fictional observation')
    const field = wrapper.get('textarea').element
    await wrapper.get('[aria-label="How Care works"]').trigger('click')
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
