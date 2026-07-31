/**
 * Keeps the generated plan honest when the class list changes *after*
 * generating (a photo read finishing late, a class chip removed). Without
 * this, a class could sit visibly in the list yet never appear on the
 * schedule until the student pressed "Update my schedule" again.
 *
 * Same contract as the rolling re-plan: done blocks stay put and count
 * toward their task; everything else is re-fit around the fresh classes.
 */

import type { ClassEntry, Plan, PlanRange, Preferences, TaskInput } from '@/types/plan';
import { durationMinutes } from './datetime';
import { buildLocalPlan } from './localPlanner';
import { parseClasses } from './parseClasses';

export function resyncPlanWithClasses(args: {
  plan: Plan | null;
  tasks: TaskInput[];
  classEntries: ClassEntry[];
  scheduleText: string;
  preferences: Preferences;
  planRange: PlanRange;
}): Plan | null {
  const { plan, tasks, classEntries, scheduleText, preferences, planRange } = args;
  if (!plan) return null;

  const validTasks = tasks.filter((t) => t.title.trim().length > 0);
  const courses = parseClasses(classEntries, scheduleText);

  const keepEvents = plan.events.filter((e) => e.done);
  const completedHoursByTask: Record<string, number> = {};
  for (const e of keepEvents) {
    if (e.type !== 'study' || !e.taskId) continue;
    completedHoursByTask[e.taskId] =
      (completedHoursByTask[e.taskId] ?? 0) + durationMinutes(e.start, e.end) / 60;
  }

  return buildLocalPlan(validTasks, courses, preferences, new Date(), planRange, {
    completedHoursByTask,
    busyEvents: keepEvents,
  });
}
