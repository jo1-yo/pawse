/**
 * On-device deterministic scheduling engine (the PRD "engine").
 *
 * It's explainable, not a black box: lay down Fixed time (classes + protected
 * meals + sleep bounds), then decompose each Task into focus blocks and place
 * them into real free gaps, spread backward from the deadline (never crammed
 * the night before), capped at the per-day study max — and defend Life by
 * guaranteeing at least one protected break on every working day.
 *
 * The AI backend can read a timetable photo and suggest effort, but placement
 * lives here so students can predict and trust the output. The same engine
 * powers the rolling re-plan: pass the blocks already done as `busyEvents`
 * (kept put + treated as occupied) and the hours already done per task in
 * `completedHoursByTask` (subtracted from what's left to schedule).
 */

import type { Course, Plan, PlanEvent, PlanRange, Preferences, TaskInput } from '@/types/plan';
import { addDays, getDeviceTimezone, isoDate, localDate } from './datetime';

const uid = () => 'l' + Math.random().toString(36).slice(2, 9);
const pad = (n: number) => String(n).padStart(2, '0');
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const fromMin = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

/** Protected meal windows — reserved (not rendered), so study routes around them. */
const MEALS: [number, number][] = [
  [12 * 60, 12 * 60 + 45], // lunch
  [18 * 60, 18 * 60 + 45], // dinner
];

interface Day {
  date: string;
  weekday: number;
  busy: [number, number][]; // occupied minute ranges, kept sorted
  cursor: number; // earliest free minute we'll consider today
  used: number; // study minutes placed today
}

export interface ReplanOptions {
  /** Hours already completed per task id — subtracted from what's scheduled. */
  completedHoursByTask?: Record<string, number>;
  /** Blocks the student already finished — kept in place and treated as busy. */
  busyEvents?: PlanEvent[];
}

function addBusy(day: Day, s: number, e: number) {
  day.busy.push([s, e]);
  day.busy.sort((a, b) => a[0] - b[0]);
}

/** Earliest minute ≥ `from` where a `len`-minute block fits before `sleep`. */
function findSlot(day: Day, from: number, len: number, sleep: number): number | null {
  let t = Math.max(from, day.cursor);
  // Walk forward past any busy interval the candidate window overlaps.
  for (let guard = 0; guard < 64; guard++) {
    if (t + len > sleep) return null;
    const clash = day.busy.find(([bs, be]) => t < be && t + len > bs);
    if (!clash) return t;
    t = clash[1];
  }
  return null;
}

/** Build the recurring fixed class blocks across the planning window. */
function classEvents(courses: Course[], days: Day[]): PlanEvent[] {
  const events: PlanEvent[] = [];
  for (const day of days) {
    for (const course of courses) {
      if (!course.days.includes(day.weekday)) continue;
      const s = toMin(course.start);
      const e = toMin(course.end);
      if (e <= s) continue;
      events.push({
        id: uid(),
        title: course.title,
        type: 'class',
        date: day.date,
        start: course.start,
        end: course.end,
      });
      addBusy(day, s, e);
    }
  }
  return events;
}

