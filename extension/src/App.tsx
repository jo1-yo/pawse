import { useEffect, useRef, useState } from 'react';

import type { Course, Plan, TaskInput } from '@/types/plan';
import { addDays, formatDeadline, formatTime, isoDate, localDate } from '@/lib/datetime';
import { buildLocalPlan } from '@/lib/localPlanner';
import { parseClasses } from '@/lib/parseClasses';
import { taskEmoji } from '@/lib/taskMeta';

import PlanView from './PlanView';
import { loadState, saveState } from './storage';

interface ScheduleImage {
  dataUrl: string;
  base64: string;
  mime: string;
  name: string;
}

function computeRange(tasks: TaskInput[]) {
  const now = new Date();
  const start = isoDate(now);
  let end = isoDate(addDays(now, 13));
  for (const t of tasks) {
    const due = t.deadline.slice(0, 10);
    if (due > end) end = due;
  }
  return { start, end };
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const courseKey = (c: Course) => `${c.title}|${c.days.join(',')}|${c.start}|${c.end}`;

async function requestParsedClasses(
  baseUrl: string,
  base64: string,
  mime: string,
): Promise<Course[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/parse-classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleImageBase64: base64, scheduleImageMime: mime }),
      signal: controller.signal,
    });
    const data = (await res.json()) as { courses?: Course[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? `Pawse server error (${res.status}).`);
    return data.courses ?? [];
  } finally {
    clearTimeout(timer);
  }
}

