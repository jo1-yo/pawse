/**
 * Queues in-app feedback for a webhook without making the student wait for the
 * destination (Google Apps Script, Discord, Slack, etc.). Render is a long-lived
 * Node process, so the delivery promise can finish after the HTTP response has
 * already been returned to the app.
 *
 * The structured fields power the Google Doc receiver while `content` and
 * `text` preserve compatibility with Discord and Slack incoming webhooks.
 */

import { randomUUID } from 'node:crypto';

import type { FeedbackRequest } from './schema.js';

const DELIVERY_TIMEOUT_MS = 8_000;
const RETRY_DELAYS_MS = [0, 500, 1_500] as const;

interface FeedbackEnvelope extends FeedbackRequest {
  event: 'pawse.feedback';
  id: string;
  receivedAt: string;
  content: string;
  text: string;
  secret?: string;
}

function makeEnvelope(fb: FeedbackRequest): FeedbackEnvelope {
  const meta = [
    fb.email && `from ${fb.email}`,
    fb.platform && `${fb.platform} v${fb.appVersion ?? '?'}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const text = `📨 Pawse feedback${meta ? ` (${meta})` : ''}:\n${fb.message}`;

  return {
    event: 'pawse.feedback',
    id: randomUUID(),
    receivedAt: new Date().toISOString(),
    ...fb,
    content: text,
    text,
    secret: process.env.FEEDBACK_WEBHOOK_SECRET || undefined,
  };
}

async function postEnvelope(url: string, envelope: FeedbackEnvelope): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
    signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`webhook returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }

  // Google Apps Script cannot reliably choose an HTTP error status, so its
  // JSON body is authoritative when it explicitly reports a failure.
  try {
    const parsed = JSON.parse(body) as { ok?: boolean; error?: string };
    if (parsed.ok === false) throw new Error(parsed.error || 'webhook rejected feedback');
  } catch (err) {
    if (err instanceof SyntaxError) return; // Discord/Slack often return empty or plain text.
    throw err;
  }
}

async function deliverWithRetry(url: string, envelope: FeedbackEnvelope): Promise<void> {
  let lastError: unknown;
  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      await postEnvelope(url, envelope);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/** Queue one feedback message and return its traceable delivery id immediately. */
export function queueFeedback(fb: FeedbackRequest): string {
  const envelope = makeEnvelope(fb);
  const url = process.env.FEEDBACK_WEBHOOK_URL;

  if (!url) {
    console.log('[feedback]', JSON.stringify(envelope));
    return envelope.id;
  }

  void deliverWithRetry(url, envelope).catch((err) => {
    console.error(`[feedback] delivery failed (${envelope.id}):`, err);
  });
  return envelope.id;
}
