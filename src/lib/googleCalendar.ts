/**
 * Direct Google Calendar write via the REST API (no backend, no .ics download).
 *
 * One tap inserts the whole week into a dedicated "Pawse" Google calendar.
 * Re-running first clears the Pawse events already in the plan's date range, so
 * re-planning updates cleanly instead of piling up duplicates — the same
 * contract as the Apple/EventKit path in `calendar.ts`.
 *
 * Auth is an OAuth access token (scope `calendar.events`) obtained by
 * `useGoogleCalendar` and passed in here; this module never touches OAuth, so
 * the write logic stays pure and testable. Works on web and native alike,
 * because it's just HTTPS calls.
 */

import type { Plan } from '@/types/plan';
import { getDeviceTimezone, shiftDate } from './datetime';

const API = 'https://www.googleapis.com/calendar/v3';
const PAWSE_CALENDAR_TITLE = 'Pawse';

/** Thrown on 401 so the caller can drop the stale token and re-connect. */
export class GoogleAuthError extends Error {
  constructor() {
    super('Google sign-in expired. Reconnect to add to Google Calendar.');
    this.name = 'GoogleAuthError';
  }
}

async function gfetch(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) throw new GoogleAuthError();
  if (res.status === 204) return undefined; // DELETE returns no body
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Google Calendar error (${res.status}).`;
    throw new Error(message);
  }
  return data;
}

/** Find the user's "Pawse" calendar, creating it on first export. */
async function getOrCreatePawseCalendar(token: string): Promise<string> {
  const list = await gfetch(token, '/users/me/calendarList?minAccessRole=writer');
  const existing = (list.items ?? []).find(
    (c: { summary?: string }) => c.summary === PAWSE_CALENDAR_TITLE,
  );
  if (existing?.id) return existing.id as string;

  const created = await gfetch(token, '/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary: PAWSE_CALENDAR_TITLE }),
  });
  return created.id as string;
}

/** RFC3339 UTC bound, widened a day so no local-timezone event slips the net. */
function utcBound(dateStr: string, deltaDays: number): string {
  return `${shiftDate(dateStr, deltaDays)}T00:00:00Z`;
}

/** Delete the Pawse events already in this range so re-planning doesn't dup. */
async function clearRange(token: string, calendarId: string, plan: Plan): Promise<void> {
  const params = new URLSearchParams({
    timeMin: utcBound(plan.rangeStart, -1),
    timeMax: utcBound(plan.rangeEnd, 1),
    singleEvents: 'true',
    maxResults: '2500',
  });
  const existing = await gfetch(token, `/calendars/${calendarId}/events?${params}`);
  await Promise.all(
    (existing.items ?? []).map((e: { id?: string }) =>
      e.id
        ? gfetch(token, `/calendars/${calendarId}/events/${e.id}`, { method: 'DELETE' }).catch(
            () => undefined,
          )
        : undefined,
    ),
  );
}

/**
 * Add every real (non-break) event in the plan to the user's Google Calendar.
 * Returns the number of events written. Throws {@link GoogleAuthError} if the
 * token is stale so the caller can re-connect and retry.
 */
export async function addPlanToGoogleCalendar(plan: Plan, token: string): Promise<number> {
  const timeZone = plan.timezone || getDeviceTimezone();
  const calendarId = await getOrCreatePawseCalendar(token);

  // Best-effort cleanup; never block the add on a stale delete.
  try {
    await clearRange(token, calendarId, plan);
  } catch (err) {
    if (err instanceof GoogleAuthError) throw err;
  }

  // Breaks are visual spacing only (see SchedulePane) — don't clutter the
  // real calendar with them, matching the .ics export.
  const events = plan.events.filter((ev) => ev.type !== 'break');

  let count = 0;
  for (const ev of events) {
    await gfetch(token, `/calendars/${calendarId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        summary: ev.title,
        description: ev.notes,
        // Wall-clock local time + IANA zone: Google anchors it to the zone,
        // so it lands at the right instant regardless of the device's region.
        start: { dateTime: `${ev.date}T${ev.start}:00`, timeZone },
        end: { dateTime: `${ev.date}T${ev.end}:00`, timeZone },
      }),
    });
    count += 1;
  }
  return count;
}
