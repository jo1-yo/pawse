/**
 * Global app state — tasks, schedule input, preferences, the generated plan,
 * chat history, and the backend URL. Persisted to device storage so the
 * student's week survives an app restart (no account / server storage in v1).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_BACKEND_URL } from '@/lib/config';
import { getDeviceTimezone } from '@/lib/datetime';
import { buildLocalPlan } from '@/lib/localPlanner';
import { parseClasses } from '@/lib/parseClasses';
import { resyncPlanWithClasses } from '@/lib/planSync';
import {
  DEFAULT_PREFERENCES,
  type CalendarProvider,
  type ChatMessage,
  type ClassEntry,
  type Course,
  type Plan,
  type PlanEvent,
  type PlanRange,
  type Preferences,
  type Priority,
  type TaskInput,
} from '@/types/plan';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function defaultRange(): PlanRange {
  // Rolling ~1-month window: backward-planning + feasibility are computed
  // across all upcoming deadlines, while the UI defaults to the Today view.
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 27);
  return { start: isoDay(start), end: isoDay(end) };
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hey, take a breath! 🐱💕 I'm Pawse. Tell me what's stressing you out, or add your classes and to-dos and I'll build you a calm, doable schedule. You've got this. ✨",
};

/**
 * Outcome of reading the attached timetable photo.
 * 'idle' not read yet · 'read' classes found · 'unreadable' no timetable in
 * the image · 'error' the read itself failed (offline, server down).
 */
export type PhotoStatus = 'idle' | 'read' | 'unreadable' | 'error';

interface PlanState {
  // ---- inputs ----
  scheduleText: string;
  scheduleImageBase64: string | null;
  scheduleImageMime: string | null;
  /** True while the backend is reading the photo into classes (transient). */
  parsingClasses: boolean;
  /**
   * How the attached photo's read went (transient). 'unreadable' means the
   * read succeeded but found no classes — usually the image isn't a timetable
   * — which the UI must show rather than leaving the card looking attached.
   */
  scheduleImageStatus: PhotoStatus;
  tasks: TaskInput[];
  classEntries: ClassEntry[];
  preferences: Preferences;
  courses: Course[];
  planRange: PlanRange;
  onboarded: boolean;
  /** Calendar the student connected during onboarding (null = not chosen). */
  calendarProvider: CalendarProvider | null;

  // ---- output ----
  plan: Plan | null;

  // ---- companion ----
  chat: ChatMessage[];

  // ---- settings ----
  /**
   * Where the timetable-photo reader lives. A build-time constant from
   * app.json's `extra.backendUrl` — deliberately not user-editable and not
   * persisted, so a stale value can never outlive a redeploy.
   */
  backendUrl: string;
  /** OAuth access token for direct Google Calendar write (null = not linked). */
  googleAccessToken: string | null;
  /** Epoch ms when the Google token expires; re-connect when past. */
  googleTokenExpiresAt: number | null;

  // ---- actions ----
  setScheduleText: (text: string) => void;
  setScheduleImage: (base64: string | null, mime: string | null) => void;
  setParsingClasses: (value: boolean) => void;
  setScheduleImageStatus: (value: PhotoStatus) => void;
  addTask: (partial?: Partial<TaskInput>) => void;
  updateTask: (id: string, patch: Partial<TaskInput>) => void;
  removeTask: (id: string) => void;
  addClassEntry: (name: string, time: string) => void;
  removeClassEntry: (id: string) => void;
  setPreferences: (patch: Partial<Preferences>) => void;
  setPlanRange: (patch: Partial<PlanRange>) => void;
  rollWindowForward: () => void;
  setOnboarded: (value: boolean) => void;
  setCalendarProvider: (provider: CalendarProvider | null) => void;
  /** Heal a plan whose classes drifted from the list (pre-sync app builds). */
  syncPlanOnLoad: () => void;
  setPlan: (plan: Plan | null) => void;
  addPlanEvent: (event: PlanEvent) => void;
  updatePlanEvent: (id: string, patch: Partial<PlanEvent>) => void;
  removePlanEvent: (id: string) => void;
  setGoogleToken: (token: string, expiresAt: number) => void;
  clearGoogleToken: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  resetChat: () => void;
  clearAll: () => void;
}

/** Canonical fingerprint of a course set, for cheap drift detection. */
const courseKey = (courses: Course[]) =>
  JSON.stringify(
    courses
      .map((c) => `${c.title}|${[...c.days].sort().join('')}|${c.start}|${c.end}`)
      .sort(),
  );

/**
 * Real-time planning: any new info (a task, a class, a photo that just finished
 * reading) should reach the schedule immediately — no second "Generate" tap.
 * If a plan already exists we re-fit it (done blocks kept); if not, we build the
 * first plan right here as soon as there's at least one real task. With no
 * tasks yet there's nothing to place, so we just store the inputs.
 */
