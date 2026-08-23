function isSampleAppointment(appointment) {
  return Boolean(appointment?.is_sample || String(appointment?.client_reference || '').startsWith('SAMPLE-'))
}

export function nextTimedAppointment({ appointments = [], googleEvents = [], now = new Date() } = {}) {
  const nowMs = now.getTime()

  const internal = appointments
    .filter(appointment => !isSampleAppointment(appointment))
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
