// Must stay the FIRST import: static imports hoist above module code, so the
// .env load has to ride a side-effect module to run before the others.
import './env.js';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { makeChatReply } from './chat.js';
import { forwardFeedback } from './feedback.js';
import { extractCourses, makePlan } from './plan.js';
import { ChatRequestZ, FeedbackRequestZ, ParseClassesRequestZ, PlanRequestZ } from './schema.js';

const app = new Hono();

app.use('*', cors());

// ---- tiny in-memory rate limiter (per IP, sliding window) -------------------
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

function clientKey(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('fly-client-ip') ||
    'local'
  );
}

// ---- routes -----------------------------------------------------------------
app.get('/health', (c) => c.json({ ok: true, service: 'pawse-server' }));

// Public privacy policy — the URL the App Store & Chrome Web Store require.
app.get('/privacy', (c) =>
  c.html(`<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pawse — Privacy Policy</title>
<style>body{max-width:720px;margin:40px auto;padding:0 20px;font:16px/1.6 -apple-system,system-ui,sans-serif;color:#1d1d1f}h1{font-size:28px}h2{font-size:19px;margin-top:32px}small{color:#666}a{color:#1d1d1f}</style>
</head><body>
<h1>Pawse — Privacy Policy</h1>
<small>Last updated: 2026-07-30</small>
<p>Pawse is a study planner (iOS app, website, and Chrome extension) that turns your classes and deadlines into a weekly schedule. This policy explains what we do — and don't — do with your information.</p>
<h2>What stays on your device</h2>
<p>Your tasks, classes, generated schedule, and settings are stored <strong>locally on your own device</strong> (browser storage / on-device app storage). We do not have accounts, and this information is never sent to us or anyone else.</p>
<h2>Timetable photos</h2>
<p>If you choose to add classes by <strong>photo</strong>, that single image is sent to Pawse's own server, which passes it to an AI vision provider (OpenAI) <strong>only</strong> to read the class names and times printed on it. The image is processed in memory and is <strong>not stored, logged, or shared</strong>, and is never used for advertising or sold to anyone. If you type or paste your classes instead, no image is sent.</p>
<h2>What we do NOT collect</h2>
<p>No names, emails, passwords, payment details, location, browsing history, or analytics profiles. Pawse does not track you across sites.</p>
<h2>Permissions (Chrome extension)</h2>
<ul>
<li><strong>Side panel</strong> — to show Pawse in the browser's side panel.</li>
<li><strong>Clipboard read</strong> — only when you press "Paste", to grab a timetable screenshot you copied.</li>
<li><strong>Access to the Pawse server</strong> — to send a timetable photo for reading, as described above.</li>
</ul>
<h2>Data selling &amp; transfer</h2>
<p>We do not sell or transfer your data to third parties, do not use it for any purpose unrelated to building your schedule, and do not use it to determine creditworthiness or for lending.</p>
<h2>Contact</h2>
<p>Questions? Email <a href="mailto:janezhang555l@gmail.com">janezhang555l@gmail.com</a>.</p>
</body></html>`),
);

app.post('/api/plan', async (c) => {
  if (rateLimited(clientKey(c.req.raw.headers))) {
    return c.json({ error: 'Too many requests. Give Pawse a minute. 🐱' }, 429);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }
  const parsed = PlanRequestZ.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, 400);
  }
  try {
    const plan = await makePlan(parsed.data);
    return c.json(plan);
  } catch (err) {
    console.error('[plan] error:', err);
    return c.json({ error: (err as Error).message || 'Failed to build your schedule.' }, 502);
  }
});

app.post('/api/parse-classes', async (c) => {
  if (rateLimited(clientKey(c.req.raw.headers))) {
    return c.json({ error: 'Too many requests. Give Pawse a minute. 🐱' }, 429);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }
  const parsed = ParseClassesRequestZ.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, 400);
  }
  try {
    const courses = await extractCourses(parsed.data);
    return c.json({ courses });
  } catch (err) {
    console.error('[parse-classes] error:', err);
    return c.json({ error: 'Could not read the schedule photo right now.' }, 502);
  }
});

app.post('/api/chat', async (c) => {
  if (rateLimited(clientKey(c.req.raw.headers))) {
    return c.json({ error: 'Too many messages. Take a breath with Pawse. 🐱' }, 429);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }
  const parsed = ChatRequestZ.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request.' }, 400);
  }
  try {
    const reply = await makeChatReply(parsed.data.messages);
    return c.json({ reply });
  } catch (err) {
    console.error('[chat] error:', err);
    return c.json({ error: (err as Error).message || 'Pawse could not reply right now.' }, 502);
  }
});

app.post('/api/feedback', async (c) => {
  if (rateLimited(clientKey(c.req.raw.headers))) {
    return c.json({ error: 'Too many messages — try again in a minute.' }, 429);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }
  const parsed = FeedbackRequestZ.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Please include a message.' }, 400);
  }
  try {
    await forwardFeedback(parsed.data);
    return c.json({ ok: true });
  } catch (err) {
    console.error('[feedback] error:', err);
    return c.json({ error: 'Could not send feedback right now.' }, 502);
  }
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`🐱 Pawse server listening on http://localhost:${port}`);
