/**
 * Forwards in-app feedback to wherever the founder wants to receive it, set via
 * the single env var FEEDBACK_WEBHOOK_URL. The payload is sent with both
 * `content` (Discord) and `text` (Slack) keys, so a free Discord or Slack
 * incoming webhook works out of the box — and you can point it at any HTTP
 * intake later (Productlane/Zapier/your own) without an app update.
 *
 * If FEEDBACK_WEBHOOK_URL is unset, feedback is just logged (still captured in
 * your server logs). No third-party account is required to start.
 */

import type { FeedbackRequest } from './schema.js';

export async function forwardFeedback(fb: FeedbackRequest): Promise<void> {
  const meta = [fb.email && `from ${fb.email}`, fb.platform && `${fb.platform} v${fb.appVersion ?? '?'}`]
    .filter(Boolean)
    .join(' · ');
  const text = `📨 Pawse feedback${meta ? ` (${meta})` : ''}:\n${fb.message}`;

  const url = process.env.FEEDBACK_WEBHOOK_URL;
  if (!url) {
    console.log('[feedback]', text);
    return;
  }
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text, text }),
  });
}
