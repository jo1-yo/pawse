/**
 * Best-effort parser that turns the student's free-text class input into
 * structured {@link Course} blocks the on-device engine can route study time
 * around. The AI backend does the heavy lifting for messy timetables/photos;
 * this is the dependable floor for the web preview and offline use.
 *
 * Handles the common shapes students type:
 *   "Mon/Wed 10:00–11:15", "MWF 9-9:50am", "TTh 1:00-2:15pm CS 101",
 *   "CMPU-102-01 Data Structures Tue/Thu 13:30–14:45" (course codes skipped)
 * Anything it can't read is skipped (never throws) — a class it misses just
 * means slightly looser free-time routing, not a crash.
 */

import type { ClassEntry, Course } from '@/types/plan';

const pad = (n: number) => String(n).padStart(2, '0');

/** Long day words → weekday index (0 = Sun … 6 = Sat). */
const DAY_WORDS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sun: 0,
  mon: 1,
  tue: 2,
  tues: 2,
  wed: 3,
  weds: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  fri: 5,
  sat: 6,
};

/** Expand a compact code like "MWF" or "TTh" into weekday indices. */
function expandCompactDays(token: string): number[] {
  const t = token.toLowerCase();
  const days: number[] = [];
  let i = 0;
  while (i < t.length) {
    const two = t.slice(i, i + 2);
    if (two === 'th') {
      days.push(4); // Thursday
      i += 2;
    } else if (two === 'su') {
      days.push(0);
      i += 2;
    } else if (two === 'sa') {
      days.push(6);
      i += 2;
    } else if (two === 'tu') {
      days.push(2);
      i += 2;
    } else {
      const one = t[i];
      const map: Record<string, number> = { m: 1, t: 2, w: 3, f: 5, s: 6, u: 0 };
      if (one in map) days.push(map[one]!);
      i += 1;
    }
  }
  return days;
}

/** Pull every weekday index out of a chunk like "Mon/Wed" or "MWF". */
function parseDays(text: string): number[] {
  const found = new Set<number>();
  // Split on separators students use between days.
  const tokens = text.split(/[\s/,&]+|and/i).filter(Boolean);
  for (const raw of tokens) {
    const word = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) continue;
    if (word in DAY_WORDS) {
      found.add(DAY_WORDS[word]!);
    } else if (/^[mtwfsuh]+$/.test(word) && !/[\d-]/.test(raw)) {
      // Compact codes like "MWF" — but never a course code ("MTH-201").
      for (const d of expandCompactDays(word)) found.add(d);
    }
  }
  return [...found].sort((a, b) => a - b);
}

/** Parse a single "9", "9:30", "9am", "2:15 pm" into minutes since midnight. */
function parseClock(hh: string, mm: string | undefined, mer: string | undefined): number {
  let h = Number(hh);
  const m = mm ? Number(mm) : 0;
  const meridiem = mer?.toLowerCase();
  if (meridiem === 'pm' && h < 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  return h * 60 + m;
}

const TIME_RANGE =
  /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[–\-—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;

const toHHMM = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

interface TimeMatch {
  start: string;
  end: string;
  /** Where the time sat in the line, so the name can be cut around it. */
  index: number;
  length: number;
}

/**
 * Extract the first *plausible* start/end "HH:mm" pair from a line.
 * Course codes look like time ranges ("CMPU-102-01" contains "02-01"), so a
 * candidate is skipped when it's embedded in a longer number/code or doesn't
 * survive validation — the real time later in the line still gets found.
 */
function findTimeRange(text: string): TimeMatch | null {
  for (const m of text.matchAll(TIME_RANGE)) {
    const before = m.index! > 0 ? text[m.index! - 1]! : '';
    const after = text[m.index! + m[0].length] ?? '';
    if (/[\d:–\-—]/.test(before) || /[\d:.]/.test(after)) continue;
    const range = toRange(m);
    if (range) return { ...range, index: m.index!, length: m[0].length };
  }
  return null;
}

/** Validate + normalize one regex match into a start/end pair, or null. */
function toRange(m: RegExpMatchArray): { start: string; end: string } | null {
  if (Number(m[1]) > 24 || Number(m[4]) > 24) return null;
  if ((m[2] && Number(m[2]) > 59) || (m[5] && Number(m[5]) > 59)) return null;
  let startMin = parseClock(m[1]!, m[2], m[3]);
  let endMin = parseClock(m[4]!, m[5], m[6]);
  // Start lacks am/pm but end has one ("1:00-2:15pm") → the start shares the
  // end's meridiem when that still puts it before the end.
  if (!m[3] && m[6]) {
    const inherited = parseClock(m[1]!, m[2], m[6]);
    if (inherited < endMin) startMin = inherited;
  }
  // No am/pm anywhere and both look like early "afternoon" hours → assume PM.
  if (!m[3] && !m[6] && startMin < 8 * 60 && endMin <= startMin) {
    startMin += 12 * 60;
    endMin += 12 * 60;
  }
  // End rolled before start (e.g. "11–1") → it's a PM end.
  if (endMin <= startMin) endMin += 12 * 60;
  if (endMin <= startMin || endMin > 24 * 60) return null;
  return { start: toHHMM(startMin), end: toHHMM(endMin) };
}

/** Parse one line ("Mon/Wed 10:00–11:15 CS 101") into a Course, or null. */
function parseLine(line: string, fallbackName?: string): Course | null {
  const days = parseDays(line);
  const time = findTimeRange(line);
  if (days.length === 0 || !time) return null;
  // The leftover text (the matched time cut out, day words stripped) is the
  // course name — but a caller-supplied name (a structured class row) wins.
  const leftover = (line.slice(0, time.index) + ' ' + line.slice(time.index + time.length))
    .replace(/[\s/,&]*\b(mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, ' ')
    .replace(/\b[mtwfsuh]{2,}\b/gi, ' ')
    // Strip separator dashes/dots but keep them inside codes ("CMPU-102-01").
    .replace(/\s+[–\-—|·]+(\s+|$)/g, ' ')
    .replace(/(^|\s)[–\-—|·]+\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const name = fallbackName || leftover || 'Class';
  return { title: name, days, start: time.start, end: time.end };
}

/**
 * Turn the student's structured class rows + free-text timetable into Courses.
 * Already-structured courses (from the AI) should be preferred by the caller;
 * this only runs when those are absent.
 */
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format a structured Course back into an editable class row — the inverse of
 * {@link parseClasses}, so AI-extracted classes land in the same list the
 * student types into (and round-trip cleanly at generate time).
 */
export function courseToEntryText(course: Course): { name: string; time: string } {
  const days = [...course.days]
    .sort((a, b) => a - b)
    .map((d) => DAY_ABBR[d])
    .filter(Boolean)
    .join('/');
  return { name: course.title, time: `${days} ${course.start}–${course.end}`.trim() };
}

export function parseClasses(entries: ClassEntry[], scheduleText: string): Course[] {
  const courses: Course[] = [];

  for (const entry of entries) {
    const course = parseLine(`${entry.name} ${entry.time}`, entry.name.trim() || undefined);
    if (course) courses.push(course);
  }

  for (const line of scheduleText.split(/[\n;]+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const course = parseLine(trimmed);
    if (course) courses.push(course);
  }

  return courses;
}
