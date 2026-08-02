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
  const googleAccount = ref('')
  const lastSyncedAt = ref(null)
  const abortController = ref(null)

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

  async function loadGoogleEvents(customRange = null) {
    if (googleLoading.value && abortController.value) {
      abortController.value.abort()
    }
    
    abortController.value = new AbortController()
    const { signal } = abortController.value

    googleLoading.value = true
    googleError.value = null
    try {
      // First check status to avoid unnecessary errors
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
          // Normalize to avoid millisecond/DST issues with backend range check
          timeMin = new Date(customRange.start)
          timeMin.setMilliseconds(0)
          timeMax = new Date(customRange.end)
          timeMax.setMilliseconds(0)
        } else {
          // Fallback to reasonable window if no range provided
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
          googleEvents.value = eventsData.events || []
        } else {
          const errData = await eventsRes.json().catch(() => ({}))
          if (errData.code === 'GOOGLE_REAUTH_REQUIRED' || eventsRes.status === 403) {
            googleError.value = 'RECONNECT_REQUIRED'
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
    const clinical = sessions.value
      .filter(session => session.startedAt) // Safety check
      .filter(session => {
        // Only include Helios sessions that have an explicit completed clinical state
        // and a valid completed_at timestamp. 
        // This excludes drafts, workspace openings, and active sessions.
        return session.workflowStatus === 'completed' && session.completedAt
      })
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
          allDay: false,
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

      // Matching logic: Match a Google title only when it equals exactly one Helios client display name
      const title = (event.summary || '').trim()
      const matchingClients = clients.value.filter(c => 
        c.display_name && c.display_name.trim().toLowerCase() === title.toLowerCase()
      )
      
      let matchedClientId = null
      if (matchingClients.length === 1) {
        matchedClientId = matchingClients[0].id
      }

      // Conservative deduplication: If a clinical session exists at the exact same start time 
      // with the same matched client, hide the Google event.
      if (matchedClientId) {
        const isDuplicate = clinical.some(c => 
          String(c.clientId) === String(matchedClientId) && 
          c.start.getTime() === startTime.getTime()
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
