import { ref, computed } from 'vue'
import { listSessions } from '../lib/sessions.js'
import { listClients } from '../lib/clients.js'
import { isEligibleForStart } from '../lib/calendarHelpers.js'
import { authenticatedFetch } from '../lib/api.js'

/**
 * Calendar domain service for managing clinical sessions and external calendar events.
 * 
 * NOTE: This adapter combines Supabase clinical session records with read-only
 * Google Calendar events via the authenticated server endpoint.
 */
export function useCalendar() {
  const sessions = ref([])
  const googleEvents = ref([])
  const clients = ref([])
  const loading = ref(false)
  const googleLoading = ref(false)
  const error = ref(null)
  const googleError = ref(null)
  const isGoogleConnected = ref(false)

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
      console.error('Failed to load clinical schedule:', e)
      error.value = 'Failed to load schedule. Please try again.'
    } finally {
      loading.value = false
    }

    // Attempt to load Google Calendar events if connected
    await loadGoogleEvents()
  }

  async function loadGoogleEvents() {
    googleLoading.value = true
    googleError.value = null
    try {
      // First check status to avoid unnecessary errors
      const statusRes = await authenticatedFetch('/api/google/status')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        isGoogleConnected.value = !!statusData.connected
        
        if (isGoogleConnected.value) {
          // Fetch events for a reasonable window (e.g., 31 days each way)
          const timeMin = new Date()
          timeMin.setDate(timeMin.getDate() - 31)
          const timeMax = new Date()
          timeMax.setDate(timeMax.getDate() + 31)
          
          const params = new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString()
          })
          
          const eventsRes = await authenticatedFetch(`/api/google/events?${params.toString()}`)
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json()
            googleEvents.value = eventsData.events || []
          } else {
            const errData = await eventsRes.json().catch(() => ({}))
            if (errData.code !== 'GOOGLE_CONNECTION_NOT_FOUND') {
              googleError.value = 'Google Calendar sync failed.'
              console.error('Google Calendar events fetch failed:', errData)
            } else {
              isGoogleConnected.value = false
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load Google Calendar events:', e)
      // Silent failure for Google Calendar to not block the main clinical view
    } finally {
      googleLoading.value = false
    }
  }

  const normalizedEvents = computed(() => {
    const clinical = sessions.value
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
          id: `clinical-${session.id}`,
          originalId: session.id,
          source: 'clinical',
          clientId: session.clientId,
          clientName: client?.display_name || 'Unknown Client',
          start: startTime,
          end: endTime,
          status: session.status || 'scheduled',
          workflowStatus: session.workflowStatus,
          type: session.type || 'Session',
          isEligibleForStart: isEligible,
          session
        }
      })
      .filter(Boolean)

    const external = googleEvents.value.map(event => {
      const startTime = new Date(event.start)
      const endTime = new Date(event.end)
      
      if (isNaN(startTime.getTime())) return null

      return {
        id: `google-${event.id}`,
        originalId: event.id,
        source: 'google',
        clientName: event.summary || '(No title)',
        start: startTime,
        end: endTime,
        status: 'external',
        type: 'External',
        isEligibleForStart: false,
        location: event.location,
        description: event.description,
        meetingLink: event.meetingLink,
        link: event.link
      }
    }).filter(Boolean)

    return [...clinical, ...external]
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
    googleEvents,
    clients,
    loading,
    googleLoading,
    error,
    googleError,
    isGoogleConnected,
    loadData,
    normalizedEvents,
    todayEvents,
    upcomingEvents,
    groupEventsByDay
  }
}
