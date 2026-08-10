export const GOOGLE_CALENDAR_READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export function googleScopes(scopeValue = '') {
  return new Set(String(scopeValue || '').split(/\s+/).filter(Boolean));
}

export function hasGoogleCalendarReadScope(scopeValue = '') {
  return googleScopes(scopeValue).has(GOOGLE_CALENDAR_READ_SCOPE);
}
