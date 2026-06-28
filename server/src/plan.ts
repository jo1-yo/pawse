/**
 * The planning pipeline:
 *   1. (optional) OCR a timetable photo -> structured courses (Gemini vision)
 *   2. Build the full schedule (Claude) -> strict JSON draft
 *   3. Deterministically verify hours-met + before-deadline
 *   4. One repair pass if needed; leftover issues become honest warnings
 */

import { callLlm, extractJson } from './fal.js';
import { uploadImage } from './fal.js';
import {
  buildPlannerPrompt,
  buildRepairPrompt,
  PLANNER_SYSTEM,
  VISION_PROMPT,
  VISION_SYSTEM,
} from './prompts.js';
import {
  CourseExtractionZ,
  PlanDraftZ,
  type Course,
  type PlanDraft,
  type PlanRequest,
} from './schema.js';

export interface Plan extends PlanDraft {
  generatedAt: string;
  rangeStart: string;
  rangeEnd: string;
  timezone: string;
}

/** Wall-clock parts of an instant in a given IANA timezone (uses Node ICU). */
function localWallClock(iso: string, timeZone: string): { date: string; time: string } {
  const d = new Date(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function minutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh ?? 0) * 60 + (em ?? 0) - ((sh ?? 0) * 60 + (sm ?? 0));
}

async function extractCourses(req: PlanRequest): Promise<Course[]> {
  if (!req.scheduleImageBase64) return [];
  try {
    const url = await uploadImage(req.scheduleImageBase64, req.scheduleImageMime ?? 'image/jpeg');
    const raw = await callLlm({
      system: VISION_SYSTEM,
      prompt: VISION_PROMPT,
      imageUrls: [url],
      timeoutMs: 45_000,
    });
    const parsed = CourseExtractionZ.safeParse(extractJson(raw));
    return parsed.success ? parsed.data.courses : [];
  } catch {
    return []; // OCR is best-effort; the planner can still use typed text
  }
}

function parseDraft(raw: string): PlanDraft {
  const parsed = PlanDraftZ.safeParse(extractJson<unknown>(raw));
  if (!parsed.success) {
    throw new Error('Pawse received a malformed plan. Please try generating again.');
  }
  return parsed.data;
}

/** Returns a list of human-readable problems; empty means the plan is sound. */
function verify(draft: PlanDraft, req: PlanRequest): string[] {
  const problems: string[] = [];
  const tz = req.preferences.timezone;

  for (const task of req.tasks) {
    const blocks = draft.events.filter((e) => e.type === 'study' && e.taskId === task.id);
    const total = blocks.reduce((sum, b) => sum + Math.max(0, minutes(b.start, b.end)), 0);
    const need = Math.round(task.estimatedHours * 60);
    if (total < need * 0.9) {
      const got = Math.round((total / 60) * 10) / 10;
      problems.push(
        `"${task.title}" has only ${got}h of study time scheduled but you estimated ~${task.estimatedHours}h.`,
      );
    }
    const dl = localWallClock(task.deadline, tz);
    const deadlineKey = `${dl.date}T${dl.time}`;
    const late = blocks.some((b) => `${b.date}T${b.end}` > deadlineKey);
    if (late) {
      problems.push(`A study block for "${task.title}" is scheduled after its deadline.`);
    }
  }
  return problems;
}

export async function makePlan(req: PlanRequest): Promise<Plan> {
  const knownCourses = await extractCourses(req);
  const prompt = buildPlannerPrompt(req, knownCourses);

  const raw = await callLlm({ system: PLANNER_SYSTEM, prompt, timeoutMs: 80_000 });
  let draft = parseDraft(raw);
  let problems = verify(draft, req);

  if (problems.length > 0) {
    try {
      const repairRaw = await callLlm({
        system: PLANNER_SYSTEM,
        prompt: buildRepairPrompt(JSON.stringify(draft), problems),
        timeoutMs: 80_000,
      });
      const repaired = parseDraft(repairRaw);
      const repairedProblems = verify(repaired, req);
      if (repairedProblems.length < problems.length) {
        draft = repaired;
        problems = repairedProblems;
      }
    } catch {
      // Keep the original draft; remaining problems surface as warnings.
    }
  }

  const warnings = Array.from(new Set([...(draft.warnings ?? []), ...problems]));
  const dates = draft.events.map((e) => e.date).filter(Boolean).sort();
  const fallbackDate = localWallClock(req.nowISO, req.preferences.timezone).date;

  return {
    ...draft,
    warnings,
    generatedAt: new Date().toISOString(),
    rangeStart: req.rangeStart ?? dates[0] ?? fallbackDate,
    rangeEnd: req.rangeEnd ?? dates[dates.length - 1] ?? fallbackDate,
    timezone: req.preferences.timezone,
  };
}
