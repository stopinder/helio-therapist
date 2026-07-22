import { nextTick, onBeforeUnmount, watch } from 'vue'

const focusableSelector = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', 'summary', '[tabindex]:not([tabindex="-1"])'
].join(', ')

export function useFocusTrap(container, active, onEscape) {
  let previouslyFocused = null

  const handleKeydown = (event) => {
    if (!active.value) return
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape?.()
      return
    }
    if (event.key !== 'Tab') return

    const items = [...(container.value?.querySelectorAll(focusableSelector) || [])]
    if (!items.length) {
      event.preventDefault()
      container.value?.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(active, async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement
      await nextTick()
      const first = container.value?.querySelector(focusableSelector)
      ;(first || container.value)?.focus()
      document.addEventListener('keydown', handleKeydown)
    } else {
      document.removeEventListener('keydown', handleKeydown)
      previouslyFocused?.focus?.()
      previouslyFocused = null
    }
  })

  onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))
}
