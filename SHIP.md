# Shipping Pawse to the App Store

A complete path from "fresh repo, no Apple account" to "live on the App Store."
Everything here is doable on a Mac with **Node + `eas-cli`** — **no Xcode
required** (EAS builds and signs in the cloud).

Rough time: ~2–3 focused hours of your work, plus **1–3 days** waiting on Apple
Developer enrollment, and ~24h for App Review at the end.

---

## 0. Prerequisites

- A Mac with **Node 20+** and **Git**.
- **`eas-cli`**: `npm install -g eas-cli`
- A free **Expo account**: `eas login` (create one when prompted).
- A **fal.ai** account + **`FAL_KEY`** (the only AI secret — same kind you use in Martini).
- A paid **Apple Developer Program** membership — **$99/year** (Step 4 walks through enrollment).

---

## 1. Get a FAL_KEY

From the fal.ai dashboard, create an API key. Keep it secret — it goes on the
**server only**, never in the app.

---

## 2. Deploy the backend (the AI proxy)

The app calls your server; the server calls the model. Pick any Node host. Two
easy options:

### Option A — Fly.io (recommended; you already know it from Martini)

```bash
cd server
npm install
fly launch --no-deploy          # edit fly.toml app name to something unique
fly secrets set FAL_KEY=your-real-fal-key
fly deploy
```

Your server is now at `https://<your-app>.fly.dev`. Verify:

```bash
curl https://<your-app>.fly.dev/health     # {"ok":true,"service":"pawse-server"}
```

### Option B — Render / Railway / any Node host

- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Set env var **`FAL_KEY`**. (Optional: `PLAN_MODEL`, `VISION_MODEL`.)
- The provided `Dockerfile` also works on any container host.

> The server has a tiny built-in per-IP rate limit (12 req/min). Bump it in
> `server/src/index.ts` if you need to.

---

## 3. Point the app at your deployed backend

Edit `app.json` and add your server URL under `expo.extra` so production builds
use it automatically:

```jsonc
{
  "expo": {
    // ...
    "extra": {
      "backendUrl": "https://<your-app>.fly.dev"
    }
  }
}
```

