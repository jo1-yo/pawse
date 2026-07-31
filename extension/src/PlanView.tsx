import { useMemo } from 'react';

import type { Plan, TaskInput } from '@/types/plan';
import { formatDateHeading, formatTime, groupByDate } from '@/lib/datetime';
import { analyzeFeasibility } from '@/lib/feasibility';
import { buildIcs } from '@/lib/ics';

const EVENT_COLORS: Record<string, string> = {
  class: 'var(--class)',
  study: 'var(--study)',
  break: 'var(--break)',
  deadline: 'var(--deadline)',
  other: '#9a9aa8',
};

export default function PlanView({ plan, tasks }: { plan: Plan; tasks: TaskInput[] }) {
  const feasibility = useMemo(
    () => analyzeFeasibility(tasks, plan.events, new Date()),
    [tasks, plan],
  );
  const days = useMemo(() => groupByDate(plan.events), [plan]);

  const exportIcs = () => {
    const blob = new Blob([buildIcs(plan)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pawse-week.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card">
      <h2>Your week</h2>
      <div className={`feasibility ${feasibility.verdict}`}>
        <div className="headline">{feasibility.headline}</div>
        {feasibility.detail ? <div className="detail">{feasibility.detail}</div> : null}
      </div>
      <div>
        {days.map(({ date, events }) => (
          <div key={date}>
            <div className="day-heading">{formatDateHeading(date)}</div>
            {events.map((ev) => (
              <div className="event" key={ev.id}>
                <span
                  className="dot"
                  style={{ background: EVENT_COLORS[ev.type] ?? EVENT_COLORS.other }}
                />
                <span className="time">
                  {ev.type === 'deadline'
                    ? `Due ${formatTime(ev.start)}`
                    : `${formatTime(ev.start)} – ${formatTime(ev.end)}`}
                </span>
                <span className="title">{ev.title}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {plan.warnings.length > 0 && <div className="note">{plan.warnings.join(' ')}</div>}
      <button className="btn-secondary" onClick={exportIcs}>
        Export .ics
      </button>
      <div className="note">Import the file into Apple, Google, or Outlook Calendar.</div>
    </section>
  );
}
