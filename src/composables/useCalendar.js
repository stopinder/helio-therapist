import { ref, computed } from 'vue'
import { listSessions } from '../lib/sessions.js'
import { listCalendarAppointments, listClients } from '../lib/clients.js'
import { isEligibleForStart } from '../lib/calendarHelpers.js'
import { authenticatedFetch } from '../lib/api.js'

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
        listCalendarAppointments(),
        listClients()
      ])
      sessions.value = sessionsData
      appointments.value = appointmentsData
      clients.value = clientsData
    } catch (e) {
      console.error('Failed to load clinical schedule:', e)
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
        return
      }
      if (isGoogleConnected.value) {
        let timeMin, timeMax
        if (customRange) {
          timeMin = new Date(customRange.start)
          timeMin.setMilliseconds(0)
          timeMax = new Date(customRange.end)
          timeMax.setMilliseconds(0)
        } else {
          timeMin = new Date()
          timeMin.setHours(0, 0, 0, 0)
          timeMin.setDate(timeMin.getDate() - 31)
          timeMax = new Date(timeMin)
          timeMax.setDate(timeMax.getDate() + 62)
        }
        const params = new URLSearchParams({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() })
        const eventsRes = await authenticatedFetch(`/api/google/events?${params.toString()}`, { signal })
        if (eventsRes.ok) googleEvents.value = (await eventsRes.json()).events || []
        else {
          const errData = await eventsRes.json().catch(() => ({}))
          if (errData.code === 'GOOGLE_REAUTH_REQUIRED' || eventsRes.status === 403) googleError.value = 'RECONNECT_REQUIRED'
          else if (errData.code !== 'GOOGLE_CONNECTION_NOT_FOUND') {
            googleError.value = 'SYNC_FAILED'
            console.error('Google Calendar events fetch failed:', errData)
          } else isGoogleConnected.value = false
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
    const clinical = sessions.value
      .filter(session => session.startedAt && session.workflowStatus === 'completed' && session.completedAt)
      .map(session => {
        const client = clients.value.find(c => String(c.id) === String(session.clientId))
        const start = new Date(session.startedAt)
        if (isNaN(start.getTime())) return null
        const end = session.endedAt && !isNaN(new Date(session.endedAt).getTime())
          ? new Date(session.endedAt)
          : new Date(start.getTime() + 50 * 60000)
        return {
          id: `clinical-${session.id}`,
          originalId: session.id,
          sessionId: session.id,
          source: 'clinical',
          clientId: session.clientId,
          clientName: client?.display_name || 'Unknown Client',
          start,
          end,
          allDay: false,
          status: session.status || 'completed',
          workflowStatus: session.workflowStatus,
          type: session.type || 'Session',
          isEligibleForStart: false,
          session
        }
      })
      .filter(Boolean)

    const heliosAppointments = appointments.value
      .map(appointment => {
        const start = new Date(appointment.starts_at)
        if (isNaN(start.getTime())) return null
        const end = appointment.ends_at && !isNaN(new Date(appointment.ends_at).getTime())
          ? new Date(appointment.ends_at)
          : new Date(start.getTime() + 50 * 60000)
        const client = clients.value.find(c => String(c.id) === String(appointment.client_id))
        const linkedSession = sessions.value.find(session =>
          String(session.clientId) === String(appointment.client_id) &&
          session.startedAt &&
          Math.abs(new Date(session.startedAt).getTime() - start.getTime()) < 5 * 60000 &&
          isEligibleForStart(session)
        )
        return {
          id: `appointment-${appointment.id}`,
          appointmentId: appointment.id,
          googleEventId: appointment.google_event_id || null,
          originalId: linkedSession?.id || appointment.id,
          sessionId: linkedSession?.id || null,
          source: 'appointment',
          clientId: appointment.client_id,
          clientName: client?.display_name || 'Unknown Client',
          start,
          end,
          allDay: false,
          status: appointment.status,
          type: 'Session',
          isEligibleForStart: Boolean(linkedSession),
          appointment
        }
      })
      .filter(Boolean)

    const external = googleEvents.value.map(event => {
      const start = new Date(event.start)
      const end = new Date(event.end)
      if (isNaN(start.getTime())) return null

      const title = (event.summary || '').trim()
      const linkedAppointment = heliosAppointments.find(appointment =>
        appointment.googleEventId && String(appointment.googleEventId) === String(event.id)
      )
      if (linkedAppointment) return null

      const matchingClients = clients.value.filter(client =>
        client.display_name && client.display_name.trim().toLowerCase() === title.toLowerCase()
      )
      const matchedClient = matchingClients.length === 1 ? matchingClients[0] : null
      const clientId = matchedClient?.id || null
      const clientName = matchedClient?.display_name || 'Client not linked'

      const duplicateHelios = clientId && heliosAppointments.some(appointment =>
        String(appointment.clientId) === String(clientId) && appointment.start.getTime() === start.getTime()
      )
      const duplicateClinical = clientId && clinical.some(session =>
        String(session.clientId) === String(clientId) && session.start.getTime() === start.getTime()
      )
      if (duplicateHelios || duplicateClinical) return null

      return {
        id: `google-${event.id}`,
        externalEventId: event.id,
        source: 'google',
        title: title || '(No title)',
        clientName,
        start,
        end,
        allDay: !!event.allDay,
        status: 'external',
        type: 'External',
        isEligibleForStart: false,
        sessionId: null,
        clientId,
        location: event.location,
        description: event.description,
        meetingLink: event.meetingLink,
        htmlLink: event.htmlLink || event.link
      }
    }).filter(Boolean)

    return [...clinical, ...heliosAppointments, ...external]
  })

  const todayEvents = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return normalizedEvents.value.filter(event => event.start >= today && event.start < tomorrow).sort((a, b) => a.start - b.start)
  })

  const upcomingEvents = computed(() => {
    const now = new Date()
    return normalizedEvents.value.filter(event => event.start > now).sort((a, b) => a.start - b.start)
  })

  function groupEventsByDay(list) {
    const groups = {}
    list.forEach(event => {
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
