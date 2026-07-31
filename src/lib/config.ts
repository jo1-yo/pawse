import Constants from 'expo-constants';

/**
 * Base URL of the Pawse backend proxy (the Hono server in `/server`).
 *
 * Resolution order:
 *  1. `extra.backendUrl` in app.json (set this per build / per environment)
 *  2. localhost fallback for `npx expo start` against a locally-run server
 *
 * Users can also override it at runtime in Settings (persisted in the store).
 */
export const DEFAULT_BACKEND_URL: string =
  (Constants.expoConfig?.extra as { backendUrl?: string } | undefined)?.backendUrl ??
  'http://localhost:8787';

/**
 * Google OAuth client IDs for direct Google Calendar write (events.insert).
 * Set these in app.json → expo.extra.google after creating OAuth clients in
 * Google Cloud (see the setup guide). Empty = not configured, and the app
 * falls back to the .ics export path so nothing breaks before they're filled.
 *
 * Only the client ID that matches the current platform is used at runtime:
 *   - web preview / web build → webClientId
 *   - iOS build               → iosClientId
 *   - Android build           → androidClientId
 * These are public identifiers (not secrets); the OAuth flow uses PKCE.
 */
export interface GoogleOAuthConfig {
  webClientId: string;
  iosClientId: string;
  androidClientId: string;
}

export const GOOGLE_OAUTH: GoogleOAuthConfig = {
  webClientId: '',
  iosClientId: '',
  androidClientId: '',
  ...((Constants.expoConfig?.extra as { google?: Partial<GoogleOAuthConfig> } | undefined)?.google ??
    {}),
};

/** The scope for creating/managing Pawse's own events (narrow = easier consent). */
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/** Whether the platform-relevant Google client ID is present. */
export function isGoogleConfigured(platform: 'web' | 'ios' | 'android'): boolean {
  const id =
    platform === 'ios'
      ? GOOGLE_OAUTH.iosClientId
      : platform === 'android'
        ? GOOGLE_OAUTH.androidClientId
        : GOOGLE_OAUTH.webClientId;
  return id.trim().length > 0;
}

/** Short brand strings reused across screens. */
export const BRAND = {
  name: 'Pawse',
  tagline: 'Study smarter. Stress less.',
  blurb:
    'Your calm in college life. Drop in your classes and to-dos — Pawse builds a balanced schedule that gets it all done before the deadline.',
} as const;
