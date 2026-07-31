/**
 * Native Apple Calendar (EventKit) export via expo-calendar's class-based API.
 *
 * One tap writes the whole week into a dedicated "Pawse" calendar. Re-running
 * "Add to Apple Calendar" first clears the Pawse events already in the plan's
 * date range, so re-planning updates cleanly instead of piling up duplicates.
 *
 * NOTE: expo-calendar requires a *development build* — it does not run in
 * Expo Go (SDK 56). See SHIP.md.
 */

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import { Brand } from '@/constants/theme';
import type { Plan } from '@/types/plan';
import { addDays, eventDates, getDeviceTimezone, localDate } from './datetime';

const PAWSE_CALENDAR_TITLE = 'Pawse';

export class CalendarPermissionError extends Error {
  constructor() {
    super('Calendar access was not granted.');
    this.name = 'CalendarPermissionError';
  }
}

/**
 * Ask for EventKit access up front (the onboarding "connect" moment), so the
 * first one-tap export doesn't stall on a permission dialog. Native only.
 */
export async function requestAppleCalendarAccess(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const permission = await Calendar.requestCalendarPermissions();
  return permission.granted;
}

async function getOrCreatePawseCalendar(): Promise<Calendar.ExpoCalendar> {
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const existing = calendars.find(
    (c) => c.title === PAWSE_CALENDAR_TITLE && c.allowsModifications,
  );
  if (existing) return existing;

  let source: Calendar.Source | undefined;
  let sourceId: string | undefined;
  if (Platform.OS === 'ios') {
    const def = Calendar.getDefaultCalendarSync();
    source = def?.source;
    sourceId = def?.source?.id;
  }

  return Calendar.createCalendar({
    title: PAWSE_CALENDAR_TITLE,
    color: Brand.pink,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId,
    source:
      Platform.OS === 'android'
        ? ({ isLocalAccount: true, name: PAWSE_CALENDAR_TITLE, type: 'LOCAL' } as Calendar.Source)
        : source,
    name: PAWSE_CALENDAR_TITLE,
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/**
 * Add every event in the plan to the user's Apple Calendar.
 * Returns the number of events written.
 */
export async function addPlanToAppleCalendar(plan: Plan): Promise<number> {
  const permission = await Calendar.requestCalendarPermissions();
  if (!permission.granted) throw new CalendarPermissionError();

  const calendar = await getOrCreatePawseCalendar();
  const timeZone = plan.timezone || getDeviceTimezone();

  // Clear our previous events in this range so re-planning doesn't duplicate.
  try {
    const rangeStart = localDate(plan.rangeStart, '00:00');
    const rangeEnd = addDays(localDate(plan.rangeEnd, '00:00'), 1);
    const previous = await calendar.listEvents(rangeStart, rangeEnd);
    await Promise.all(previous.map((e) => e.delete().catch(() => undefined)));
  } catch {
    // Best-effort cleanup; never block the add.
  }

  let count = 0;
  for (const ev of plan.events) {
    const { start, end } = eventDates(ev);
    await calendar.createEvent({
      title: ev.title,
      startDate: start,
      endDate: end,
      notes: ev.notes,
      timeZone,
      alarms: ev.type !== 'break' ? [{ relativeOffset: -10 }] : undefined,
    });
    count += 1;
  }
  return count;
}