function sleepHours(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = sleepTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  const mins = (24 * 60 - (sh * 60 + sm) + (wh * 60 + wm) + 24 * 60) % (24 * 60) || 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

export default function App() {
  const [state] = useState(loadState);
  const [tasks, setTasks] = useState<TaskInput[]>(state.tasks);
  const [courses, setCourses] = useState<Course[]>(state.courses);
  const [scheduleText, setScheduleText] = useState(state.scheduleText);
  const [prefs, setPrefs] = useState(state.prefs);
  const [plan, setPlan] = useState<Plan | null>(state.plan);
  const [image, setImage] = useState<ScheduleImage | null>(null);
  const [parsing, setParsing] = useState(false);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState(() => isoDate(addDays(new Date(), 7)));
  const [draftTime, setDraftTime] = useState('17:00');
  const [draftHours, setDraftHours] = useState(3);

  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    saveState({ tasks, courses, scheduleText, prefs, plan, backendUrl: state.backendUrl });
  }, [tasks, courses, scheduleText, prefs, plan, state.backendUrl]);

  const showToast = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('That file is not an image. Drop a PNG or JPG of your schedule.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(',')[1] ?? '';
      setImage({ dataUrl, base64, mime: file.type, name: file.name || 'Pasted image' });
      void parsePhoto(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const parsePhoto = async (base64: string, mime: string) => {
    setParsing(true);
    try {
      const found = await requestParsedClasses(state.backendUrl, base64, mime);
      if (!found.length) {
        showToast('Could not read any classes from that photo. Add them below.');
        return;
      }
      setCourses((prev) => {
        const seen = new Set(prev.map(courseKey));
        const fresh = found.filter((c) => !seen.has(courseKey(c)));
        return [...prev, ...fresh];
      });
      showToast(`Found ${found.length} ${found.length === 1 ? 'class' : 'classes'} in your photo.`);
    } catch {
      showToast('The Pawse server is offline, so the photo could not be read.');
    } finally {
      setParsing(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          acceptFile(new File([blob], 'clipboard.png', { type }));
          showToast('Schedule photo attached from your clipboard.');
          return;
        }
      }
      showToast('No image in the clipboard. Copy a screenshot first.');
    } catch {
      showToast('Could not read the clipboard. Press Cmd+V instead.');
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      acceptFile(item.getAsFile() ?? undefined);
      showToast('Schedule photo attached from your clipboard.');
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTask = () => {
    const title = draftTitle.trim();
    if (!title) {
      showToast('Give the task a name first.');
      document.getElementById('task-title')?.focus();
      return;
    }
    if (!draftDate || !draftTime) {
      showToast('Pick a due date and time for it.');
      return;
    }
    const deadline = localDate(draftDate, draftTime).toISOString();
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title,
        estimatedHours: draftHours,
        deadline,
        priority: 'medium',
      },
    ]);
    setDraftTitle('');
    showToast(`Task added, due ${formatDeadline(deadline)}`);
  };

  const generate = () => {
    if (!tasks.length || busy) return;
    setBusy(true);
    try {
      const now = new Date();
      const range = computeRange(tasks);
      const textCourses = parseClasses([], scheduleText).filter(
        (c) => !courses.some((known) => courseKey(known) === courseKey(c)),
      );
      const next = buildLocalPlan(tasks, [...courses, ...textCourses], prefs, now, range);
      setPlan(next);
      showToast('Your week is planned.');
    } finally {
      setBusy(false);
    }
  };

  const nightHours = sleepHours(prefs.sleepTime, prefs.wakeTime);

  return (
    <>
      <header className="header">
        <img src="/pawse-cat.png" alt="" />
        <div>
          <div className="name">Pawse</div>
          <div className="tagline">Study smarter. Stress less.</div>
        </div>
      </header>

      <section className="card">
        <h2>Classes</h2>
        {image ? (
          <div className="thumb">
            <img src={image.dataUrl} alt="" />
            <div className="meta">
              <div className="filename">{image.name}</div>
              <div className="sub">{parsing ? 'Reading your classes…' : 'Schedule photo attached'}</div>
            </div>
            <button className="icon-btn" onClick={() => setImage(null)} aria-label="Remove photo">
              ✕
            </button>
          </div>
        ) : (
          <div
            className={`dropzone${dragging ? ' dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFile(e.dataTransfer.files[0]);
            }}
          >
            <div>Add your class schedule</div>
            <div className="drop-actions">
              <button className="btn-secondary" onClick={pasteFromClipboard}>
                Paste
              </button>
              <button className="btn-secondary" onClick={() => fileInput.current?.click()}>
                Upload
              </button>
            </div>
            <div className="hint">A copied screenshot, a file, or drop an image here.</div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                acceptFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        )}
        {courses.map((c) => (
          <div className="task" key={courseKey(c)}>
            <span className="dot" style={{ background: 'var(--class)' }} />
            <div className="body">
              <div className="title">{c.title}</div>
              <div className="due">
                {c.days.map((d) => DAY_ABBR[d]).join('/')} · {formatTime(c.start)} –{' '}
                {formatTime(c.end)}
                {c.location ? ` · ${c.location}` : ''}
              </div>
            </div>
            <button
              className="icon-btn"
              onClick={() => setCourses((prev) => prev.filter((x) => courseKey(x) !== courseKey(c)))}
              aria-label={`Remove ${c.title}`}
            >
              ✕
            </button>
          </div>
        ))}
        <textarea
          className="field"
          placeholder={'Or paste it as text, like "CS 101 MWF 9:00-9:50am"'}
          value={scheduleText}
          onChange={(e) => setScheduleText(e.target.value)}
        />
      </section>

      <section className="card">
        <h2>What&apos;s due</h2>
        {tasks.map((t) => (
          <div className="task" key={t.id}>
            <span className="emoji">{taskEmoji(t.title)}</span>
            <div className="body">
              <div className="title">{t.title}</div>
              <div className="due">
                {formatDeadline(t.deadline)} · {t.estimatedHours}h of work
              </div>
            </div>
            <button
              className="icon-btn"
              onClick={() => setTasks((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label={`Remove ${t.title}`}
            >
              ✕
            </button>
          </div>
        ))}
        <div className="subcard">
          <div className="subhead">New task</div>
          <div>
            <label className="label" htmlFor="task-title">
              Task
            </label>
            <input
              id="task-title"
              className="field"
              placeholder="e.g. CS project"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask();
              }}
            />
          </div>
          <div className="row">
          <div>
            <label className="label" htmlFor="task-date">
              Due date
            </label>
            <input
              id="task-date"
              className="field"
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="task-time">
              Due time
            </label>
            <input
              id="task-time"
              className="field"
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
            />
          </div>
          <div style={{ flex: '0 0 76px' }}>
            <label className="label" htmlFor="task-hours">
              Hours to finish
            </label>
            <input
              id="task-hours"
              className="field"
              type="number"
              min={0.5}
              step={0.5}
              value={draftHours}
              title="How many hours of work you still need to finish this"
              onChange={(e) => setDraftHours(Number(e.target.value) || 1)}
            />
          </div>
            <button className="btn-secondary fit" onClick={addTask}>
              Add
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>
          Your rhythm{' '}
          <span className={`badge ${nightHours < 7 ? 'warn' : 'ok'}`}>
            {nightHours < 7 ? `${nightHours}h sleep, aim for 7 to 9` : `${nightHours}h sleep`}
          </span>
        </h2>
        <div className="habit-grid">
          <div>
            <label className="label" htmlFor="pref-wake">
              Wake up
            </label>
            <input
              id="pref-wake"
              className="field"
              type="time"
              value={prefs.wakeTime}
              onChange={(e) => setPrefs({ ...prefs, wakeTime: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="pref-sleep">
              Wind down
            </label>
            <input
              id="pref-sleep"
              className="field"
              type="time"
              value={prefs.sleepTime}
              onChange={(e) => setPrefs({ ...prefs, sleepTime: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="pref-focus">
              Focus block (min)
            </label>
            <input
              id="pref-focus"
              className="field"
              type="number"
              min={15}
              max={180}
              step={5}
              value={prefs.studyBlockMinutes}
              onChange={(e) =>
                setPrefs({ ...prefs, studyBlockMinutes: Number(e.target.value) || 50 })
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="pref-break">
              Break (min)
            </label>
            <input
              id="pref-break"
              className="field"
              type="number"
              min={0}
              max={60}
              step={5}
              value={prefs.breakMinutes}
              onChange={(e) => setPrefs({ ...prefs, breakMinutes: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="label" htmlFor="pref-max">
              Max study per day (h)
            </label>
            <input
              id="pref-max"
              className="field"
              type="number"
              min={1}
              max={12}
              step={0.5}
              value={prefs.maxStudyMinutesPerDay / 60}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  maxStudyMinutesPerDay: Math.round((Number(e.target.value) || 6) * 60),
                })
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="pref-weekend">
              Weekend hours/day
            </label>
            <input
              id="pref-weekend"
              className="field"
              type="number"
              min={0}
              max={12}
              step={0.5}
              value={prefs.weekendStudyHours ?? 3}
              title="How many hours you're up for working on each weekend day"
              onChange={(e) =>
                setPrefs({ ...prefs, weekendStudyHours: Number(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      </section>

      <button className="btn-primary" onClick={generate} disabled={!tasks.length || busy}>
        {busy ? 'Planning your week…' : plan ? 'Update my schedule' : 'Generate my schedule'}
      </button>
      {!tasks.length && <div className="empty">Add at least one task to plan your week.</div>}

      {plan && <PlanView plan={plan} tasks={tasks} />}

      <div className="note">No sign-up. Everything stays on your device.</div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
