# Deploying Pawse — step by step

Pawse has up to **four** shippable pieces. Do them in this order; each one is
independent and mostly free.

| Piece | What it is | Where it goes | Cost |
|---|---|---|---|
| **1. Backend** | the Hono server (`/server`) — reads timetable photos | Render (free) | $0* |
| **2. Website** | the Expo **web** build of the app | Vercel (free) | $0 |
| **3. Chrome extension** | the side panel (`/extension`) | Chrome Web Store | one-time **$5** |
| **4. iOS app** | the native app | App Store — see [SHIP.md](../SHIP.md) | $99/yr |
| **Analytics** | who visits + what they do | PostHog (free) | $0 |

\* Render's free tier sleeps after 15 min idle (first request then takes ~30s to wake). Fine for a demo; upgrade to $7/mo for always-on later.

You'll need a **GitHub account** with this repo pushed to it. If it isn't on
GitHub yet:

```bash
gh repo create pawse --private --source=. --push
```

---

## Part 1 — Deploy the backend (Render, free)

The website and the extension both call this server to read timetable photos.
Deploy it first so you have its URL.

1. Go to <https://render.com> → sign up with GitHub.
2. **New +** → **Web Service** → connect your `pawse` repo.
3. Fill in:
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. **Environment** → **Add Environment Variable**:
   - `OPENAI_API_KEY` = `sk-…` (your key)
   - (leave `PORT` alone — Render sets it; the server already reads it.)
5. **Create Web Service**. Wait ~2–3 min for the first deploy.
6. You'll get a URL like `https://pawse-server.onrender.com`. Test it:
   ```bash
   curl https://pawse-server.onrender.com/health
   ```
   → `{"ok":true,"service":"pawse-server"}` means you're live.

**Keep this URL** — you'll paste it into the website and the extension.

> Redeploys happen automatically on every `git push`. To change the key later,
> edit the env var in Render → Manual Deploy → Clear build cache & deploy.

---

## Part 2 — Deploy the website (Vercel, free)

The website is the same app, exported as a static web build.

1. Point the app at your deployed backend. Edit [app.json](../app.json) →
   `expo.extra.backendUrl`:
   ```json
   "extra": { "backendUrl": "https://pawse-server.onrender.com", ... }
   ```
2. Build the static site from the repo root:
   ```bash
   npx expo export --platform web
   ```
   This writes a `dist/` folder.
3. Deploy it:
   ```bash
   npm i -g vercel
   vercel deploy dist --prod
   ```
   (First run asks you to log in and name the project.) You'll get a URL like
   `https://pawse.vercel.app`.

   *Alternative (no CLI):* drag-and-drop the `dist` folder onto
   <https://app.netlify.com/drop> — instant free hosting.

> Native-only features (Apple Calendar direct-write, the timetable **photo**
> camera) gracefully fall back on web; typing classes + planning + `.ics`
> export all work.

---

## Part 3 — Publish the Chrome extension

1. Point the extension at the deployed backend and rebuild:
   ```bash
   cd extension
   VITE_BACKEND_URL=https://pawse-server.onrender.com npm run build
   ```
2. Allow that host in the manifest — edit
   [extension/public/manifest.json](../extension/public/manifest.json):
   ```json
   "host_permissions": ["https://pawse-server.onrender.com/*"]
   ```
   then rebuild again (step 1) so `dist/manifest.json` updates.
3. Zip the build:
   ```bash
   cd dist && zip -r ../pawse-extension.zip . && cd ..
   ```
4. Publish:
   - Go to <https://chrome.google.com/webstore/devconsole> → pay the one-time
     **$5** registration.
   - **Add new item** → upload `pawse-extension.zip`.
   - Fill store listing (name, description, the 128px icon, 1–2 screenshots),
     pick a category, set visibility, **Submit for review** (usually a few days).

> Until it's approved you can always **Load unpacked** `extension/dist` locally
> (chrome://extensions → Developer mode).

---

## Part 4 — Analytics with PostHog (free access log)

PostHog Cloud is free up to ~1M events/month — plenty. It gives you a live feed
of visitors, pageviews, and any events you send.

### Create the project
1. Sign up at <https://us.posthog.com> (or eu.posthog.com).
2. Create a project → copy the **Project API key** (`phc_…`) and the **host**
   (`https://us.i.posthog.com`).

### Add it to the website
Create [src/app/+html.tsx](../src/app/+html.tsx) (Expo Router's HTML shell) and
paste PostHog's snippet in `<head>`:

```tsx
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        {/* PostHog */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(t,e){/* paste PostHog's snippet here */}(document,window);
              posthog.init('phc_YOUR_KEY',{api_host:'https://us.i.posthog.com'})`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```
Copy the exact `!function…` loader from PostHog → **Web** install page; only the
`init('phc_…')` line changes. Re-run `npx expo export --platform web` and
redeploy.

### Add it to the extension
In [extension/sidepanel.html](../extension/sidepanel.html), before `</head>`,
paste the same PostHog snippet + `posthog.init('phc_YOUR_KEY', …)`, then
`npm run build`. (Add `https://us.i.posthog.com/*` to the manifest
`host_permissions` so the extension may send events.)

### What you'll see
PostHog → **Activity** shows each visit live (device, location, referrer);
**Web Analytics** shows visitors/pageviews over time. Add custom events later
with `posthog.capture('generated_plan')` etc.

> Prefer zero code? For the **website only**, Vercel's built-in **Web
> Analytics** (Project → Analytics → Enable) is one click and also free.

---

## Cost summary

| | Free option | If you outgrow it |
|---|---|---|
| Backend | Render free (sleeps) | Render $7/mo always-on |
| Website | Vercel / Netlify free | — |
| Extension | $5 one-time | — |
| Analytics | PostHog free (1M/mo) | usage-based |
| iOS | — | Apple $99/yr (SHIP.md) |

**Minimum to go live on web + extension: $5** (the Chrome dev account). The rest
is free.
