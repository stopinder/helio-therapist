import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TranscriptConversation from './TranscriptConversation.vue'

const legacy = { id: 'legacy', text: '[ ] Unknown: Hello. [ ] Unknown: I have been talking to someone. [ ] Unknown: Can we discuss last week?' }
const long = { id: 'long', structuredTranscript: {
  speakers: [{ speaker_id: '1', display_name: 'Named participant' }, { speaker_id: '2', display_name: 'Unknown' }],
  items: Array.from({ length: 140 }, (_, index) => ({ speaker_id: String(index % 2 + 1), text: `Source passage ${index + 1}${index === 139 ? ' identifying clue' : ''}` }))
}, text: 'Exact original source' }

describe('shared readable transcript', () => {
  it('cleans legacy empty timestamps and Unknown prefixes without assigning names or altering the raw source', async () => {
    const wrapper = mount(TranscriptConversation, { props: { transcript: legacy } })
    expect(wrapper.find('.reader-passages').text()).toContain('Hello. I have been talking to someone. Can we discuss last week?')
    expect(wrapper.find('.reader-passages').text()).not.toContain('Unknown:')
    expect(wrapper.find('.reader-passages').text()).not.toContain('[ ]')
    expect(wrapper.text()).toContain('Names and roles have not been inferred')
    await wrapper.find('.reader-action').trigger('click')
    expect(wrapper.find('pre').text()).toBe(legacy.text)
    wrapper.unmount()
  })
  it('searches the whole source, including material beyond the initially visible passages', async () => {
    const wrapper = mount(TranscriptConversation, { props: { transcript: long } })
    expect(wrapper.findAll('article')).toHaveLength(60)
    await wrapper.find('input').setValue('identifying clue')
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.find('article').text()).toContain('Source passage 140 identifying clue')
    expect(wrapper.text()).toContain('1 passage found')
    await wrapper.find('input').setValue('no such phrase')
    expect(wrapper.text()).toContain('No transcript passages match')
    wrapper.unmount()
  })
  it('lets the therapist read every passage without assignment or silent truncation', async () => {
    const wrapper = mount(TranscriptConversation, { props: { transcript: long } })
    await wrapper.find('.reader-more button').trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(120)
    await wrapper.find('.reader-more button').trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(140)
    expect(wrapper.find('.reader-more').exists()).toBe(false)
    wrapper.unmount()
  })
  it('preserves truthful supplied names and accepts the full reader search', async () => {
    const wrapper = mount(TranscriptConversation, { props: { transcript: long, searchable: false, query: 'Source passage 1', showRawControl: false } })
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('.reader-action').exists()).toBe(false)
    expect(wrapper.find('article').text()).toContain('Named participant')
    await wrapper.setProps({ query: 'identifying clue' })
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.find('article').text()).toContain('Unidentified speaker')
    wrapper.unmount()
  })
  it('clears search and raw-source state when a different transcript is opened', async () => {
    const wrapper = mount(TranscriptConversation, { props: { transcript: long } })
    await wrapper.find('input').setValue('identifying clue')
    await wrapper.find('.reader-action').trigger('click')
    await wrapper.setProps({ transcript: legacy })
    expect(wrapper.find('input').element.value).toBe('')
    expect(wrapper.find('pre').exists()).toBe(false)
    expect(wrapper.find('article').text()).toContain('Hello.')
    wrapper.unmount()
  })
})
