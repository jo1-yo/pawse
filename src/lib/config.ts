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

/** Short brand strings reused across screens. */
export const BRAND = {
  name: 'Pawse',
  tagline: 'Study smarter. Stress less.',
  blurb:
    'Your calm in college life. Drop in your classes and to-dos — Pawse builds a balanced schedule that gets it all done before the deadline.',
} as const;
