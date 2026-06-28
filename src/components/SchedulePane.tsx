/**
 * The "Schedule" content (inside the Schedule box). Shows an Apple-style
 * calendar grid for the chosen planning window — empty before the student
 * generates, filled after. Tap a day to add a block, a pill to edit it.
 */

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { MonthCalendar } from '@/components/MonthCalendar';
import { Button, C, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { addPlanToAppleCalendar, CalendarPermissionError } from '@/lib/calendar';
import { formatRange } from '@/lib/datetime';
import { exportPlanAsIcs } from '@/lib/ics';
import { getSamplePlan } from '@/lib/samplePlan';
import { toast } from '@/lib/toast';
import { usePlanStore } from '@/store/usePlanStore';
import type { PlanEvent } from '@/types/plan';

export function SchedulePane({
  onEditEvent,
  onAddEvent,
}: {
  onEditEvent: (event: PlanEvent) => void;
  onAddEvent: (date?: string) => void;
}) {
  const plan = usePlanStore((s) => s.plan);
  const planRange = usePlanStore((s) => s.planRange);
  const setPlan = usePlanStore((s) => s.setPlan);
  const [busy, setBusy] = useState<null | 'apple' | 'ics'>(null);

  const events = plan?.events ?? [];
  const hasEvents = events.length > 0;

  async function addToApple() {
    if (!plan) return;
    setBusy('apple');
    try {
      const n = await addPlanToAppleCalendar(plan);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(`Added ${n} events to your Pawse calendar 🐱`);
    } catch (err) {
      if (err instanceof CalendarPermissionError) {
        Alert.alert('Calendar access needed', 'Turn on calendar access for Pawse in iOS Settings — or use Export.');
      } else {
        toast(`Couldn't add events: ${(err as Error).message}`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function exportIcs() {
    if (!plan) return;
    setBusy('ics');
    try {
      const ok = await exportPlanAsIcs(plan);
      if (!ok) toast('Sharing isn’t available on this device.');
    } catch (err) {
      toast(`Export failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.pane}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">Your schedule</Text>
          <Text variant="caption" color={C.textMuted} style={{ marginTop: 2 }}>
            {formatRange(planRange.start, planRange.end)} · {hasEvents ? 'tap a block to edit' : 'tap a day to add, or Generate'}
          </Text>
        </View>
        <Pressable onPress={() => onAddEvent()} style={styles.addBtn} hitSlop={6}>
          <Text variant="label" color={C.tint}>
            + Block
          </Text>
        </Pressable>
      </View>

      {plan && plan.warnings.length > 0 && (
        <View style={styles.warn}>
          {plan.warnings.map((w, i) => (
            <Text key={i} variant="caption" color={C.textSecondary} style={{ marginBottom: 3 }}>
              • {w}
            </Text>
          ))}
        </View>
      )}

      <MonthCalendar
        rangeStart={planRange.start}
        rangeEnd={planRange.end}
        events={events}
        onDayPress={(date) => onAddEvent(date)}
        onEventPress={onEditEvent}
      />

      {!hasEvents && (
        <Pressable onPress={() => setPlan(getSamplePlan())} hitSlop={8} style={styles.sample}>
          <Text variant="label" color={C.tint}>
            See a sample week
          </Text>
        </Pressable>
      )}

      {hasEvents && (
        <View style={styles.actions}>
          {Platform.OS !== 'web' && (
            <Button title="Add to Apple Calendar" onPress={addToApple} loading={busy === 'apple'} disabled={busy !== null} />
          )}
          <Button
            title="Export / share (.ics)"
            variant={Platform.OS === 'web' ? 'primary' : 'secondary'}
            onPress={exportIcs}
            loading={busy === 'ics'}
            disabled={busy !== null}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pane: { gap: Spacing.four },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  addBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  warn: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 97, 0.35)',
    backgroundColor: 'rgba(255, 200, 97, 0.08)',
  },
  sample: { alignItems: 'center', paddingVertical: Spacing.two },
  actions: { gap: Spacing.three, marginTop: Spacing.two },
});
