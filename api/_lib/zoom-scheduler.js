const ZOOM_API_BASE = 'https://api.zoom.us/v2';

async function zoomSchedulerRequest(accessToken, path, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${ZOOM_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Zoom Scheduler request failed (${response.status})`);
    error.status = response.status;
    error.code = body?.code || null;
    throw error;
  }
  return body;
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

export function summarizeZoomSchedulerProbe(schedules, availability) {
  const activeSchedules = schedules.filter((schedule) => schedule?.active !== false);
  const days = Array.isArray(availability?.days) ? availability.days : [];
  const availableSlots = days.flatMap((day) =>
    (Array.isArray(day?.spots) ? day.spots : [])
      .filter((spot) => spot?.status === 'available' && spot?.start_time)
      .map((spot) => ({ startTime: spot.start_time, availableNumber: spot.available_number ?? null }))
  );

  return {
    scheduleCount: schedules.length,
    activeScheduleCount: activeSchedules.length,
    scheduleId: availability?.schedule_id || null,
    duration: availability?.duration || null,
    availableSlotCount: availableSlots.length,
    firstAvailableSlots: availableSlots.slice(0, 10)
  };
}
