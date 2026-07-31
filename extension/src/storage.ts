import type { Course, Plan, Preferences, TaskInput } from '@/types/plan';
import { DEFAULT_PREFERENCES } from '@/types/plan';
import { getDeviceTimezone } from '@/lib/datetime';

export interface PersistedState {
  tasks: TaskInput[];
  courses: Course[];
  scheduleText: string;
  prefs: Preferences;
  plan: Plan | null;
  backendUrl: string;
}

const KEY = 'pawse-ext-v1';

export function defaultState(): PersistedState {
  return {
    tasks: [],
    courses: [],
    scheduleText: '',
    prefs: { timezone: getDeviceTimezone(), ...DEFAULT_PREFERENCES },
    plan: null,
    // Point the extension at a deployed backend for a shipped build:
    //   VITE_BACKEND_URL=https://your-server npm run build
    // Falls back to the local dev server. (Also add the URL to
    // manifest.host_permissions before publishing.)
    backendUrl: ((import.meta as { env?: Record<string, string> }).env?.VITE_BACKEND_URL) || 'http://localhost:8787',
  };
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const saved = JSON.parse(raw) as Partial<PersistedState>;
    const base = defaultState();
    return {
      ...base,
      ...saved,
      prefs: { ...base.prefs, ...(saved.prefs ?? {}) },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable; the session still works in memory.
  }
}
