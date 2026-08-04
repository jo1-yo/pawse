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

// Where each service lets you import a .ics file. Apple Calendar has no web
// import page — on a Mac/iPhone the downloaded file opens straight into it.
const CALENDAR_IMPORT_URLS = {
  google: 'https://calendar.google.com/calendar/u/0/r/settings/export',
  outlook: 'https://outlook.live.com/calendar/0/addcalendar',
} as const;

type CalendarTarget = 'apple' | 'google' | 'outlook';

export default function PlanView({
  plan,
  tasks,
  onNotify,
}: {
  plan: Plan;
  tasks: TaskInput[];
  onNotify?: (message: string) => void;
}) {
  const feasibility = useMemo(
    () => analyzeFeasibility(tasks, plan.events, new Date()),
    [tasks, plan],
  );
  const days = useMemo(() => groupByDate(plan.events), [plan]);

  const downloadIcs = () => {
    const blob = new Blob([buildIcs(plan)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pawse-week.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Always save the .ics first (stays on the device), then send the user to that
  // calendar's import screen so they can pick the file they just downloaded.
  const exportTo = (target: CalendarTarget) => {
    downloadIcs();
    if (target === 'apple') {
      onNotify?.('Saved pawse-week.ics — open the file to add it to Apple Calendar.');
      return;
    }
    window.open(CALENDAR_IMPORT_URLS[target], '_blank', 'noopener');
    onNotify?.(
      target === 'google'
        ? 'Saved pawse-week.ics — in the Google Calendar tab, click Import and choose it.'
        : 'Saved pawse-week.ics — in the Outlook tab, choose Upload from file and pick it.',
    );
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
      <div className="label">Add to calendar</div>
      <div className="export-row">
        <button className="btn-secondary" onClick={() => exportTo('apple')}>
          Apple
        </button>
        <button className="btn-secondary" onClick={() => exportTo('google')}>
          Google
        </button>
        <button className="btn-secondary" onClick={() => exportTo('outlook')}>
          Outlook
        </button>
      </div>
      <div className="note">Saves a .ics file, then opens that calendar so you can import it.</div>
    </section>
  );
}
