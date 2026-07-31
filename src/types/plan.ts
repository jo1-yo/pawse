/**
 * Core domain types shared across the Pawse app.
 *
 * These mirror the backend contract in `server/src/schema.ts`. When you
 * change the shape of a plan/task/event, update BOTH files.
 *
 * Time model: a plan is anchored to the user's *device* timezone. Events
 * carry wall-clock fields (`date` + `start`/`end` as "HH:mm") interpreted
 * in that timezone, so building a JS `Date` with the local constructor
 * yields the correct absolute instant (DST-safe via the JS engine).
 */

export type Priority = 'low' | 'medium' | 'high';

export type EventType = 'class' | 'study' | 'break' | 'deadline' | 'other';

/** A task the student needs to finish before a deadline. */
export interface TaskInput {
  id: string;
  title: string;
  /** Student's estimate of total effort in hours (can be fractional). */
  estimatedHours: number;
  /** ISO 8601 datetime (with offset) for the deadline. */
  deadline: string;
  priority: Priority;
  notes?: string;
}

/** A fixed, recurring class block (parsed from the schedule photo/text). */
export interface Course {
  title: string;
  /** Days of week this class meets: 0 = Sun … 6 = Sat. */
  days: number[];
  /** Local wall-clock "HH:mm". */
  start: string;
  end: string;
  location?: string;
}

/** A single scheduled block in the generated plan. */
export interface PlanEvent {
  id: string;
  title: string;
  type: EventType;
  /** Local calendar date "YYYY-MM-DD". */
  date: string;
  /** Local wall-clock "HH:mm". */
  start: string;
  end: string;
  /** Which task this study block advances (omitted for class/break/etc). */
  taskId?: string;
  /** Student marked this block finished — drives the rolling re-plan. */
  done?: boolean;
  notes?: string;
}

/** Planning preferences that shape how the AI fills free time. */
export interface Preferences {
  /** IANA timezone, e.g. "America/New_York". Defaults to the device tz. */
  timezone: string;
  /** Earliest the student wants to be scheduled, "HH:mm". */
  wakeTime: string;
  /** Latest the student wants to be scheduled, "HH:mm". */
  sleepTime: string;
  /** Length of one focused study block, minutes. */
  studyBlockMinutes: number;
  /** Break length between study blocks, minutes. */
  breakMinutes: number;
  /** Soft cap on total study minutes per day (weekdays). */
  maxStudyMinutesPerDay: number;
  /** Hours the student is willing to work on each *weekend* day (Sat/Sun). */
  weekendStudyHours: number;
}

export const DEFAULT_PREFERENCES: Omit<Preferences, 'timezone'> = {
  wakeTime: '08:00',
  sleepTime: '23:00',
  studyBlockMinutes: 50,
  breakMinutes: 10,
  maxStudyMinutesPerDay: 360,
  weekendStudyHours: 3,
};

/** The full plan returned by the backend and rendered in the app. */
export interface Plan {
  /** ISO datetime the plan was generated. */
  generatedAt: string;
  /** Inclusive local date "YYYY-MM-DD" the plan starts. */
  rangeStart: string;
  /** Inclusive local date "YYYY-MM-DD" the plan ends. */
  rangeEnd: string;
  timezone: string;
  courses: Course[];
  events: PlanEvent[];
  /** Friendly one-paragraph recap from the assistant. */
  summary: string;
  /** Anything the student should know (e.g. "not enough time before Fri"). */
  warnings: string[];
}

/** Request body for POST /api/plan. */
export interface PlanRequest {
  scheduleText?: string;
  /** Raw base64 (no data: prefix) of a schedule photo, optional. */
  scheduleImageBase64?: string;
  scheduleImageMime?: string;
  tasks: TaskInput[];
  preferences: Preferences;
  /** ISO datetime "now" on the device, so the server plans from the present. */
  nowISO: string;
  /** Inclusive local "YYYY-MM-DD" planning window the user chose. */
  rangeStart?: string;
  rangeEnd?: string;
}

/** The planning window the student is scheduling within. */
export interface PlanRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/**
 * "Can you make it?" — the feasibility check. Computed on-device from the
 * produced plan (works for both AI and local plans), so the verdict always
 * matches what's actually on the calendar.
 */
export type FeasibilityVerdict = 'on-track' | 'tight' | 'wont-fit';

/** Per-task feasibility: how much of the estimate actually fits before its due. */
export interface TaskFeasibility {
  taskId: string;
  title: string;
  deadline: string;
  /** Estimated effort still owed (estimate minus already-done blocks). */
  requiredHours: number;
  /** Study hours the plan actually places before the deadline. */
  scheduledHours: number;
  /** Hours that couldn't be fit before the deadline (0 = fully fits). */
  deficitHours: number;
  /** True when the work is placed but with little/no buffer before the due. */
  tight: boolean;
  /** True when the due date already passed — nothing can be scheduled for it. */
  overdue: boolean;
}

/** The overall feasibility verdict shown in the headline banner. */
export interface Feasibility {
  verdict: FeasibilityVerdict;
  /** Short headline, e.g. "You're on track". */
  headline: string;
  /** One concrete, honest next step (the "fix"). */
  detail: string;
  /** Per-task breakdown, worst first. */
  tasks: TaskFeasibility[];
}

/** Calendar the student connects Pawse to for one-tap export. */
export type CalendarProvider = 'apple' | 'google';

/** One manually-entered class: a name + a free-text day/time. */
export interface ClassEntry {
  id: string;
  name: string;
  time: string; // e.g. "Mon/Wed 10:00–11:15"
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