export function buildLocalPlan(
  tasks: TaskInput[],
  courses: Course[],
  prefs: Preferences,
  now: Date,
  range: PlanRange,
  opts: ReplanOptions = {},
): Plan {
  const tz = prefs.timezone || getDeviceTimezone();
  const blockLen = Math.max(15, prefs.studyBlockMinutes);
  const brk = Math.max(0, prefs.breakMinutes);
  const wake = toMin(prefs.wakeTime);
  const sleep = toMin(prefs.sleepTime);
  const maxPerDay = prefs.maxStudyMinutesPerDay;
  // Weekends get their own daily cap (the student's chosen weekend hours).
  const weekendMax = Math.max(0, Math.round((prefs.weekendStudyHours ?? 3) * 60));
  const capFor = (weekday: number) => (weekday === 0 || weekday === 6 ? weekendMax : maxPerDay);
  const completed = opts.completedHoursByTask ?? {};
  const kept = opts.busyEvents ?? [];

  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Planning window = the range the user chose, but never schedule in the past.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeStart = localDate(range.start, '00:00');
  const startDate = rangeStart > today ? rangeStart : today;
  let endDate = localDate(range.end, '00:00');
  if (endDate < startDate) endDate = startDate;

  const days: Day[] = [];
  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    const isToday = isoDate(d) === isoDate(startDate);
    const startCursor = isToday ? Math.max(wake, Math.ceil((nowMin + 5) / 15) * 15) : wake;
    days.push({
      date: isoDate(d),
      weekday: d.getDay(),
      busy: MEALS.map(([s, e]) => [s, e] as [number, number]),
      cursor: startCursor,
      used: 0,
    });
  }
  const dayByDate = new Map(days.map((d) => [d.date, d]));

  // Fixed time: classes first, then any already-done blocks we must keep clear.
  const events: PlanEvent[] = classEvents(courses, days);
  for (const ev of kept) {
    const day = dayByDate.get(ev.date);
    if (day) addBusy(day, toMin(ev.start), toMin(ev.end));
    events.push(ev);
  }

  const warnings: string[] = [];
  const lastDay = days[days.length - 1]?.date ?? isoDate(startDate);

  // Earliest deadline first, then bigger tasks first.
  const sorted = [...tasks].sort(
    (a, b) =>
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime() ||
      b.estimatedHours - a.estimatedHours,
  );

  for (const task of sorted) {
    const deadline = new Date(task.deadline);
    const dlDate = isoDate(deadline);
    const dlMin = deadline.getHours() * 60 + deadline.getMinutes();

    const doneH = completed[task.id] ?? 0;
    const remainingMin = Math.max(0, Math.round((task.estimatedHours - doneH) * 60));
    if (remainingMin <= 0) {
      maybeDeadlineMarker(events, task, dlDate, dlMin, sleep, lastDay);
      continue;
    }
    const totalBlocks = Math.ceil(Math.max(blockLen, remainingMin) / blockLen);

    const eligible = days.filter((d) => d.date <= dlDate);
    const perDayCap = Math.max(1, Math.ceil(totalBlocks / Math.max(1, eligible.length)));

    let placed = 0;
    for (const day of eligible) {
      let perDay = 0;
      while (placed < totalBlocks && perDay < perDayCap && day.used + blockLen <= capFor(day.weekday)) {
        const s = findSlot(day, day.cursor, blockLen, sleep);
        if (s === null) break;
        const e = s + blockLen;
        if (day.date === dlDate && e > dlMin - 30) break; // finish ≥30m before deadline
        events.push({
          id: uid(),
          title: `Study: ${task.title}`,
          type: 'study',
          date: day.date,
          start: fromMin(s),
          end: fromMin(e),
          taskId: task.id,
        });
        addBusy(day, s, e);
        // Reserve a short gap after each block so study time isn't jammed
        // together — but never as a visible "Recharge" event. The agenda shows
        // only real, actionable blocks (SchedulePane also filters breaks out,
        // which keeps any older, already-saved plans clean too).
        const breakEnd = Math.min(sleep, e + brk);
        if (brk > 0 && breakEnd > e) {
          addBusy(day, e, breakEnd);
        }
        day.cursor = breakEnd;
        day.used += blockLen;
        placed += 1;
        perDay += 1;
      }
      if (placed >= totalBlocks) break;
    }

    if (placed < totalBlocks) {
      const gotH = Math.round(((placed * blockLen) / 60) * 10) / 10;
      const owed = Math.round((task.estimatedHours - doneH) * 10) / 10;
      warnings.push(
        `"${task.title}": only ${gotH}h of ${owed}h fits before the deadline. Start earlier, trim the scope, or extend your window.`,
      );
    }

    maybeDeadlineMarker(events, task, dlDate, dlMin, sleep, lastDay);
  }

  const summary =
    warnings.length > 0
      ? "Here's your plan — I fit in as much as I could. A couple of things are tight (see the feasibility check), but you've got this. 🐱"
      : "Here's a calm, doable plan. 🐱 Your work is split into focused blocks with breaks and finishes before every deadline.";

  return {
    generatedAt: now.toISOString(),
    rangeStart: range.start,
    rangeEnd: range.end,
    timezone: tz,
    courses,
    events,
    summary,
    warnings,
  };
}

function maybeDeadlineMarker(
  events: PlanEvent[],
  task: TaskInput,
  dlDate: string,
  dlMin: number,
  sleep: number,
  lastDay: string,
) {
  if (dlDate > lastDay) return;
  events.push({
    id: uid(),
    title: `${task.title} due`,
    type: 'deadline',
    date: dlDate,
    start: fromMin(dlMin),
    end: fromMin(Math.min(sleep, dlMin + 15)),
  });
}
