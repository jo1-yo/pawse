/**
 * A realistic demo plan so users (and the web preview) can see what a finished
 * Pawse week looks like without calling the backend. Anchored to "today" so it
 * always feels current. Also powers the "Peek at a sample week" affordance on
 * the empty Plan screen.
 */

import type { Plan, PlanEvent } from '@/types/plan';
import { addDays, getDeviceTimezone, isoDate } from './datetime';

const uid = () => 's' + Math.random().toString(36).slice(2, 9);

export function getSamplePlan(): Plan {
  const today = new Date();
  const d = (offset: number) => isoDate(addDays(today, offset));

  const ev = (
    title: string,
    type: PlanEvent['type'],
    date: string,
    start: string,
    end: string,
    extra?: Partial<PlanEvent>,
  ): PlanEvent => ({ id: uid(), title, type, date, start, end, ...extra });

  const CS = 'task-cs';
  const ESSAY = 'task-essay';
  const EXAM = 'task-exam';

  const events: PlanEvent[] = [
    // Day 0
    ev('CS 101', 'class', d(0), '10:00', '11:15', { notes: 'Olin 203' }),
    ev('Study: CS project', 'study', d(0), '14:00', '14:50', { taskId: CS }),
    ev('Break', 'break', d(0), '14:50', '15:00'),
    ev('Study: CS project', 'study', d(0), '15:00', '15:50', { taskId: CS }),
    ev('Review: Bio midterm', 'study', d(0), '16:30', '17:20', { taskId: EXAM }),
    // Day 1
    ev('Study: History essay', 'study', d(1), '11:00', '11:50', { taskId: ESSAY }),
    ev('Study: History essay', 'study', d(1), '12:00', '12:50', { taskId: ESSAY }),
    ev('Bio Lab', 'class', d(1), '13:00', '14:30', { notes: 'Sanders 110' }),
    ev('Study: CS project', 'study', d(1), '16:00', '16:50', { taskId: CS }),
    ev('Review: Bio midterm', 'study', d(1), '17:30', '18:20', { taskId: EXAM }),
    // Day 2
    ev('CS 101', 'class', d(2), '10:00', '11:15', { notes: 'Olin 203' }),
    ev('Study: History essay', 'study', d(2), '14:00', '14:50', { taskId: ESSAY }),
    ev('Study: History essay', 'study', d(2), '15:00', '15:50', { taskId: ESSAY }),
    ev('History essay due', 'deadline', d(2), '23:00', '23:15'),
    // Day 3
    ev('Study: CS project', 'study', d(3), '10:00', '10:50', { taskId: CS }),
    ev('Study: CS project', 'study', d(3), '11:00', '11:50', { taskId: CS }),
    ev('CS project due', 'deadline', d(3), '17:00', '17:15'),
    ev('Review: Bio midterm', 'study', d(3), '19:00', '19:50', { taskId: EXAM }),
    // Day 4 — exam day
    ev('Review: Bio midterm', 'study', d(4), '09:00', '09:50', { taskId: EXAM }),
    ev('Break', 'break', d(4), '09:50', '10:00'),
    ev('Review: Bio midterm', 'study', d(4), '10:00', '10:50', { taskId: EXAM }),
    ev('Bio midterm exam', 'deadline', d(4), '13:00', '14:30', { notes: 'Sanders 110' }),
  ];

  return {
    generatedAt: new Date().toISOString(),
    rangeStart: d(0),
    rangeEnd: d(4),
    timezone: getDeviceTimezone(),
    courses: [
      { title: 'CS 101', days: [1, 3], start: '10:00', end: '11:15', location: 'Olin 203' },
      { title: 'Bio Lab', days: [2], start: '13:00', end: '14:30', location: 'Sanders 110' },
    ],
    events,
    summary:
      "Here's a calm, doable week. 🐱 Your CS project is broken into morning focus blocks, the history essay is finished a day before it's due, and Bio midterm review is spread over four evenings instead of one panic night. Classes stay put. You've got this.",
    warnings: [],
  };
}
