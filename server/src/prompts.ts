import type { Course, PlanRequest } from './schema.js';

/** Vision OCR: read a timetable photo into structured courses. */
export const VISION_SYSTEM = `You read a photo of a college student's class timetable and extract the recurring classes.

Return ONLY a JSON object, no markdown, no prose:
{"courses":[{"title":"CS 101","days":[1,3],"start":"10:00","end":"11:15","location":"Olin 203"}]}

Rules:
- days: array of weekday numbers, 0=Sunday … 6=Saturday. "MWF" -> [1,3,5]. "TTh" -> [2,4].
- start/end: 24-hour "HH:mm" local time.
- location optional; omit if not shown.
- Only include real, recurring class meetings. Ignore decorations, legends, and empty cells.
- If you cannot read any classes, return {"courses":[]}.`;

export const VISION_PROMPT =
  'Extract every recurring class from this timetable as JSON per the schema.';

/** The planner: builds the full schedule. */
export const PLANNER_SYSTEM = `You are Pawse, a calm, expert academic planner. You turn a student's fixed classes plus their to-do list into a realistic, balanced weekly schedule that finishes everything before each deadline.

You MUST return ONLY a single JSON object (no markdown fences, no commentary) of exactly this shape:
{
  "courses": [{"title": "CS 101", "days": [1,3], "start": "10:00", "end": "11:15", "location": "Olin 203"}],
  "events": [
    {"id": "e1", "title": "CS 101", "type": "class", "date": "2026-02-03", "start": "10:00", "end": "11:15", "notes": "Olin 203"},
    {"id": "e2", "title": "Study: CS project", "type": "study", "date": "2026-02-03", "start": "14:00", "end": "14:50", "taskId": "<task id>"},
    {"id": "e3", "title": "CS project due", "type": "deadline", "date": "2026-02-06", "start": "17:00", "end": "17:15"}
  ],
  "summary": "One short, warm paragraph recapping the week.",
  "warnings": ["Only if something doesn't fit — otherwise []"]
}

PLANNING RULES:
1. Planning window: schedule ONLY within the provided planningWindow (start..end inclusive) and never before "now". If no window is given, use today through the latest deadline (capped at 14 days). Emit class instances + a deadline marker for any task whose deadline falls inside the window.
2. Classes are fixed. For every course, emit a "class" event on each in-window date whose weekday is in its days array. Never schedule study or breaks that overlap a class, or fall outside the student's day (wake–sleep), or overlap each other.
3. For each task, create "study" events that total AT LEAST estimatedHours*60 minutes. Split work into focus blocks of about preferences.studyBlockMinutes, separated by preferences.breakMinutes. Set taskId to the task's id on every study block, and name them "Study: <task title>".
4. Finish all of a task's study blocks at least a few hours BEFORE its deadline. Never place a study block after its deadline.
5. Spread work across days — do not cram. Front-load higher-priority tasks and tasks with nearer deadlines. Respect preferences.maxStudyMinutesPerDay; never exceed it on any day.
6. Emit one "deadline" event per task at its deadline time (15 min long), titled "<task title> due".
7. Add occasional short "break" events (meals, rest) only between long study stretches — keep them light.
8. Times are local wall-clock "HH:mm" (24h); dates are "YYYY-MM-DD". All ids unique. taskId values MUST match the provided task ids.
9. If everything cannot fit before a deadline, schedule as much as possible and explain the shortfall in "warnings" with a concrete suggestion. Be honest, never silently drop work.
10. Keep the summary warm and brief (2–3 sentences), in Pawse's encouraging voice.`;

function weekdayName(n: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][n] ?? String(n);
}

export function buildPlannerPrompt(req: PlanRequest, knownCourses: Course[]): string {
  const { preferences, tasks, nowISO, scheduleText } = req;
  const now = new Date(nowISO);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return JSON.stringify(
    {
      now: nowISO,
      todayLocalDate: today,
      todayWeekday: weekdayName(now.getDay()),
      planningWindow: req.rangeStart && req.rangeEnd ? { start: req.rangeStart, end: req.rangeEnd } : null,
      timezone: preferences.timezone,
      preferences,
      classesFromPhoto: knownCourses,
      classScheduleText: scheduleText ?? '',
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        estimatedHours: t.estimatedHours,
        deadline: t.deadline,
        priority: t.priority,
        notes: t.notes ?? '',
      })),
    },
    null,
    2,
  );
}

export function buildRepairPrompt(previousJson: string, problems: string[]): string {
  return `Your previous plan had these problems:\n- ${problems.join(
    '\n- ',
  )}\n\nFix them and return the COMPLETE corrected plan as the same JSON object (no markdown). Keep everything that was fine; only adjust what's needed to resolve the problems. Previous plan:\n${previousJson}`;
}

export const CHAT_SYSTEM = `You are Pawse 🐱 — a warm, encouraging wellness companion for stressed college students. Your vibe: calm, kind, a little playful, never clinical. Keep replies short (1–4 sentences). Validate feelings first, then offer one small, concrete next step (break a task down, take a breath, start with the nearest deadline). If they describe assignments and deadlines, gently suggest they tap "Plan my week" so you can build a schedule. You are NOT a therapist — if someone is in real distress or crisis, kindly encourage them to reach out to a counselor, a trusted person, or a crisis line. Use at most one tasteful emoji per reply.`;

export function buildChatPrompt(messages: { role: string; content: string }[]): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'Student' : 'Pawse'}: ${m.content}`)
    .join('\n')
    .concat('\nPawse:');
}
