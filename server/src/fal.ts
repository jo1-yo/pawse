/**
 * fal.ai any-llm transport. Mirrors the proven Martini backend pattern:
 * configure the singleton with FAL_KEY once, call `fal.subscribe` against
 * `fal-ai/any-llm` (text) or `fal-ai/any-llm/vision` (image), read the flat
 * `.data.output` string. No model key ever reaches the app.
 */

import { fal } from '@fal-ai/client';

let configured = false;

function getFal() {
  if (!configured) {
    if (!process.env.FAL_KEY) throw new Error('FAL_KEY environment variable is required');
    fal.config({ credentials: process.env.FAL_KEY });
    configured = true;
  }
  return fal;
}

export const PLAN_MODEL = process.env.PLAN_MODEL ?? 'anthropic/claude-3.5-sonnet';
export const VISION_MODEL = process.env.VISION_MODEL ?? 'google/gemini-2.0-flash-001';

/** Upload a base64 image to fal storage and return a public URL for vision. */
export async function uploadImage(base64: string, mime: string): Promise<string> {
  const client = getFal();
  const buffer = Buffer.from(base64, 'base64');
  const blob = new Blob([buffer], { type: mime || 'image/jpeg' });
  return client.storage.upload(blob);
}

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// Narrow view of the any-llm result; the SDK's per-endpoint generics are
// stricter than we need, so we type the call surface explicitly.
type AnyLlmCall = (
  id: string,
  opts: { input: Record<string, unknown>; logs?: boolean },
) => Promise<{ data: { output?: string } }>;

export interface LlmOptions {
  system: string;
  prompt: string;
  model?: string;
  imageUrls?: string[];
  timeoutMs?: number;
}

export async function callLlm(opts: LlmOptions): Promise<string> {
  const client = getFal();
  const vision = !!opts.imageUrls?.length;
  const endpoint = vision ? 'fal-ai/any-llm/vision' : 'fal-ai/any-llm';
  const model = opts.model ?? (vision ? VISION_MODEL : PLAN_MODEL);

  const input: Record<string, unknown> = {
    model,
    prompt: opts.prompt,
    system_prompt: opts.system,
  };
  if (vision) input.image_urls = opts.imageUrls;

  const subscribe = client.subscribe as unknown as AnyLlmCall;
  const result = await withTimeout(
    subscribe(endpoint, { input, logs: false }),
    opts.timeoutMs ?? 60_000,
    `${endpoint} (${model})`,
  );

  const output = result.data?.output ?? '';
  if (!output.trim()) throw new Error('The model returned an empty response.');
  return output;
}

/** Tolerant JSON extractor — strips ``` fences, falls back to first {...}. */
export function extractJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error('The model did not return valid JSON.');
  }
}
