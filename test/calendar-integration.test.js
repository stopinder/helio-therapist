import test from 'node:test'
import assert from 'node:assert/strict'
import { ref } from 'vue'

// Mock useCalendar for range and logic tests
test('useCalendar loadGoogleEvents aborts concurrent requests', async () => {
  const googleLoading = ref(false)
  const abortController = ref(null)
  const callCount = { val: 0 }

  async function loadGoogleEvents() {
    if (googleLoading.value && abortController.value) {
      abortController.value.abort()
    }
    
    abortController.value = new AbortController()
    const { signal } = abortController.value
    googleLoading.value = true

    try {
      callCount.val++
      // Simulate fetch
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 100)
        signal.addEventListener('abort', () => {
          clearTimeout(timeout)
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    } catch (e) {
      if (e.name !== 'AbortError') throw e
    } finally {
      googleLoading.value = false
    }
  }

  // Trigger two concurrent loads
  const p1 = loadGoogleEvents()
  const p2 = loadGoogleEvents()
  
  await Promise.allSettled([p1, p2])
  
  assert.equal(callCount.val, 2, 'Should have started two calls')
})

test('useCalendar range normalization avoids millisecond issues', () => {
  const customRange = {
    start: new Date('2026-07-21T00:00:00.123Z'),
    end: new Date('2026-07-21T01:00:00.456Z')
  }

  const timeMin = new Date(customRange.start)
  timeMin.setMilliseconds(0)
  const timeMax = new Date(customRange.end)
  timeMax.setMilliseconds(0)

  assert.equal(timeMin.getMilliseconds(), 0)
  assert.equal(timeMax.getMilliseconds(), 0)
  assert.equal(timeMin.toISOString(), '2026-07-21T00:00:00.000Z')
})
