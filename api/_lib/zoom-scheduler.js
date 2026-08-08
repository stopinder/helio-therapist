const ZOOM_API_BASE = 'https://api.zoom.us/v2';

function zoomSchedulerErrorMessage(payload, status) {
  const candidate = payload?.message ?? payload?.error ?? payload?.errors;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (candidate && typeof candidate === 'object') {
    try {
      const text = JSON.stringify(candidate);
      if (text && text !== '{}') return text.slice(0, 1200);
    } catch {}
  }
  if (payload && typeof payload === 'object') {
    try {
      const text = JSON.stringify(payload);
      if (text && text !== '{}') return text.slice(0, 1200);
    } catch {}
  }
  return `Zoom Scheduler request failed (${status})`;
}

async function zoomSchedulerRequest(accessToken, path, { fetchImpl = fetch, method = 'GET', body } = {}) {
  const response = await fetchImpl(`${ZOOM_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(zoomSchedulerErrorMessage(payload, response.status));
    error.status = response.status;
    error.code = payload?.code || null;
    throw error;
  }
  return payload;
}

export async function listZoomSchedulerSchedules(accessToken, options = {}) {
  const body = await zoomSchedulerRequest(accessToken, '/scheduler/schedules', options);
  return Array.isArray(body?.items) ? body.items : [];
}

export async function getZoomSchedulerAvailableTimes(accessToken, scheduleId, options = {}) {
  if (!scheduleId) throw new Error('A Zoom Scheduler schedule ID is required');
  return zoomSchedulerRequest(
    accessToken,
    `/scheduler/schedules/${encodeURIComponent(scheduleId)}/available_times`,
    options
  );
}

export async function createZoomSchedulerBooking(accessToken, booking, options = {}) {
  return zoomSchedulerRequest(accessToken, '/scheduler/attendee', {
    ...options,
    method: 'POST',
    body: booking
  });
}

export async function getZoomSchedulerEvent(accessToken, eventId, options = {}) {
  if (!eventId) throw new Error('A Zoom Scheduler event ID is required');
  return zoomSchedulerRequest(accessToken, `/scheduler/events/${encodeURIComponent(eventId)}`, options);
}

export async function deleteZoomSchedulerEvent(accessToken, eventId, options = {}) {
  if (!eventId) throw new Error('A Zoom Scheduler event ID is required');
  return zoomSchedulerRequest(accessToken, `/scheduler/events/${encodeURIComponent(eventId)}`, {
    ...options,
    method: 'DELETE'
  });
}

export function listAvailableZoomSchedulerSlots(availability) {
  const days = Array.isArray(availability?.days) ? availability.days : [];
  return days.flatMap((day) =>
    (Array.isArray(day?.spots) ? day.spots : [])
      .filter((spot) => spot?.status === 'available' && spot?.start_time)
      .map((spot) => ({ startTime: spot.start_time, availableNumber: spot.available_number ?? null }))
  );
}

export function summarizeZoomSchedulerProbe(schedules, availability) {
  const activeSchedules = schedules.filter((schedule) => schedule?.active !== false);
  const availableSlots = listAvailableZoomSchedulerSlots(availability);

  return {
    scheduleCount: schedules.length,
    activeScheduleCount: activeSchedules.length,
    scheduleId: availability?.schedule_id || null,
    duration: availability?.duration || null,
    availableSlotCount: availableSlots.length,
    firstAvailableSlots: availableSlots.slice(0, 10)
  };
}
