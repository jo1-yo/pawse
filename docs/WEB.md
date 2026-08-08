# Putting Pawse on the web

The Expo app already builds to a plain static site — same code as iOS/Android,
rendered with `react-native-web`. This is the whole path from `npm run build:web`
to a custom domain.

---

## 1. Build it

```bash
npm run build:web
```

That runs `expo export --platform web` and writes `dist/`:

- `index.html`, `onboarding.html`, `settings.html`, `+not-found.html` — statically
  pre-rendered (`web.output: "static"` in `app.json`)
- `_expo/static/js/web/entry-<hash>.js` — the app bundle (~1.5 MB)
- everything in `public/` copied verbatim to the root (that's where `og.png` lives)

Preview the exact bundle you're about to ship:

```bash
npx serve dist -l 4173
```

Clean URLs (`/settings`, not `/settings.html`) need a host that maps them — see
`vercel.json` / `render.yaml` below. `npx serve` does it locally by default.

---

## 2. Deploy

### Option A — Vercel (recommended)

`vercel.json` is already committed: build command, `cleanUrls`, immutable
caching on hashed assets. Nothing to configure in the dashboard.

```bash
npx vercel login
npx vercel --prod
```

First run asks to link the directory to a project — accept the defaults; it
reads `vercel.json` for the rest. You get a `*.vercel.app` URL immediately.

Set the canonical origin so `og:image` and `<link rel="canonical">` point at the
real domain (Project → Settings → Environment Variables):

```
EXPO_PUBLIC_SITE_URL = https://your-domain.com
```

Redeploy after setting it — it's inlined at build time, not read at runtime.

### Option B — Render (same dashboard as the backend)

`render.yaml` now declares a second service, `pawse-web`, alongside
`pawse-server`. In Render: **New + → Blueprint → pick this repo**, and it picks
up both. Custom domain lives under that service's Settings → Custom Domains.

Either way the backend stays where it is (`pawse-server.onrender.com`) — the
server sends `Access-Control-Allow-Origin: *`, so the browser build calls it
cross-origin without changes.

---

## 3. Point a domain at it

The site's domain is **paws3.com**, registered at Domain.com.

In Vercel: Project → Settings → Domains → Add `paws3.com`. It will offer to add
`www.paws3.com` too — take it, and point the apex at the www version or vice
versa so only one is canonical.

Vercel then shows the exact records to create. **Copy them from that screen** —
don't reuse values from a blog post or an older version of this file. The apex
is an `A` record, and the `www` CNAME target is now *per-project* (it looks like
`d1d4fc829fe7bc7c.vercel-dns-017.com`, not a shared `cname.vercel-dns.com`).

Add those records at Domain.com under the domain's DNS settings. Delegating
nameservers to Vercel instead also works, but then every record — including any
future MX record for email on this domain — has to be recreated in Vercel.

HTTPS is issued automatically once DNS resolves: usually minutes, occasionally
a few hours.

Finally set `EXPO_PUBLIC_SITE_URL=https://paws3.com` in the Vercel project's
environment variables and redeploy — it's inlined at build time, so the
canonical and og:image URLs only pick it up on the next build.

---

## What the web build does *not* do

Worth knowing before you send the link around:

- **Calendar writes** fall back to `.ics` download. Native `expo-calendar` needs
  a real app; on web the user downloads a file and imports it. Direct Google
  Calendar write needs `extra.google.webClientId` in `app.json` (see
  `docs/google-calendar-setup.md`) — it's empty right now.
- **Timetable photo import** uses the web file picker (`ClassPhotoZone.web.tsx`),
  which works, but there's no camera capture.
- **Data is per-browser.** `AsyncStorage` maps to `localStorage`, so a plan made
  on a laptop doesn't appear on a phone. Same as the native app — no accounts.
