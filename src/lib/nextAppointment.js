function isLinkedAppointment(appointment) {
  return Boolean(appointment?.zoom_meeting_id || appointment?.zoom_event_id || appointment?.google_event_id)
}

export function nextTimedAppointment({ appointments = [], googleEvents = [], now = new Date() } = {}) {
  const nowMs = now.getTime()

  // The global header should only advertise appointments that have been confirmed
  // by an external scheduling/calendar source. Provisional/orphan rows can remain
  // in the operational table without becoming a false countdown or Join action.
  const internal = appointments
    .filter(isLinkedAppointment)
    .map(appointment => ({
      source: 'appointment',
      start: appointment?.starts_at ? new Date(appointment.starts_at) : null,
      appointment
    }))
    .filter(item => item.start && !Number.isNaN(item.start.getTime()) && item.start.getTime() >= nowMs)

  const external = googleEvents
    .filter(event => !event?.allDay)
    .map(event => ({
      source: 'google',
      start: event?.start ? new Date(event.start) : null,
      event
    }))
    .filter(item => item.start && !Number.isNaN(item.start.getTime()) && item.start.getTime() >= nowMs)

  return [...internal, ...external].sort((a, b) => a.start.getTime() - b.start.getTime())[0] || null
}