function replan(
  s: PlanState,
  over: { tasks?: TaskInput[]; classEntries?: ClassEntry[] } = {},
): Partial<PlanState> {
  const tasks = over.tasks ?? s.tasks;
  const classEntries = over.classEntries ?? s.classEntries;
  const validTasks = tasks.filter((t) => t.title.trim().length > 0);
  if (validTasks.length === 0) return { tasks, classEntries };

  const plan = s.plan
    ? resyncPlanWithClasses({
        plan: s.plan,
        tasks,
        classEntries,
        scheduleText: s.scheduleText,
        preferences: s.preferences,
        planRange: s.planRange,
      })
    : buildLocalPlan(
        validTasks,
        parseClasses(classEntries, s.scheduleText),
        s.preferences,
        new Date(),
        s.planRange,
      );

  return plan ? { tasks, classEntries, plan, courses: plan.courses } : { tasks, classEntries };
}

function freshTask(): TaskInput {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  tomorrow.setHours(17, 0, 0, 0);
  return {
    id: uid(),
    title: '',
    estimatedHours: 2,
    deadline: tomorrow.toISOString(),
    priority: 'medium' as Priority,
  };
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      scheduleText: '',
      scheduleImageBase64: null,
      scheduleImageMime: null,
      parsingClasses: false,
      scheduleImageStatus: 'idle',
      tasks: [],
      classEntries: [],
      preferences: { ...DEFAULT_PREFERENCES, timezone: getDeviceTimezone() },
      courses: [],
      planRange: defaultRange(),
      onboarded: false,
      calendarProvider: null,
      plan: null,
      chat: [GREETING],
      backendUrl: DEFAULT_BACKEND_URL,
      googleAccessToken: null,
      googleTokenExpiresAt: null,

      setScheduleText: (text) => set({ scheduleText: text }),
      setScheduleImage: (base64, mime) =>
        set({ scheduleImageBase64: base64, scheduleImageMime: mime, scheduleImageStatus: 'idle' }),
      setParsingClasses: (value) => set({ parsingClasses: value }),
      setScheduleImageStatus: (value) => set({ scheduleImageStatus: value }),
      addTask: (partial) =>
        set((s) => replan(s, { tasks: [...s.tasks, { ...freshTask(), ...partial }] })),
      updateTask: (id, patch) =>
        set((s) => replan(s, { tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTask: (id) => set((s) => replan(s, { tasks: s.tasks.filter((t) => t.id !== id) })),
      addClassEntry: (name, time) =>
        set((s) => replan(s, { classEntries: [...s.classEntries, { id: uid(), name, time }] })),
      removeClassEntry: (id) =>
        set((s) => replan(s, { classEntries: s.classEntries.filter((c) => c.id !== id) })),
      setPreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),
      setPlanRange: (patch) => set((s) => ({ planRange: { ...s.planRange, ...patch } })),
      rollWindowForward: () =>
        set((s) => {
          // The persisted window goes stale after time away; planning starts
          // today, so the window can never begin in the past.
          const today = isoDay(new Date());
          if (s.planRange.end < today) return { planRange: defaultRange() };
          if (s.planRange.start < today) return { planRange: { ...s.planRange, start: today } };
          return {};
        }),
      setOnboarded: (value) => set({ onboarded: value }),
      setCalendarProvider: (provider) => set({ calendarProvider: provider }),
      syncPlanOnLoad: () =>
        set((s) => {
          if (!s.plan) return {};
          const parsed = parseClasses(s.classEntries, s.scheduleText);
          if (courseKey(parsed) === courseKey(s.plan.courses)) return {};
          return replan(s);
        }),
      setPlan: (plan) => set({ plan, courses: plan?.courses ?? [] }),
      addPlanEvent: (event) =>
        set((s) => (s.plan ? { plan: { ...s.plan, events: [...s.plan.events, event] } } : {})),
      updatePlanEvent: (id, patch) =>
        set((s) =>
          s.plan
            ? {
                plan: {
                  ...s.plan,
                  events: s.plan.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
                },
              }
            : {},
        ),
      removePlanEvent: (id) =>
        set((s) =>
          s.plan ? { plan: { ...s.plan, events: s.plan.events.filter((e) => e.id !== id) } } : {},
        ),
          setGoogleToken: (token, expiresAt) =>
        set({ googleAccessToken: token, googleTokenExpiresAt: expiresAt }),
      clearGoogleToken: () => set({ googleAccessToken: null, googleTokenExpiresAt: null }),
      addChatMessage: (msg) => set((s) => ({ chat: [...s.chat, msg] })),
      resetChat: () => set({ chat: [GREETING] }),
      clearAll: () =>
        set((s) => ({
          scheduleText: '',
          scheduleImageBase64: null,
          scheduleImageMime: null,
          scheduleImageStatus: 'idle' as PhotoStatus,
          tasks: [],
          classEntries: [],
          courses: [],
          plan: null,
          chat: [GREETING],
          preferences: s.preferences, // rhythm settings survive a clear
        })),
    }),
    {
      name: 'pawse-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.rollWindowForward();
        state?.syncPlanOnLoad();
      },
      partialize: (s) => ({
        scheduleText: s.scheduleText,
        tasks: s.tasks,
        classEntries: s.classEntries,
        preferences: s.preferences,
        courses: s.courses,
        planRange: s.planRange,
        onboarded: s.onboarded,
        calendarProvider: s.calendarProvider,
        plan: s.plan,
        googleAccessToken: s.googleAccessToken,
        googleTokenExpiresAt: s.googleTokenExpiresAt,
        // chat + raw image are intentionally not persisted
      }),
    },
  ),
);
