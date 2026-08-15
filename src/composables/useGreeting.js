import { computed, onMounted, onUnmounted, ref, unref } from 'vue'

export function greetingPhraseForHour(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function useGreeting({ displayName, appointmentCount, now = () => new Date() } = {}) {
  const currentDate = ref(now())
  let timerId = null

  function refreshGreeting() {
    currentDate.value = now()
  }

  function refreshWhenVisible() {
    if (typeof document === 'undefined' || !document.hidden) refreshGreeting()
  }

  onMounted(() => {
    refreshGreeting()
    timerId = window.setInterval(refreshGreeting, 60_000)
    window.addEventListener('focus', refreshGreeting)
    document.addEventListener('visibilitychange', refreshWhenVisible)
  })

  onUnmounted(() => {
    if (timerId !== null) window.clearInterval(timerId)
    window.removeEventListener('focus', refreshGreeting)
    document.removeEventListener('visibilitychange', refreshWhenVisible)
  })

  const eyebrow = computed(() => new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(currentDate.value))
  const currentTime = computed(() => new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(currentDate.value).replace(/\s?(am|pm)$/i, match => match.trim().toLowerCase()))
  const phrase = computed(() => greetingPhraseForHour(currentDate.value.getHours()))
  const therapistDisplayName = computed(() => unref(displayName) || '')
  const supportingInformation = computed(() => {
    const count = Number(unref(appointmentCount) || 0)
    return count === 0 ? 'You have no appointments today.' : `You have ${count} appointment${count === 1 ? '' : 's'} today.`
  })

  return { eyebrow, currentTime, phrase, therapistDisplayName, supportingInformation, refreshGreeting }
}
