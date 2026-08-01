import { ref, computed } from 'vue'
import { listSessions } from '../lib/sessions.js'
import { listClients } from '../lib/clients.js'
import { isEligibleForStart } from '../lib/calendarHelpers.js'

/**
 * Calendar domain service for managing clinical sessions as calendar events.
 * 
 * NOTE: This is a temporary adapter mapping Supabase session records into calendar events.
 * Showing Helios session records. External calendar sync is not connected.
 * 
 * This adapter should later be extended or replaced following read-only Google Calendar discovery.
 */
export function useCalendar() {
  const sessions = ref([])
  const clients = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function loadData() {
    loading.value = true
    error.value = null
    try {
      const [sessionsData, clientsData] = await Promise.all([
        listSessions(),
        listClients()
      ])
      sessions.value = sessionsData
      clients.value = clientsData
    } catch (e) {
      console.error('Failed to load calendar data:', e)
      error.value = 'Failed to load schedule. Please try again.'
    } finally {
      loading.value = false
    }
  }

  const normalizedEvents = computed(() => {
    return sessions.value
      .filter(session => session.startedAt) // Safety check
      .map(session => {
        const client = clients.value.find(c => String(c.id) === String(session.clientId))
        const startTime = new Date(session.startedAt)
        
        // Handle invalid dates
        if (isNaN(startTime.getTime())) return null

        // Preserve real end time or use 50-minute fallback
        const endTime = session.endedAt && !isNaN(new Date(session.endedAt).getTime())
          ? new Date(session.endedAt) 
          : new Date(startTime.getTime() + 50 * 60000)

        // Eligibility rule: uses shared helper
        const isEligible = isEligibleForStart(session)

        return {
          id: session.id,
          clientId: session.clientId,
          clientName: client?.display_name || 'Unknown Client',
          start: startTime,
          end: endTime,
          status: session.status || 'scheduled',
          workflowStatus: session.workflowStatus,
          type: session.type || 'Session', // Use real session type if available, else neutral fallback
          isEligibleForStart: isEligible,
          session
        }
      })
      .filter(Boolean)
  })

  const todayEvents = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return normalizedEvents.value
      .filter(event => event.start >= today && event.start < tomorrow)
      .sort((a, b) => a.start - b.start)
  })

  const upcomingEvents = computed(() => {
    const now = new Date()
    return normalizedEvents.value
      .filter(event => event.start > now)
      .sort((a, b) => a.start - b.start)
  })

  function groupEventsByDay(eventsList) {
    const groups = {}
    eventsList.forEach(event => {
      const date = new Date(event.start)
      date.setHours(0, 0, 0, 0)
      const key = date.toISOString()
      if (!groups[key]) {
        groups[key] = {
          date,
          events: []
        }
      }
      groups[key].events.push(event)
    })
    return Object.values(groups).sort((a, b) => a.date - b.date)
  }

  return {
    sessions,
    clients,
    loading,
    error,
    loadData,
    normalizedEvents,
    todayEvents,
    upcomingEvents,
    groupEventsByDay
  }
}
