import { ref, computed } from 'vue'
import { listSessions } from '../lib/sessions.js'
import { listClients } from '../lib/clients.js'
import { listScheduledAppointments } from '../lib/appointments.js'
import { isAppointmentEligibleForStart } from '../lib/calendarHelpers.js'
import { authenticatedFetch } from '../lib/api.js'

/**
 * Calendar domain service for operational appointments, completed clinical sessions,
 * and read-only external calendar events.
 */
export function useCalendar() {
  const sessions = ref([])
  const appointments = ref([])
  const googleEvents = ref([])
  const clients = ref([])
  const loading = ref(false)
  const googleLoading = ref(false)
  const error = ref(null)
  const googleError = ref(null)
  const isGoogleConnected = ref(false)
  const googleAccount = ref('')
  const lastSyncedAt = ref(null)
  const abortController = ref(null)

  async function loadData() {
    loading.value = true
    error.value = null
    try {
      const [sessionsData, appointmentsData, clientsData] = await Promise.all([
        listSessions(),
        listScheduledAppointments(),
        listClients()
      ])
      sessions.value = sessionsData
      appointments.value = appointmentsData
      clients.value = clientsData
    } catch (e) {
      console.error('Failed to load Helios schedule:', e)
      error.value = 'Failed to load schedule. Please try again.'
    } finally {
      loading.value = false
    }

    await loadGoogleEvents()
  }

  async function loadGoogleEvents(customRange = null) {
    if (googleLoading.value && abortController.value) abortController.value.abort()

    abortController.value = new AbortController()
    const { signal } = abortController.value
    googleLoading.value = true
    googleError.value = null
    try {
      const statusRes = await authenticatedFetch('/api/google/status', { signal })
      if (!statusRes.ok) throw new Error('Status check failed')

      const statusData = await statusRes.json()
      isGoogleConnected.value = !!statusData.connected
      googleAccount.value = statusData.email || ''
      lastSyncedAt.value = statusData.last_synced_at || null

      if (statusData.error === 'GOOGLE_TOKEN_EXPIRED' || statusData.error === 'GOOGLE_REVOKED') {
        googleError.value = 'RECONNECT_REQUIRED'
        googleEvents.value = []
        return
      }

      if (isGoogleConnected.value) {
        let timeMin, timeMax
        if (customRange) {
          // Centering the 62-day window around the requested range to keep today/upcoming events visible
          timeMin = new Date(customRange.start)
          timeMin.setDate(timeMin.getDate() - 25)
          timeMin.setHours(0, 0, 0, 0)
          timeMax = new Date(timeMin)
          timeMax.setDate(timeMax.getDate() + 62)
        } else {
          timeMin = new Date()
          timeMin.setHours(0, 0, 0, 0)
          timeMin.setDate(timeMin.getDate() - 31)
          timeMax = new Date(timeMin)
          timeMax.setDate(timeMax.getDate() + 62)
        }

        const params = new URLSearchParams({ 
          timeMin: timeMin.toISOString(), 
          timeMax: timeMax.toISOString() 
        })
        const eventsRes = await authenticatedFetch(`/api/google/events?${params.toString()}`, { signal })
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          const newEvents = eventsData.events || []
          
          // Merge strategy: replace events in the fetched range, keep others
          const merged = new Map()
          googleEvents.value.forEach(e => {
            const d = new Date(e.start)
            if (d < timeMin || d >= timeMax) {
              merged.set(e.id, e)
            }
          })
          newEvents.forEach(e => merged.set(e.id, e))
          googleEvents.value = Array.from(merged.values())
        } else {
          const errData = await eventsRes.json().catch(() => ({}))
          if (errData.code === 'GOOGLE_REAUTH_REQUIRED' || eventsRes.status === 403) {
            googleError.value = 'RECONNECT_REQUIRED'
            googleEvents.value = []
          } else if (errData.code !== 'GOOGLE_CONNECTION_NOT_FOUND') {
            googleError.value = 'SYNC_FAILED'
            console.error('Google Calendar events fetch failed:', errData)
          } else {
            isGoogleConnected.value = false
          }
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') return
      console.error('Failed to load Google Calendar events:', e)
      googleError.value = 'SYNC_FAILED'
    } finally {
      googleLoading.value = false
      abortController.value = null
    }
  }

  const normalizedEvents = computed(() => {
    const scheduled = appointments.value.map(appointment => {
      const client = clients.value.find(c => String(c.id) === String(appointment.client_id))
      const startTime = new Date(appointment.starts_at)
      if (isNaN(startTime.getTime())) return null
      const explicitEnd = appointment.ends_at ? new Date(appointment.ends_at) : null
      const endTime = explicitEnd && !isNaN(explicitEnd.getTime())
        ? explicitEnd
        : new Date(startTime.getTime() + 50 * 60000)

      return {
        id: `appointment-${appointment.id}`,
        originalId: appointment.id,
        source: 'appointment',
        clientId: appointment.client_id,
        clientName: client?.display_name || 'Unknown Client',
        start: startTime,
        end: endTime,
        allDay: false,
        status: appointment.status,
        type: 'Appointment',
        isEligibleForStart: isAppointmentEligibleForStart(appointment),
        appointment
      }
    }).filter(Boolean)

    const clinical = sessions.value
      .filter(session => session.startedAt && session.workflowStatus === 'completed' && session.completedAt)
      .map(session => {
        const client = clients.value.find(c => String(c.id) === String(session.clientId))
        const startTime = new Date(session.startedAt)
        if (isNaN(startTime.getTime())) return null
        const endTime = session.endedAt && !isNaN(new Date(session.endedAt).getTime())
          ? new Date(session.endedAt)
          : new Date(startTime.getTime() + 50 * 60000)

        return {
          id: `clinical-${session.id}`,
          originalId: session.id,
          source: 'clinical',
          clientId: session.clientId,
          clientName: client?.display_name || 'Unknown Client',
          start: startTime,
          end: endTime,
          allDay: false,
          status: session.status || 'completed',
          workflowStatus: session.workflowStatus,
          type: session.type || 'Session',
          isEligibleForStart: false,
          session
        }
      })
      .filter(Boolean)

    const external = googleEvents.value.map(event => {
      // Fix for all-day events: parse YYYY-MM-DD as local time to avoid timezone shifts
      const startTime = event.allDay && typeof event.start === 'string' && event.start.length === 10
        ? new Date(event.start + 'T00:00:00')
        : new Date(event.start)
      const endTime = event.allDay && typeof event.end === 'string' && event.end.length === 10
        ? new Date(event.end + 'T00:00:00')
        : new Date(event.end)
      
      if (isNaN(startTime.getTime())) return null

      const title = (event.summary || '').trim()
      const matchingClients = clients.value.filter(c =>
        c.display_name && c.display_name.trim().toLowerCase() === title.toLowerCase()
      )
      const matchedClientId = matchingClients.length === 1 ? matchingClients[0].id : null

      if (matchedClientId) {
        const isDuplicate = [...scheduled, ...clinical].some(item =>
          String(item.clientId) === String(matchedClientId) && item.start.getTime() === startTime.getTime()
        )
        if (isDuplicate) return null
      }

      return {
        id: `google-${event.id}`,
        externalEventId: event.id,
        source: 'google',
        title: title || '(No title)',
        clientName: title || '(No title)',
        start: startTime,
        end: endTime,
        allDay: !!event.allDay,
        status: 'external',
        type: 'External',
        isEligibleForStart: false,
        clientId: matchedClientId,
        location: event.location,
        description: event.description,
        meetingLink: event.meetingLink,
        htmlLink: event.htmlLink || event.link
      }
    }).filter(Boolean)

    return [...scheduled, ...clinical, ...external]
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
      if (!groups[key]) groups[key] = { date, events: [] }
      groups[key].events.push(event)
    })
    return Object.values(groups).sort((a, b) => a.date - b.date)
  }

  return {
    sessions,
    appointments,
    googleEvents,
    clients,
    loading,
    googleLoading,
    error,
    googleError,
    isGoogleConnected,
    googleAccount,
    lastSyncedAt,
    loadData,
    loadGoogleEvents,
    normalizedEvents,
    todayEvents,
    upcomingEvents,
    groupEventsByDay
  }
}