(Users can still override it in the app's **Settings** tab — handy for testing.)

---

## 4. Enroll in the Apple Developer Program

1. Create/sign in to an **Apple Account** and turn on **two-factor auth**.
2. Go to <https://developer.apple.com/programs/enroll/>.
3. Choose **Individual / Sole Proprietor** (no D-U-N-S needed; your *legal* name
   becomes the seller name). Pick **Organization** only if you want a company
   name as the seller (requires a free D-U-N-S number, slower).
4. Use your **legal name** (nicknames cause delays), address, and a payment method.
5. Pay **$99**. Approval is typically **1–3 days** for individuals.

You can do everything up to Step 8 (production build) while you wait.

---

## 5. Configure EAS in the project

```bash
# from the repo root
eas login
eas build:configure          # confirms the iOS config, writes the EAS project id
```

The repo already ships an `eas.json` with `development`, `preview`, and
`production` profiles, plus a `submit.production.ios` block you'll fill in at
Step 9.

**Bundle identifier:** it's preset to `film.martini.pawse` in `app.json`. It must
be globally unique on the App Store. Keep it, or change it to your own
reverse-DNS (e.g. `com.yourname.pawse`) — change it in **both** `ios.bundleIdentifier`
and `android.package`.

---

## 6. Make a development build (test on a real iPhone)

`expo-calendar` (and the date picker) use native code, so Pawse **cannot run in
Expo Go** — you need a development build. This also exercises the real calendar
export before you ship.

```bash
eas device:create                                  # register your iPhone's UDID (follow the link)
eas build --profile development --platform ios     # cloud build (~10–20 min)
```

Install the resulting build on your phone (EAS gives you a QR/link), then:

```bash
npx expo start --dev-client
```

Smoke-test the full loop: add a couple of tasks + a timetable photo → **Generate
Smart Schedule** → check the week → **Add to Apple Calendar** → confirm events
land in a new "Pawse" calendar → **Export (.ics)** → confirm the share sheet adds
them to Google Calendar.

---

## 7. App icon & launch screen (already set, customize if you like)

- App icon: `assets/images/pawse-icon.png` (1024×1024, cat-on-pink).
- Splash: `assets/images/pawse-splash.png` on `#0a0a0f`.
- Source vectors: `assets/pawse-icon.svg` / `assets/pawse-splash.svg` — edit
  these and re-export to PNG if you want to refine the art. (Apple requires the
  icon to have **no transparency**; Expo flattens it during the build, so the
  source PNG's alpha is fine.)

---

## 8. Production build

```bash
eas build --profile production --platform ios
```

EAS auto-manages your **Distribution Certificate** and **Provisioning Profile**
(it'll prompt for Apple credentials the first time — Apple ID + app-specific
password, or an App Store Connect API key). Output: a signed `.ipa` on EAS.

---

## 9. Create the App Store Connect app record

EAS doesn't create the listing — you do, once:

1. **Register the bundle ID** (if EAS didn't already): developer.apple.com →
   Certificates, IDs & Profiles → Identifiers → **+** → App IDs →
   `film.martini.pawse`.
2. **Create the app**: <https://appstoreconnect.apple.com> → **My Apps** → **+**
   → New App → iOS, name **Pawse**, primary language, the bundle ID, and any
   **SKU** (e.g. `pawse-001`).
3. Copy the numeric **Apple ID** it shows — that's your `ascAppId`.
4. Fill in `eas.json` → `submit.production.ios`:
   - `appleId`: your Apple Account email
   - `ascAppId`: the numeric Apple ID from step 3
   - `appleTeamId`: from developer.apple.com → Membership details

---

## 10. Submit the build

```bash
eas submit --profile production --platform ios
# or build + submit in one shot next time:
eas build --profile production --platform ios --auto-submit
```

The build appears in App Store Connect under **TestFlight** after processing
(~5–15 min).

---

## 11. Fill in the App Store listing (required to submit)

In App Store Connect for the Pawse app:

- **Name** (≤30 chars), **subtitle** (≤30), **description**, **keywords**,
  **support URL**, **promotional text**.
- **Privacy Policy URL** — **required**. Host a simple page. It must mention that
  schedule text/photos and chat messages are **sent to a third-party AI provider
  (fal.ai → Anthropic/Google)** to generate the schedule, and that Pawse stores
  data **locally on the device** (no account).
- **Screenshots** — exact sizes, no off-by-one:
  - **iPhone 6.9″: 1320 × 2868 px** (required primary). 6.7″ **1290 × 2796** is
    an accepted fallback. Apple down-scales these to smaller iPhones.
  - You set `supportsTablet: false`, so **no iPad screenshots needed.**
  - Capture them from the iOS Simulator (Plan screen, schedule, chat).
- **App Privacy "nutrition label"** — answer the questionnaire. For Pawse v1,
  declare roughly: *User Content* (the schedule/tasks/photos/chat you send to the
  AI), and *Diagnostics* only if you add crash reporting. **Not linked to
  identity, not used for tracking** (you have no accounts/ad SDKs). Be accurate.
- **Age rating** — fill out the (expanded, 2026) questionnaire. Pawse is **4+**;
  there's no objectionable content. Note the chat is an AI assistant, not
  user-to-user.

---

## 12. TestFlight (optional but recommended)

- **Internal testing**: add yourself/teammates (up to 100) — no beta review,
  available right after processing. Great for a final real-device pass.
- **External testing**: up to 10,000 testers via a public link; the first
  external build needs a quick **Beta App Review**.

---

## 13. Submit for review

In App Store Connect → your app → the version → attach the build → **Add for
Review** → **Submit**. First reviews usually return within **~24 hours**.

---

## 14. App Review risk checklist (tuned for Pawse)

The big rejection causes for an AI student-scheduling app, and where Pawse stands:

| Risk | Status in Pawse v1 | Action if you change things |
|---|---|---|
| **Account deletion (5.1.1)** | ✅ N/A — no accounts. "Clear all data" wipes the device. | If you add login, you MUST add in-app account deletion. |
| **Sign in with Apple (4.8)** | ✅ N/A — no third-party login. | If you add Google/Facebook login, you must also offer Sign in with Apple. |
| **Undisclosed AI data sharing (5.1.2(i))** | ⚠️ **Do this:** disclose in your Privacy Policy + App Privacy that schedule/photos/chat go to a third-party AI. The in-app copy already frames it as "Pawse builds your schedule." | Keep the privacy label in sync with what you send. |
| **AI-generated content / chat (1.2, 4.2.3)** | ✅ Chat is a scoped wellness assistant with a crisis-redirect in its system prompt; no user-to-user content. | If you add open user content, add report/block/moderation. |
| **Minimum functionality / web-wrapper (4.2)** | ✅ Real native features: calendar write, local notifications-ready, offline schedule, image capture. Not a thin wrapper. | — |
| **Permission strings (5.1.1)** | ✅ Calendar + photo + camera usage strings are set and specific in `app.json`. | Keep them specific if you add permissions. |
| **Privacy Policy URL** | ⚠️ **Required** — host one before submitting. | — |
| **Export compliance** | ✅ `ITSAppUsesNonExemptEncryption: false` (standard HTTPS only) avoids the per-submit prompt. | Set true only if you add non-exempt crypto. |

---

## 15. Shipping updates later

1. Make your changes; bump `version` in `app.json` (e.g. `1.0.1`). With
   `appVersionSource: "remote"` + `autoIncrement`, EAS handles `buildNumber`.
2. `eas build --profile production --platform ios --auto-submit`
3. In App Store Connect, create the new version, attach the build, submit.

> **JS-only changes** can ship over-the-air with EAS Update without a new
> binary; **native/config changes** (anything in `app.json` plugins, permissions,
> icon) require a new build + review. Calendar/permission changes are native.
