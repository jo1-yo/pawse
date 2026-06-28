/**
 * Date / time helpers.
 *
 * Pawse plans live in the *device* timezone. We build JS `Date`s with the
 * local constructor from wall-clock parts ("YYYY-MM-DD" + "HH:mm"), which
 * gives the correct absolute instant (the JS engine applies the device tz,
 * including DST). UTC strings for .ics / Google links are derived from that
 * instant via `getUTC*`, so they stay correct across DST boundaries.
 */

import * as Localization from 'expo-localization';
import dayjs from 'dayjs';

import type { PlanEvent } from '@/types/plan';

export function getDeviceTimezone(): string {
  return Localization.getCalendars()[0]?.timeZone ?? 'UTC';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Build a local `Date` from "YYYY-MM-DD" + "HH:mm". */
export function localDate(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

/** "YYYY-MM-DD" for a Date in local time. */
export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** UTC basic format for iCalendar / Google Calendar: 20260628T130000Z. */
export function toUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** A PlanEvent's start/end as absolute local Dates. */
export function eventDates(ev: PlanEvent): { start: Date; end: Date } {
  return { start: localDate(ev.date, ev.start), end: localDate(ev.date, ev.end) };
}

export function durationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/** "9:00 AM" from "09:00". */
export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}

/** "Mon, Jun 28" from "2026-06-28". */
export function formatDateHeading(dateStr: string): string {
  return dayjs(dateStr).format('ddd, MMM D');
}

/** "Jun 28 – Jul 4" from two ISO dates. */
export function formatRange(startStr: string, endStr: string): string {
  const s = dayjs(startStr);
  const e = dayjs(endStr);
  if (s.month() === e.month()) return `${s.format('MMM D')} – ${e.format('D')}`;
  return `${s.format('MMM D')} – ${e.format('MMM D')}`;
}

/** Friendly relative deadline label, e.g. "in 2 days · Fri 5:00 PM". */
export function formatDeadline(deadlineISO: string): string {
  const d = dayjs(deadlineISO);
  const now = dayjs();
  const hours = d.diff(now, 'hour');
  let rel: string;
  if (hours < 0) rel = 'overdue';
  else if (hours < 24) rel = `in ${Math.max(1, hours)}h`;
  else rel = `in ${Math.round(hours / 24)}d`;
  return `${rel} · ${d.format('ddd h:mm A')}`;
}

/** Nudge a "HH:mm" time by a number of minutes, clamped to the same day. */
export function nudgeTime(timeStr: string, deltaMinutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = Math.min(1439, Math.max(0, (h ?? 0) * 60 + (m ?? 0) + deltaMinutes));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Shift a "YYYY-MM-DD" date string by a number of days. */
export function shiftDate(dateStr: string, days: number): string {
  return isoDate(addDays(localDate(dateStr, '00:00'), days));
}

/** "Jun 28" from "2026-06-28". */
export function formatDay(dateStr: string): string {
  return dayjs(dateStr).format('MMM D');
}

/** Every "YYYY-MM-DD" from start to end inclusive (capped at 31 days). */
export function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  let cur = start;
  for (let i = 0; i < 31; i++) {
    days.push(cur);
    if (cur >= end) break;
    cur = shiftDate(cur, 1);
  }
  return days;
}

/** Group events by local date, sorted chronologically within each day. */
export function groupByDate(events: PlanEvent[]): { date: string; events: PlanEvent[] }[] {
  const map = new Map<string, PlanEvent[]>();
  for (const ev of events) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date)!.push(ev);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, evs]) => ({
      date,
      events: evs.sort((a, b) => a.start.localeCompare(b.start)),
    }));
}
