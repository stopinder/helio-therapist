/**
 * Video Provider Service (Mock)
 * 
 * Future integration boundaries:
 * - Google Workspace integration
 * - Zoom OAuth integration
 * - Calendar sync
 * - Provider-specific meeting creation
 * - Tenant-level admin settings
 * - Encrypted token storage
 * - Server-side token refresh
 */

import { VIDEO_PROVIDERS } from '../mocks/sessionWorkspaceData.js';

export const videoProviderService = {
  /**
   * Returns a friendly label for the provider.
   * @param {string} provider - Provider ID (zoom, microsoft_teams, etc.)
   * @returns {string}
   */
  getProviderLabel(provider) {
    return VIDEO_PROVIDERS[provider] || 'Video';
  },

  /**
   * Returns the appropriate action label (Join/Return) for a session.
   * @param {Object} session - The session object.
   * @returns {string}
   */
  getVideoActionLabel(session) {
    if (!session) return 'Join Video Session';
    const action = session.status === 'In Progress' ? 'Return to' : 'Join';
    return `${action} Video Session`;
  },

  /**
   * Determines if a session can be joined via video.
   * @param {Object} session - The session object.
   * @returns {boolean}
   */
  canJoinSession(session) {
    return !!(session && session.meetingUrl && !session.isInPerson);
  },

  /**
   * Opens the meeting URL in a new tab securely.
   * @param {Object} session - The session object.
   */
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
 * - Future provider integrations require server-side token handling and secure session management.
 * - Authorization must determine who can view or launch a meeting link based on clinician roles.
 */
