/**
 * The Google-Calendar connection: an OAuth access token (scope
 * `calendar.events`) for the direct-write path in `lib/googleCalendar.ts`.
 *
 * `expo-auth-session`'s Google provider is a hook, so this thin wrapper lives
 * at the component layer; the actual REST writes stay in a pure module. Works
 * on web (popup → current origin) and native (system browser → app scheme).
 *
 * `promptAsync()` resolves with the result, so callers can connect-then-write
 * in one go: `const t = await ensureToken(); if (t) addPlanToGoogleCalendar(...)`.
 */

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { GOOGLE_CALENDAR_SCOPE, GOOGLE_OAUTH, isGoogleConfigured } from '@/lib/config';
import { usePlanStore } from '@/store/usePlanStore';

// Dismisses the OAuth popup and completes the flow on web.
WebBrowser.maybeCompleteAuthSession();

/** 60s of slack so we never hand out a token about to expire mid-write. */
const EXPIRY_SLACK_MS = 60_000;

// Google.useAuthRequest throws if the current platform's client ID is empty,
// and hooks can't be called conditionally — so feed a sentinel when unset. It's
// never used: `configured` (the real check) gates every promptAsync() call.
const UNSET = 'unconfigured.apps.googleusercontent.com';

function currentPlatform(): 'web' | 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
}

export function useGoogleCalendar() {
  const token = usePlanStore((s) => s.googleAccessToken);
  const expiresAt = usePlanStore((s) => s.googleTokenExpiresAt);
  const setGoogleToken = usePlanStore((s) => s.setGoogleToken);
  const clearGoogleToken = usePlanStore((s) => s.clearGoogleToken);

  const configured = isGoogleConfigured(currentPlatform());

  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_OAUTH.webClientId || UNSET,
    iosClientId: GOOGLE_OAUTH.iosClientId || UNSET,
    androidClientId: GOOGLE_OAUTH.androidClientId || UNSET,
    scopes: ['openid', GOOGLE_CALENDAR_SCOPE],
  });

  /** Run the OAuth consent flow; store + return the fresh access token. */
  const connect = useCallback(async (): Promise<string | null> => {
    if (!configured) return null;
    const result = await promptAsync();
    if (result?.type === 'success' && result.authentication) {
      const { accessToken, expiresIn } = result.authentication;
      setGoogleToken(accessToken, Date.now() + (expiresIn ?? 3600) * 1000);
      return accessToken;
    }
    return null;
  }, [configured, promptAsync, setGoogleToken]);

  /** Reuse a live (non-expired) token, or run OAuth to get one. Date.now runs
   *  here at call time — not during render — to stay purity-rule compliant. */
  const ensureToken = useCallback(async (): Promise<string | null> => {
    const live = token && expiresAt && expiresAt - EXPIRY_SLACK_MS > Date.now() ? token : null;
    return live ?? (await connect());
  }, [token, expiresAt, connect]);

  return {
    /** OAuth client for this platform is set in app.json → can attempt to link. */
    configured,
    /** The auth request finished loading; promptAsync is safe to call. */
    ready: !!request,
    /** A Google token is stored (a stale one is refreshed on the next write). */
    connected: !!token,
    connect,
    ensureToken,
    disconnect: clearGoogleToken,
  };
}
