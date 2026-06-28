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
  /** Soft cap on total study minutes per day. */
  maxStudyMinutesPerDay: number;
}

export const DEFAULT_PREFERENCES: Omit<Preferences, 'timezone'> = {
  wakeTime: '08:00',
  sleepTime: '23:00',
  studyBlockMinutes: 50,
  breakMinutes: 10,
  maxStudyMinutesPerDay: 360,
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
