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
import {
  DEFAULT_PREFERENCES,
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
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 6);
  return { start: isoDay(start), end: isoDay(end) };
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hey, take a breath! 🐱💕 I'm Pawse. Tell me what's stressing you out, or add your classes and to-dos and I'll build you a calm, doable schedule. You've got this. ✨",
};

interface PlanState {
  // ---- inputs ----
  scheduleText: string;
  scheduleImageBase64: string | null;
  scheduleImageMime: string | null;
  tasks: TaskInput[];
  classEntries: ClassEntry[];
  preferences: Preferences;
  courses: Course[];
  planRange: PlanRange;
  onboarded: boolean;

  // ---- output ----
  plan: Plan | null;

  // ---- companion ----
  chat: ChatMessage[];

  // ---- settings ----
  backendUrl: string;

  // ---- actions ----
  setScheduleText: (text: string) => void;
  setScheduleImage: (base64: string | null, mime: string | null) => void;
  addTask: (partial?: Partial<TaskInput>) => void;
  updateTask: (id: string, patch: Partial<TaskInput>) => void;
  removeTask: (id: string) => void;
  addClassEntry: (name: string, time: string) => void;
  removeClassEntry: (id: string) => void;
  setPreferences: (patch: Partial<Preferences>) => void;
  setPlanRange: (patch: Partial<PlanRange>) => void;
  setOnboarded: (value: boolean) => void;
  setPlan: (plan: Plan | null) => void;
  addPlanEvent: (event: PlanEvent) => void;
  updatePlanEvent: (id: string, patch: Partial<PlanEvent>) => void;
  removePlanEvent: (id: string) => void;
  setBackendUrl: (url: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  resetChat: () => void;
  clearAll: () => void;
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
      tasks: [],
      classEntries: [],
      preferences: { ...DEFAULT_PREFERENCES, timezone: getDeviceTimezone() },
      courses: [],
      planRange: defaultRange(),
      onboarded: false,
      plan: null,
      chat: [GREETING],
      backendUrl: DEFAULT_BACKEND_URL,

      setScheduleText: (text) => set({ scheduleText: text }),
      setScheduleImage: (base64, mime) =>
        set({ scheduleImageBase64: base64, scheduleImageMime: mime }),
      addTask: (partial) => set((s) => ({ tasks: [...s.tasks, { ...freshTask(), ...partial }] })),
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      addClassEntry: (name, time) =>
        set((s) => ({ classEntries: [...s.classEntries, { id: uid(), name, time }] })),
      removeClassEntry: (id) =>
        set((s) => ({ classEntries: s.classEntries.filter((c) => c.id !== id) })),
      setPreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),
      setPlanRange: (patch) => set((s) => ({ planRange: { ...s.planRange, ...patch } })),
      setOnboarded: (value) => set({ onboarded: value }),
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
      setBackendUrl: (url) => set({ backendUrl: url.trim() }),
      addChatMessage: (msg) => set((s) => ({ chat: [...s.chat, msg] })),
      resetChat: () => set({ chat: [GREETING] }),
      clearAll: () =>
        set((s) => ({
          scheduleText: '',
          scheduleImageBase64: null,
          scheduleImageMime: null,
          tasks: [],
          classEntries: [],
          courses: [],
          plan: null,
          chat: [GREETING],
          // keep preferences + backendUrl
          preferences: s.preferences,
          backendUrl: s.backendUrl,
        })),
    }),
    {
      name: 'pawse-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        scheduleText: s.scheduleText,
        tasks: s.tasks,
        classEntries: s.classEntries,
        preferences: s.preferences,
        courses: s.courses,
        planRange: s.planRange,
        onboarded: s.onboarded,
        plan: s.plan,
        backendUrl: s.backendUrl,
        // chat + raw image are intentionally not persisted
      }),
    },
  ),
);
