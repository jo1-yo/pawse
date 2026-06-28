import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { makeChatReply } from './chat.js';
import { forwardFeedback } from './feedback.js';
import { makePlan } from './plan.js';
import { ChatRequestZ, FeedbackRequestZ, PlanRequestZ } from './schema.js';

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
