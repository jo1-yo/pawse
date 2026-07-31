# Google Calendar direct-write — setup

Pawse can insert your whole week **straight into Google Calendar** (no `.ics`
download) using the Google Calendar API. The code is already wired; it just
needs OAuth **Client IDs**, which only you can create in Google Cloud. Cost:
**$0** (Calendar API is free; no billing needed).

Once created, put the IDs in `app.json → expo.extra.google`. Until then, the
"Google Calendar" button safely falls back to the old `.ics` export.

---

## 1. Create a Google Cloud project (free)

1. Go to <https://console.cloud.google.com/> → **Create Project** → name it "Pawse".
2. **APIs & Services → Library** → search **Google Calendar API** → **Enable**.

## 2. Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen** → User type **External** → Create.
2. Fill App name (**Pawse**), your support email, developer email. Add a
   **privacy policy URL** (required for the sensitive scope later).
3. **Scopes** → Add → search and add `.../auth/calendar.events` (create/edit
   events only — the narrow, easier-to-verify scope).
4. **Test users** → add the Google accounts you'll test with (up to 100).
   > In **Testing** mode these users can use it **immediately, no verification**.
   > For a public launch you'll submit for **sensitive-scope verification**
   > (privacy policy + app details; days–weeks). Plan that before shipping.

## 3. Create OAuth Client IDs

**APIs & Services → Credentials → Create Credentials → OAuth client ID**, once
per platform you want:

### Web (needed to test in the browser / web build)
- Application type: **Web application**
- **Authorized JavaScript origins**: `http://localhost:8081`
- **Authorized redirect URIs**: `http://localhost:8081`
- (Add your deployed web origin later too.)
- → copy the **Web client ID**.

### iOS (for the iPhone build)
- Application type: **iOS**
- Bundle ID: `film.martini.pawse`
- → copy the **iOS client ID**.

### Android (for the Android build)
- Application type: **Android**
- Package name: `film.martini.pawse`
- SHA-1: from your build (`eas credentials`, or debug keystore for local).
- → copy the **Android client ID**.

## 4. Plug the IDs in

Edit `app.json`:

```json
"extra": {
  "backendUrl": "http://localhost:8787",
  "google": {
    "webClientId": "XXXX.apps.googleusercontent.com",
    "iosClientId": "YYYY.apps.googleusercontent.com",
    "androidClientId": "ZZZZ.apps.googleusercontent.com"
  }
}
```

Restart the dev server. Tapping **Google Calendar** now runs the one-time Google
consent, then writes every event into a dedicated **"Pawse"** Google calendar
(re-running clears the old range first, so no duplicates).

## Notes
- **Native redirect (iOS/Android):** the iOS/Android clients use the reversed
  client ID as the redirect scheme. On iOS add it under
  `ios.infoPlist.CFBundleURLTypes` (or the `@react-native-google-signin` config
  plugin) at build time — not needed for web testing.
- Client IDs are **public**, not secrets — the flow uses PKCE, and the app ships
  no client secret.
- **Just want to test fast?** Only the **Web client ID** is needed — it works
  end-to-end in the local web preview at `http://localhost:8081`.
