/**
 * A full-month calendar grid, Apple-Calendar style: a month title with ‹ ›
 * navigation, a single-letter weekday header, and a 6-week grid where days
 * from adjacent months are faded and today wears a filled accent circle.
 * Events render as thin colored bars; overflow collapses to "+N". Tap a day
 * to open its day timeline, a bar to edit it.
 */

import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Brand, EVENT_COLORS, Radius, Spacing } from '@/constants/theme';
import { isoDate } from '@/lib/datetime';
import type { PlanEvent } from '@/types/plan';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthCalendar({
  events,
  onDayPress,
  onEventPress,
}: {
  events: PlanEvent[];
  onDayPress: (date: string) => void;
  onEventPress: (event: PlanEvent) => void;
}) {
  const today = isoDate(new Date());
  const [anchor, setAnchor] = useState(() => dayjs(today).startOf('month'));

  const monthIndex = anchor.month();
  const isCurrentMonth = anchor.isSame(dayjs(today), 'month');

  // 6 weeks (42 cells) starting on the Sunday on/before the 1st.
  const cells = useMemo(() => {
    const gridStart = anchor.startOf('month').subtract(anchor.startOf('month').day(), 'day');
    return Array.from({ length: 42 }, (_, i) => gridStart.add(i, 'day'));
  }, [anchor]);

  const weeks = useMemo(() => {
    const out: dayjs.Dayjs[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cells]);

  const byDate = useMemo(() => {
    const map = new Map<string, PlanEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, [events]);

  return (
    <View>
      <View style={styles.monthBar}>
        <Pressable onPress={() => setAnchor(anchor.subtract(1, 'month'))} hitSlop={10} style={styles.navBtn}>
          <Text variant="subtitle" color={C.textSecondary}>
            ‹
          </Text>
        </Pressable>
        <Text variant="label" style={styles.monthTitle}>
          {anchor.format('MMMM YYYY')}
        </Text>
        <View style={styles.navRight}>
          {!isCurrentMonth && (
            <Pressable
              onPress={() => setAnchor(dayjs(today).startOf('month'))}
              hitSlop={8}
              style={styles.todayBtn}
            >
              <Text variant="caption" color={C.tint}>
                Today
              </Text>
            </Pressable>
          )}
          <Pressable onPress={() => setAnchor(anchor.add(1, 'month'))} hitSlop={10} style={styles.navBtn}>
            <Text variant="subtitle" color={C.textSecondary}>
              ›
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.headerRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} variant="caption" color={C.textMuted} style={styles.headerCell}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((day) => {
              const date = isoDate(day.toDate());
              const inMonth = day.month() === monthIndex;
              const isToday = date === today;
              const evs = byDate.get(date) ?? [];
              return (
                <Pressable key={date} style={styles.cell} onPress={() => onDayPress(date)}>
                  <View style={[styles.dateWrap, isToday && styles.todayWrap]}>
                    <Text
                      variant="caption"
                      color={isToday ? C.onTint : inMonth ? C.text : C.textMuted}
                      style={isToday ? styles.todayNum : undefined}
                    >
                      {day.date()}
                    </Text>
                  </View>
                  {evs.slice(0, 3).map((ev) => (
                    <Pressable
                      key={ev.id}
                      onPress={() => onEventPress(ev)}
                      style={[styles.bar, { backgroundColor: (EVENT_COLORS[ev.type] ?? Brand.grayCat) + '2e' }]}
                    >
                      <Text
                        variant="caption"
                        numberOfLines={1}
                        color={EVENT_COLORS[ev.type] ?? Brand.grayCat}
                        style={styles.barText}
                      >
                        {ev.title}
                      </Text>
                    </Pressable>
                  ))}
                  {evs.length > 3 && (
                    <Text variant="caption" color={C.textMuted} style={styles.more}>
                      +{evs.length - 3}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  monthTitle: { fontSize: 16 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  navBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  todayBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerRow: { flexDirection: 'row', paddingBottom: Spacing.two },
  headerCell: { flex: 1, textAlign: 'center', letterSpacing: 0.5 },
  grid: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  week: { flexDirection: 'row' },
  cell: {
    flex: 1,
    minHeight: 92,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 4,
    gap: 2,
  },
  dateWrap: { alignSelf: 'flex-start', minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  todayWrap: { backgroundColor: Brand.pink, borderRadius: Radius.pill },
  todayNum: { fontFamily: 'DMSans_700Bold' },
  bar: { borderRadius: Radius.xs, paddingHorizontal: 4, paddingVertical: 2 },
  barText: { fontSize: 10, lineHeight: 13 },
  more: { fontSize: 10, marginLeft: 4 },
});
