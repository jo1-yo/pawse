/**
 * Apple-Calendar-style month grid for the planning window. Weekday header +
 * week rows spanning the range; days outside the range are faded; today is
 * marked; events show as small colored pills. Tap a day to add, a pill to edit.
 * Empty before generation = a clean empty calendar.
 */

import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Brand, EVENT_COLORS, Radius, Spacing } from '@/constants/theme';
import { isoDate, localDate, shiftDate } from '@/lib/datetime';
import type { PlanEvent } from '@/types/plan';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function weekdayOf(dateStr: string): number {
  return localDate(dateStr, '12:00').getDay();
}

export function MonthCalendar({
  rangeStart,
  rangeEnd,
  events,
  onDayPress,
  onEventPress,
}: {
  rangeStart: string;
  rangeEnd: string;
  events: PlanEvent[];
  onDayPress: (date: string) => void;
  onEventPress: (event: PlanEvent) => void;
}) {
  const today = isoDate(new Date());

  const weeks = useMemo(() => {
    const gridStart = shiftDate(rangeStart, -weekdayOf(rangeStart));
    const gridEnd = shiftDate(rangeEnd, 6 - weekdayOf(rangeEnd));
    const all: string[] = [];
    let cur = gridStart;
    for (let i = 0; i < 48; i++) {
      all.push(cur);
      if (cur >= gridEnd) break;
      cur = shiftDate(cur, 1);
    }
    const chunked: string[][] = [];
    for (let i = 0; i < all.length; i += 7) chunked.push(all.slice(i, i + 7));
    return chunked;
  }, [rangeStart, rangeEnd]);

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
            {week.map((date) => {
              const inRange = date >= rangeStart && date <= rangeEnd;
              const isToday = date === today;
              const dayNum = Number(date.slice(8, 10));
              const evs = byDate.get(date) ?? [];
              return (
                <Pressable
                  key={date}
                  style={styles.cell}
                  disabled={!inRange}
                  onPress={() => onDayPress(date)}
                >
                  <View style={[styles.dateWrap, isToday && styles.todayWrap]}>
                    <Text
                      variant="caption"
                      color={isToday ? Brand.bgDark : inRange ? C.text : C.textMuted}
                      style={isToday ? styles.todayNum : undefined}
                    >
                      {dayNum}
                    </Text>
                  </View>
                  {evs.slice(0, 3).map((ev) => (
                    <Pressable
                      key={ev.id}
                      onPress={() => onEventPress(ev)}
                      style={[styles.pill, { backgroundColor: (EVENT_COLORS[ev.type] ?? Brand.grayCat) + '33' }]}
                    >
                      <Text variant="caption" numberOfLines={1} color={EVENT_COLORS[ev.type] ?? Brand.grayCat} style={styles.pillText}>
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
  headerRow: { flexDirection: 'row', paddingBottom: Spacing.two },
  headerCell: { flex: 1, textAlign: 'center' },
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
    minHeight: 76,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 4,
    gap: 2,
  },
  dateWrap: { alignSelf: 'flex-start', minWidth: 20, alignItems: 'center', paddingHorizontal: 2 },
  todayWrap: { backgroundColor: Brand.pink, borderRadius: Radius.pill, paddingHorizontal: 5, paddingVertical: 1 },
  todayNum: { fontFamily: 'DMSans_700Bold' },
  pill: { borderRadius: Radius.xs, paddingHorizontal: 4, paddingVertical: 2 },
  pillText: { fontSize: 10, lineHeight: 13 },
  more: { fontSize: 10, marginLeft: 4 },
});
