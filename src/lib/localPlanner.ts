/**
 * On-device fallback planner. Used when the AI backend isn't reachable (e.g.
 * the web preview, offline, or before a server is configured) so "Make my plan"
 * always produces a usable schedule.
 *
 * It's a simple greedy scheduler: split each task into focus blocks, spread them
 * across the days before its deadline within the student's waking hours, respect
 * the per-day study cap, and finish before each deadline. The AI backend does a
 * smarter job (and can read a timetable photo) — this is the dependable floor.
 */

import type { Plan, PlanEvent, PlanRange, Preferences, TaskInput } from '@/types/plan';
import { addDays, getDeviceTimezone, isoDate, localDate } from './datetime';

const uid = () => 'l' + Math.random().toString(36).slice(2, 9);
const pad = (n: number) => String(n).padStart(2, '0');
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const fromMin = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

interface Day {
  date: string;
  cursor: number; // next free minute-of-day
  used: number; // study minutes used
}

export function buildLocalPlan(
  tasks: TaskInput[],
  prefs: Preferences,
  now: Date,
  range: PlanRange,
): Plan {
  const tz = prefs.timezone || getDeviceTimezone();
  const blockLen = Math.max(15, prefs.studyBlockMinutes);
  const brk = Math.max(0, prefs.breakMinutes);
  const wake = toMin(prefs.wakeTime);
  const sleep = toMin(prefs.sleepTime);
  const maxPerDay = prefs.maxStudyMinutesPerDay;

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
    days.push({ date: isoDate(d), cursor: startCursor, used: 0 });
  }

  const events: PlanEvent[] = [];
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
    const totalBlocks = Math.ceil(Math.max(blockLen, Math.round(task.estimatedHours * 60)) / blockLen);

    const eligible = days.filter((d) => d.date <= dlDate);
    const perDayCap = Math.max(1, Math.ceil(totalBlocks / Math.max(1, eligible.length)));

    let placed = 0;
    for (const day of eligible) {
      let perDay = 0;
      while (placed < totalBlocks && perDay < perDayCap && day.used + blockLen <= maxPerDay) {
        const s = day.cursor;
        const e = s + blockLen;
        if (e > sleep) break;
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
        day.cursor = e + brk;
        day.used += blockLen;
        placed += 1;
        perDay += 1;
      }
      if (placed >= totalBlocks) break;
    }

    if (placed < totalBlocks) {
      const gotH = Math.round(((placed * blockLen) / 60) * 10) / 10;
      warnings.push(
        `"${task.title}": only ${gotH}h fits before the deadline (you estimated ${task.estimatedHours}h). Try starting earlier or trimming the scope.`,
      );
    }

    if (dlDate <= lastDay) {
      events.push({
        id: uid(),
        title: `${task.title} due`,
        type: 'deadline',
        date: dlDate,
        start: fromMin(dlMin),
        end: fromMin(Math.min(sleep, dlMin + 15)),
      });
    }
  }

  const summary =
    warnings.length > 0
      ? "Here's your week — I fit in as much as I could. A couple of things are tight (see the notes), but you've got this. 🐱"
      : "Here's a calm, doable week. 🐱 Your work is split into focused blocks with breaks and finishes before every deadline.";

  return {
    generatedAt: now.toISOString(),
    rangeStart: range.start,
    rangeEnd: range.end,
    timezone: tz,
    courses: [],
    events,
    summary,
    warnings,
  };
}
