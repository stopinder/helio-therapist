import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SourceReviewDialog from './SourceReviewDialog.vue'

vi.mock('./SourceReviewPanel.vue', () => ({
  default: {
    props: ['transcriptId', 'embedded'],
    emits: ['close', 'resolved'],
    template: '<div data-testid="fake-source-content"><span>{{ transcriptId }}</span><button type="button" @click="$emit(\'resolved\', { action: \'confirm\' })">Mock confirmed</button></div>'
  }
}))
const UUID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const open = async () => {
  const opener=document.createElement('button')
  opener.textContent='Original review button'
  document.body.appendChild(opener)
  opener.focus()
  const wrapper=mount(SourceReviewDialog, {
    attachTo:document.body,
    props:{transcriptId:UUID,sourceLabel:'Dom · 6 Nov 2026'}
  })
  await nextTick()
  return {opener,wrapper}
}
afterEach(() => {
  document.body.style.overflow=''
  document.body.replaceChildren()
})
describe('unified source review dialog', () => {
  it('teleports over the screen and traps its own scrolling instead of hiding below the fold', async()=>{
    const {wrapper}=await open()
    const dialog=document.querySelector('[data-testid="source-review-dialog"]')
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('tabindex')).toBe('-1')
    expect(document.querySelector('[data-testid="source-review-scroll-area"]')).not.toBeNull()
    expect(dialog.textContent).toContain('Dom · 6 Nov 2026')
    expect(dialog.textContent).toContain(UUID)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement.textContent).toBe('Close')
    await wrapper.unmount()
  })
  it('emits a close on Escape and restores the original button focus when dismissed',async()=>{
    const {opener,wrapper}=await open()
    const overlay=document.querySelector('[data-testid="source-review-overlay"]')
    overlay.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))
    expect(wrapper.emitted('close')).toHaveLength(1)
    await wrapper.unmount()
    await nextTick()
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe('')
  })
  it('passes explicit therapist review events upward but never approves on opening',async()=>{
    const {wrapper}=await open()
    expect(wrapper.emitted('resolved')).toBeUndefined()
    const confirm=document.querySelector('[data-testid="fake-source-content"] button')
    confirm.click()
    await nextTick()
    expect(wrapper.emitted('resolved')?.[0][0]).toEqual({action:'confirm'})
    await wrapper.unmount()
  })
  it('closing the button emits close without touching the transcript',async()=>{
    const {wrapper}=await open()
    const close=document.querySelector('[data-testid="source-review-dialog"] header button')
    close.click()
    await nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('resolved')).toBeUndefined()
    await wrapper.unmount()
  })
})
