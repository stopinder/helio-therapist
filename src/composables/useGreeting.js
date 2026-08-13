import { computed, unref } from 'vue'

export function greetingPhraseForHour(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function useGreeting({ displayName, appointmentCount, now = () => new Date() } = {}) {
  const currentDate = computed(() => now())
  const eyebrow = computed(() => new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(currentDate.value))
  const phrase = computed(() => greetingPhraseForHour(currentDate.value.getHours()))
  const therapistDisplayName = computed(() => unref(displayName) || '')
  const supportingInformation = computed(() => {
    const count = Number(unref(appointmentCount) || 0)
    return count === 0 ? 'You have no appointments today.' : `You have ${count} appointment${count === 1 ? '' : 's'} today.`
  })

  return { eyebrow, phrase, therapistDisplayName, supportingInformation }
}
