const ZOOM_API_BASE = 'https://api.zoom.us/v2';

async function request(accessToken, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${ZOOM_API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || `Zoom Scheduler request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function listZoomSchedulerSchedules(accessToken) {
  const payload = await request(accessToken, '/scheduler/schedules');
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function createZoomSchedulerSingleUseLink(accessToken, scheduleId) {
  if (!scheduleId) throw new Error('A Zoom Scheduler schedule ID is required');
  return request(accessToken, '/scheduler/schedules/single_use_link', {
    method: 'POST',
    body: { schedule_id: scheduleId }
  });
}
