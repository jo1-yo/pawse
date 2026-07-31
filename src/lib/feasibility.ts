/**
 * The feasibility check — Pawse's headline differentiator. Given the produced
 * plan, it tells the student the honest truth before each deadline: are you on
 * track, is it tight, or won't it fit? — and offers one concrete fix.
 *
 * It reads the *result* (the placed study blocks), not the planner's internals,
 * so it works identically for an AI plan or the on-device plan, and updates
 * live as the student hand-edits or re-plans.
 */

import type { Feasibility, PlanEvent, TaskFeasibility, TaskInput } from '@/types/plan';
import { durationMinutes, formatDateHeading, isoDate } from './datetime';

const round1 = (h: number) => Math.round(h * 10) / 10;

/** Hours owed before we call a task "won't fit". */
const DEFICIT_THRESHOLD_H = 0.5;

export function analyzeFeasibility(tasks: TaskInput[], events: PlanEvent[], now: Date): Feasibility {
  const studyByTask = new Map<string, PlanEvent[]>();
  for (const ev of events) {
    if (ev.type !== 'study' || !ev.taskId) continue;
    const list = studyByTask.get(ev.taskId) ?? [];
    list.push(ev);
    studyByTask.set(ev.taskId, list);
  }

  const todayStr = isoDate(now);

  const taskRows: TaskFeasibility[] = tasks.map((task) => {
    const blocks = studyByTask.get(task.id) ?? [];
    const scheduledMin = blocks.reduce((sum, b) => sum + durationMinutes(b.start, b.end), 0);
    const scheduledHours = round1(scheduledMin / 60);
    const required = round1(task.estimatedHours);
    const deficit = Math.max(0, round1(required - scheduledHours));

    const dueDate = isoDate(new Date(task.deadline));
    // A due date before today can never be scheduled (the plan window starts
    // now), so "won't fit — start earlier" is nonsense advice for it.
    const overdue = dueDate < todayStr;
    const lastBlockDate = blocks.reduce<string | null>(
      (latest, b) => (latest === null || b.date > latest ? b.date : latest),
      null,
    );
    // "Tight": it fits, but the work runs right up to the deadline day (no
    // buffer) or it's all crammed into today.
    const tight =
      deficit < DEFICIT_THRESHOLD_H &&
      scheduledHours > 0 &&
      lastBlockDate !== null &&
      (lastBlockDate === dueDate || (blocks.length > 1 && blocks.every((b) => b.date === todayStr)));

    return {
      taskId: task.id,
      title: task.title,
      deadline: task.deadline,
      requiredHours: required,
      scheduledHours,
      deficitHours: deficit,
      tight,
      overdue,
    };
  });

  // Worst first: past-due (the most actionable problem), then biggest deficit,
  // then tight, then earliest deadline.
  const sorted = [...taskRows].sort(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      b.deficitHours - a.deficitHours ||
      Number(b.tight) - Number(a.tight) ||
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
  );

  const wontFit = sorted.filter((t) => t.deficitHours >= DEFICIT_THRESHOLD_H);
  const tightOnes = sorted.filter((t) => t.tight);

  if (wontFit.length > 0) {
    const worst = wontFit[0]!;
    const due = formatDateHeading(isoDate(new Date(worst.deadline)));

    // Past-due tasks can't be scheduled at all; tell the truth instead of
    // suggesting the impossible ("start earlier" for a date already gone).
    if (worst.overdue) {
      const others = wontFit.filter((t) => t.overdue).length - 1;
      const more = others > 0 ? ` (+${others} more past due)` : '';
      return {
        verdict: 'wont-fit',
        headline: 'Past due',
        detail:
          `"${worst.title}" was due ${due} — that's already past, so nothing can be scheduled for it. Move its due date forward, or check it off if it's done.` +
          more,
        tasks: sorted,
      };
    }

    const more = wontFit.length > 1 ? ` (+${wontFit.length - 1} more won't fit)` : '';
    return {
      verdict: 'wont-fit',
      headline: "Won't fit",
      detail:
        `"${worst.title}" needs ~${worst.deficitHours}h more than fits before ${due}. Start earlier, trim the scope, or extend your window.` +
        more,
      tasks: sorted,
    };
  }

  if (tightOnes.length > 0) {
    const worst = tightOnes[0]!;
    const more = tightOnes.length > 1 ? ` (+${tightOnes.length - 1} more tight)` : '';
    return {
      verdict: 'tight',
      headline: 'Tight — but doable',
      detail:
        `"${worst.title}" runs right up to ${formatDateHeading(
          isoDate(new Date(worst.deadline)),
        )}. Try starting it earlier for some breathing room.` + more,
      tasks: sorted,
    };
  }

  return {
    verdict: 'on-track',
    headline: "You're on track",
    detail: 'Your work is spread out with breaks and finishes before every deadline. 🐱',
    tasks: sorted,
  };
}
