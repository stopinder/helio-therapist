/**
 * Video Provider Service
 *
 * Keeps provider-specific labels and meeting-opening behaviour in one place.
 */

import { VIDEO_PROVIDERS } from '../mocks/sessionWorkspaceData.js';

export const videoProviderService = {
  getProviderLabel(provider) {
    return VIDEO_PROVIDERS[provider] || 'Video';
  },

  getVideoActionLabel(session) {
    if (!session) return 'Join';
    return session.status === 'In Progress' ? 'Return' : 'Join';
  },

  canJoinSession(session) {
    return !!(session && session.meetingUrl && !session.isInPerson);
  },

  openMeeting(session) {
    if (this.canJoinSession(session)) {
      window.open(session.meetingUrl, '_blank', 'noopener,noreferrer');
    }
  }
};

/**
 * SECURITY NOTES:
 * - Meeting URLs may contain sensitive access details (PII or meeting passwords).
 * - Provider tokens (OAuth) must NEVER be stored in frontend code (localStorage, etc.).
 * - OAuth secrets must NEVER be exposed to the browser.
 * - External links MUST use rel="noopener noreferrer" to prevent tabnabbing.
 * - Provider integrations require server-side token handling and secure session management.
 * - Authorization must determine who can view or launch a meeting link based on clinician roles.
 */
