/**
 * iCalendar (.ics) generation + share. This is the universal export path —
 * the user taps "Export", the iOS share sheet opens, and they can drop the
 * whole week into Google Calendar, Outlook, Apple Calendar, Files, etc.
 *
 * Times are emitted in UTC (trailing Z) derived from the device-local
 * instant, which is the most portable, DST-safe form (RFC 5545 §3.8.2.4).
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Plan } from '@/types/plan';
import { eventDates, toUtcStamp } from './datetime';

/** Google Calendar's "Import & export" settings page (accepts .ics files). */
export const GOOGLE_CALENDAR_IMPORT_URL =
  'https://calendar.google.com/calendar/u/0/r/settings/export';

/** Escape a TEXT property value per RFC 5545 §3.3.11. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold long content lines at ~75 octets (CRLF + single leading space). */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length) {
    parts.push(' ' + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  return parts.join('\r\n');
}

export function buildIcs(plan: Plan): string {
  const stamp = toUtcStamp(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pawse//Pawse iOS App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Pawse',
  ];

  for (const ev of plan.events) {
    const { start, end } = eventDates(ev);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@pawse.app`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${toUtcStamp(start)}`);
    lines.push(`DTEND:${toUtcStamp(end)}`);
    lines.push(fold(`SUMMARY:${escapeText(ev.title)}`));
    if (ev.notes) lines.push(fold(`DESCRIPTION:${escapeText(ev.notes)}`));
    if (ev.type !== 'break') {
      lines.push('BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:Pawse reminder', 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Browser path: download the .ics directly (no share sheet on web). */
function downloadIcsWeb(plan: Plan): void {
  const blob = new Blob([buildIcs(plan)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pawse-schedule.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Export the plan as .ics: system share sheet on device, a plain file
 * download on web (double-clicking it lands in Apple Calendar / Outlook;
 * Google Calendar imports it from its settings page).
 */
export async function exportPlanAsIcs(plan: Plan): Promise<boolean> {
  if (Platform.OS === 'web') {
    downloadIcsWeb(plan);
    return true;
  }
  const ics = buildIcs(plan);
  const file = new File(Paths.cache, 'pawse-schedule.ics');
  try {
    file.create();
  } catch {
    // File already exists from a previous export — write() overwrites it.
  }
  file.write(ics);

  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/calendar',
    UTI: 'com.apple.ical.ics',
    dialogTitle: 'Add your Pawse week to a calendar',
  });
  return true;
}

/** Per-event "Add to Google Calendar" template URL (single event). */
export function googleCalendarUrl(opts: {
  title: string;
  startUtc: string; // 20260628T130000Z
  endUtc: string;
  details?: string;
}): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${opts.startUtc}/${opts.endUtc}`,
    ...(opts.details ? { details: opts.details } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
