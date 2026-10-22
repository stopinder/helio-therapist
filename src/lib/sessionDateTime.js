/**
 * Therapy encounter date/time is entered in the therapist's device-local timezone.
 * A transcript's receivedAt is its IMPORT timestamp, not a clinical encounter time.
 */
export function localSessionDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Please enter a valid session date and time.');
  }
  const two = value => String(value).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`,
    time: `${two(date.getHours())}:${two(date.getMinutes())}`
  };
}

export function localSessionDateTimeToUtc(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) {
    throw new Error('Please enter a valid session date and time.');
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);
  // Reject nonexistent local times (e.g. during DST spring transition)
  // and invalid calendar values rather than silently changing the encounter.
  if (!Number.isFinite(result.getTime()) ||
      result.getFullYear() !== year || result.getMonth() !== month - 1 ||
      result.getDate() !== day || result.getHours() !== hour ||
      result.getMinutes() !== minute) {
    throw new Error('That session date or local time is invalid. Please check it.');
  }
  return result.toISOString();
}
