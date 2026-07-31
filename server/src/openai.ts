/**
 * Direct OpenAI transport for timetable extraction. One call does vision +
 * strict JSON (Structured Outputs), unlike any-llm/vision where models ignore
 * system prompts and JSON-format instructions and need a two-step transcribe
 * → convert dance. Used whenever OPENAI_API_KEY is set; fal stays the fallback.
 */

import { withTimeout } from './fal.js';
import { VISION_SYSTEM } from './prompts.js';

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5-mini';

export function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Structured Outputs schema. Strict mode only supports a JSON Schema subset
// (no minimum/maximum, everything required, additionalProperties false), so
// ranges live in the descriptions and Zod re-validates the result after.
const COURSE_EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['courses'],
  properties: {
    courses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'days', 'start', 'end', 'location'],
        properties: {
          title: { type: 'string', description: 'Course name exactly as written' },
          days: {
            type: 'array',
            items: { type: 'integer', description: 'Weekday, 0=Sunday … 6=Saturday' },
          },
          start: { type: 'string', description: '24-hour HH:mm' },
          end: { type: 'string', description: '24-hour HH:mm' },
          location: { type: ['string', 'null'], description: 'Room if shown, else null' },
        },
      },
    },
  },
} as const;

interface ChatCompletion {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
}

/** Photo → {courses:[…]} via one gpt vision call. Throws on any failure. */
export async function extractCoursesOpenAI(
  base64: string,
  mime: string,
): Promise<{ courses: unknown[] }> {
  const res = await withTimeout(
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: VISION_SYSTEM },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract every recurring class from this timetable photo. Timetables may be in any language; keep course titles as written.',
              },
              {
                type: 'image_url',
                // Registrar tables are wide with small text; low detail loses columns.
                image_url: { url: `data:${mime};base64,${base64}`, detail: 'high' },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'course_extraction', strict: true, schema: COURSE_EXTRACTION_SCHEMA },
        },
      }),
    }),
    60_000,
    `openai (${OPENAI_MODEL})`,
  );

  const data = (await res.json()) as ChatCompletion;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI error (${res.status})`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response.');

  const parsed = JSON.parse(content) as { courses?: Record<string, unknown>[] };
  // Strict mode forces location to exist; drop the nulls so CourseZ
  // (location optional, not nullable) validates unchanged.
  const courses = (parsed.courses ?? []).map((c) => {
    if (c.location === null) {
      const { location: _drop, ...rest } = c;
      return rest;
    }
    return c;
  });
  return { courses };
}
