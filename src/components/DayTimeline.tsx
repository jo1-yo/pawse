/**
 * Apple-Calendar-style day view. Opened by tapping a day in the month grid:
 * a paged week strip (tap a date to jump), the "Tuesday, July 14" heading,
 * and a scrollable 24-hour timeline — hour labels down a left gutter,
 * hairline hour rules, events as rounded tinted blocks with a colored edge,
 * side-by-side columns when they overlap, and a red "now" line on today.
 * Tap a block to edit it.
 */

import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Brand, EVENT_COLORS, Fonts, Radius, Spacing } from '@/constants/theme';
import { formatTime, isoDate } from '@/lib/datetime';
import type { PlanEvent } from '@/types/plan';

const HOUR_H = 56;
const GUTTER = 58;
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** Apple Calendar's "now" red — kept literal so the line reads as iOS. */
const NOW_RED = '#ff453a';

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Hour label, Apple-style: "8 AM", "Noon", "11 PM". */
function hourLabel(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return 'Noon';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

type Placed = { event: PlanEvent; top: number; height: number; col: number; cols: number };

/**
 * Assign overlapping events to side-by-side columns (Apple splits the width
 * evenly across each cluster of mutually-overlapping blocks).
 */
function layoutDay(events: PlanEvent[]): Placed[] {
  const sorted = [...events].sort(
    (a, b) => toMin(a.start) - toMin(b.start) || toMin(b.end) - toMin(a.end),
  );
  const out: Placed[] = [];
  let cluster: { event: PlanEvent; col: number; s: number; e: number }[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const cols = Math.max(...cluster.map((p) => p.col)) + 1;
    for (const p of cluster) {
      out.push({
        event: p.event,
        top: (p.s / 60) * HOUR_H,
        height: Math.max(24, ((p.e - p.s) / 60) * HOUR_H),
        col: p.col,
        cols,
      });
    }
    cluster = [];
  };

  for (const event of sorted) {
    const s = toMin(event.start);
    const e = Math.max(toMin(event.end), s + 15);
    if (cluster.length > 0 && s >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const active = cluster.filter((p) => p.e > s);
    let col = 0;
    while (active.some((p) => p.col === col)) col += 1;
    cluster.push({ event, col, s, e });
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return out;
}

export function DayTimeline({
  date,
  events,
  onSelectDate,
  onBack,
  onEventPress,
  onAddEvent,
}: {
  date: string;
  events: PlanEvent[];
  onSelectDate: (date: string) => void;
  onBack: () => void;
  onEventPress: (event: PlanEvent) => void;
  onAddEvent: (date: string) => void;
}) {
  const today = isoDate(new Date());
  const selected = dayjs(date);
  const scrollRef = useRef<ScrollView>(null);
  const [bodyWidth, setBodyWidth] = useState(0);
  // Re-render each minute so the red "now" line keeps moving on today.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const week = useMemo(() => {
    const sunday = selected.subtract(selected.day(), 'day');
    return Array.from({ length: 7 }, (_, i) => sunday.add(i, 'day'));
  }, [selected]);

  const datesWithEvents = useMemo(() => new Set(events.map((e) => e.date)), [events]);
  const dayEvents = useMemo(() => events.filter((e) => e.date === date), [events, date]);
  const placed = useMemo(() => layoutDay(dayEvents), [dayEvents]);

  // Land the scroll where the day starts: just above the first block (8 AM
  // when the day is empty), like opening Apple Calendar mid-day.
  useEffect(() => {
    const firstTop = placed.length > 0 ? Math.min(...placed.map((p) => p.top)) : 8 * HOUR_H;
    const id = requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ y: Math.max(0, firstTop - 48), animated: false }),
    );
    return () => cancelAnimationFrame(id);
  }, [date, placed]);

  const isToday = date === today;
  const now = new Date();
  const nowY = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H;

  return (
    <View style={styles.wrap}>
      {/* ‹ month backlink + add, mirroring Apple's day-view nav bar */}
      <View style={styles.nav}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <Text variant="label" color={C.tint}>
            ‹ {selected.format('MMMM')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onAddEvent(date)}
          hitSlop={10}
          style={styles.addBtn}
          accessibilityLabel="Add a block on this day"
        >
          <Text variant="label" color={C.textSecondary}>
            +
          </Text>
        </Pressable>
      </View>

      {/* Week strip: ‹ › page by week, tap a date to jump to it */}
      <View style={styles.strip}>
        <Pressable onPress={() => onSelectDate(isoDate(selected.subtract(7, 'day').toDate()))} hitSlop={10} style={styles.weekNav}>
          <Text variant="subtitle" color={C.textSecondary}>
            ‹
          </Text>
        </Pressable>
        {week.map((d) => {
          const dISO = isoDate(d.toDate());
          const on = dISO === date;
          const isTodayCell = dISO === today;
          return (
            <Pressable key={dISO} onPress={() => onSelectDate(dISO)} style={styles.stripCell}>
              <Text variant="caption" color={on ? C.text : C.textMuted} style={styles.stripLetter}>
                {DAY_LETTERS[d.day()]}
              </Text>
              <View style={[styles.stripNum, on && styles.stripNumOn]}>
                <Text
                  variant="label"
                  color={on ? C.onTint : isTodayCell ? C.tint : C.text}
                  style={on && styles.stripNumOnText}
                >
                  {d.date()}
                </Text>
              </View>
              <View
                style={[
                  styles.stripDot,
                  { backgroundColor: datesWithEvents.has(dISO) && !on ? C.textMuted : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
        <Pressable onPress={() => onSelectDate(isoDate(selected.add(7, 'day').toDate()))} hitSlop={10} style={styles.weekNav}>
          <Text variant="subtitle" color={C.textSecondary}>
            ›
          </Text>
        </Pressable>
      </View>

      {/* "Tuesday, July 14" — tinted on today, like Apple's red heading */}
      <Text variant="label" color={isToday ? C.tint : C.textSecondary} style={styles.heading}>
        {selected.format('dddd, MMMM D')}
        {isToday ? ' · Today' : ''}
      </Text>

      <ScrollView
        ref={scrollRef}
        style={styles.timeline}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{ height: 24 * HOUR_H + Spacing.five }}
          onLayout={(e) => setBodyWidth(e.nativeEvent.layout.width)}
        >
          {/* Hour rules + gutter labels */}
          {Array.from({ length: 24 }, (_, h) => (
            <View key={h} style={[styles.hourRow, { top: h * HOUR_H }]} pointerEvents="none">
              <Text variant="caption" color={C.textMuted} style={styles.hourLabel}>
                {h === 0 ? '' : hourLabel(h)}
              </Text>
              <View style={styles.hourLine} />
            </View>
          ))}

          {/* Event blocks */}
          {bodyWidth > 0 &&
            placed.map(({ event, top, height, col, cols }) => {
              const accent = EVENT_COLORS[event.type] ?? Brand.grayCat;
              const usable = bodyWidth - GUTTER - Spacing.two;
              const w = usable / cols;
              const done = !!event.done;
              return (
                <Pressable
                  key={event.id}
                  onPress={() => onEventPress(event)}
                  style={[
                    styles.block,
                    {
                      top,
                      height,
                      left: GUTTER + col * w,
                      width: w - 3,
                      backgroundColor: accent + '2e',
                      borderLeftColor: accent,
                    },
                    done && styles.blockDone,
                  ]}
                >
                  <Text variant="caption" color={accent} numberOfLines={1} style={[styles.blockTitle, done && styles.struck]}>
                    {event.title}
                  </Text>
                  {height >= 38 && (
                    <Text variant="caption" color={accent} numberOfLines={1} style={styles.blockTime}>
                      {formatTime(event.start)} – {formatTime(event.end)}
                    </Text>
                  )}
                </Pressable>
              );
            })}

          {/* Apple's red current-time indicator */}
          {isToday && (
            <View style={[styles.nowRow, { top: nowY }]} pointerEvents="none">
              <Text variant="caption" color={NOW_RED} style={styles.nowLabel}>
                {formatTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)}
              </Text>
              <View style={styles.nowDot} />
              <View style={styles.nowLine} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { paddingVertical: Spacing.one },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.backgroundSelected,
  },
  strip: { flexDirection: 'row', alignItems: 'center' },
  weekNav: { width: 24, alignItems: 'center', justifyContent: 'center' },
  stripCell: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: Spacing.one },
  stripLetter: { fontSize: 10, letterSpacing: 0.5 },
  stripNum: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripNumOn: { backgroundColor: Brand.pink },
  stripNumOnText: { fontFamily: Fonts.bold },
  stripDot: { width: 4, height: 4, borderRadius: 2 },
  heading: { marginTop: Spacing.one },
  timeline: {
    height: 480,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  hourLabel: { width: GUTTER - 8, textAlign: 'right', fontSize: 11, marginTop: -6 },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 8 },
  block: {
    position: 'absolute',
    borderRadius: Radius.xs,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  blockDone: { opacity: 0.45 },
  blockTitle: { fontFamily: Fonts.semibold, fontSize: 12 },
  blockTime: { fontSize: 10, opacity: 0.75 },
  struck: { textDecorationLine: 'line-through' },
  nowRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  nowLabel: {
    width: GUTTER - 8,
    textAlign: 'right',
    fontSize: 10,
    fontFamily: Fonts.bold,
    marginTop: -1,
  },
  nowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: NOW_RED,
    marginLeft: 4,
    marginRight: -2,
  },
  nowLine: { flex: 1, height: 1.5, backgroundColor: NOW_RED },
});
