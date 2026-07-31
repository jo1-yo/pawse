/**
 * A simple time-ordered agenda for the Today / This Week execution views.
 * Each block shows its time + title with a colored type accent. Study blocks
 * carry a one-tap "done" check that drives the rolling re-plan; tapping the
 * body opens the editor. Deliberately calm and sparse.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Brand, EVENT_COLORS, Radius, Spacing } from '@/constants/theme';
import { formatDateHeading, formatTime, groupByDate } from '@/lib/datetime';
import type { PlanEvent } from '@/types/plan';

export function AgendaList({
  events,
  todayStr,
  showDayHeadings,
  emptyText,
  onToggleDone,
  onEventPress,
}: {
  events: PlanEvent[];
  todayStr: string;
  showDayHeadings: boolean;
  emptyText: string;
  onToggleDone: (event: PlanEvent) => void;
  onEventPress: (event: PlanEvent) => void;
}) {
  const groups = groupByDate(events);

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="body" color={C.textMuted} center>
          {emptyText}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {groups.map((group) => (
        <View key={group.date} style={styles.group}>
          {showDayHeadings && (
            <Text variant="caption" color={C.textMuted} style={styles.dayHeading}>
              {group.date === todayStr ? 'TODAY' : formatDateHeading(group.date).toUpperCase()}
            </Text>
          )}
          {group.events.map((ev) => (
            <Row key={ev.id} event={ev} onToggleDone={onToggleDone} onPress={onEventPress} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Row({
  event,
  onToggleDone,
  onPress,
}: {
  event: PlanEvent;
  onToggleDone: (event: PlanEvent) => void;
  onPress: (event: PlanEvent) => void;
}) {
  const accent = EVENT_COLORS[event.type] ?? Brand.grayCat;
  const checkable = event.type === 'study' || event.type === 'break';
  const done = !!event.done;

  return (
    <View style={styles.row}>
      {checkable ? (
        <Pressable onPress={() => onToggleDone(event)} hitSlop={10} style={styles.check}>
          <View style={[styles.checkBox, { borderColor: accent }, done && { backgroundColor: accent }]}>
            {done && (
              <Text variant="caption" color={C.onTint} style={styles.checkMark}>
                ✓
              </Text>
            )}
          </View>
        </Pressable>
      ) : (
        <View style={[styles.tick, { backgroundColor: accent }]} />
      )}

      <Pressable style={styles.body} onPress={() => onPress(event)}>
        <Text
          variant="label"
          color={done ? C.textMuted : C.text}
          numberOfLines={1}
          style={done && styles.struck}
        >
          {event.title}
        </Text>
        <Text variant="caption" color={C.textMuted}>
          {formatTime(event.start)} – {formatTime(event.end)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.four },
  group: { gap: Spacing.two },
  dayHeading: { letterSpacing: 1.2, marginBottom: Spacing.one },
  empty: { paddingVertical: Spacing.six, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  check: { padding: 2 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 13, lineHeight: 16, fontFamily: 'DMSans_700Bold' },
  tick: { width: 4, height: 32, borderRadius: 2 },
  body: { flex: 1, gap: 1 },
  struck: { textDecorationLine: 'line-through' },
});
