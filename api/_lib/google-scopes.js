export const GOOGLE_CALENDAR_READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
export const GOOGLE_CALENDAR_FULL_SCOPE = 'https://www.googleapis.com/auth/calendar';

export function googleScopes(scopeValue = '') {
  return new Set(String(scopeValue || '').split(/\s+/).filter(Boolean));
}

export function hasGoogleCalendarReadScope(scopeValue = '') {
  const scopes = googleScopes(scopeValue);
  return scopes.has(GOOGLE_CALENDAR_READ_SCOPE) || scopes.has(GOOGLE_CALENDAR_FULL_SCOPE);
}
