/**
 * Thin client for the Pawse backend proxy. The proxy holds the FAL_KEY and
 * does all LLM work; the app never sees a model key.
 */

import type { ChatMessage, Plan, PlanRequest } from '@/types/plan';

export class ApiError extends Error {}

async function postJson<T>(
  baseUrl: string,
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text };
    }
    if (!res.ok) {
      const message =
        (data as { error?: string })?.error ?? `Pawse server error (${res.status}).`;
      throw new ApiError(message);
    }
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError('Pawse took too long to respond. Try again in a moment.');
    }
    throw new ApiError(
      "Couldn't reach Pawse. Make sure the backend is running and the server URL is set in Settings.",
    );
  } finally {
    clearTimeout(timer);
  }
}

export function generatePlan(baseUrl: string, req: PlanRequest): Promise<Plan> {
  return postJson<Plan>(baseUrl, '/api/plan', req, 90_000);
}

export function sendChat(
  baseUrl: string,
  messages: ChatMessage[],
): Promise<{ reply: string }> {
  return postJson<{ reply: string }>(baseUrl, '/api/chat', { messages }, 45_000);
}

export interface FeedbackPayload {
  message: string;
  email?: string;
  platform?: string;
  appVersion?: string;
}

export function sendFeedback(baseUrl: string, payload: FeedbackPayload): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>(baseUrl, '/api/feedback', payload, 20_000);
}
