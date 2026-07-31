/**
 * Onboarding "your rhythm" step. A couple of concise questions — morning
 * person or night owl (with the exact wake/sleep times behind it) and how many
 * hours you're up for working on a weekend day — so every plan is built inside
 * the hours the student is actually awake, and doesn't overload their weekends.
 *
 * Feeds preferences.wakeTime / sleepTime / weekendStudyHours, which the planner
 * respects (study never lands before wake, after sleep, or over the weekend cap).
 *
 * Note: the planner treats sleep as the latest same-day minute, so it must be
 * after wake — we keep "wind down" at/under 23:59 rather than past midnight.
 */

import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { TimeField } from '@/components/TimeField';
import { Button, C, Chip, Text } from '@/components/ui';
import { Radius, Shadow, Spacing } from '@/constants/theme';

const PRESETS = [
  { key: 'early', label: '🌅  Early bird', wake: '06:30', sleep: '22:00' },
  { key: 'night', label: '🌙  Night owl', wake: '09:30', sleep: '23:30' },
];

const WEEKEND_HOURS = [0, 1, 2, 3, 4, 6];

export function RhythmSheet({
  visible,
  initialWake,
  initialSleep,
  initialWeekendHours,
  onDone,
}: {
  visible: boolean;
  initialWake: string;
  initialSleep: string;
  initialWeekendHours: number;
  onDone: (wake: string, sleep: string, weekendHours: number) => void;
}) {
  const [wake, setWake] = useState(initialWake);
  const [sleep, setSleep] = useState(initialSleep);
  const [weekendHours, setWeekendHours] = useState(initialWeekendHours);
  const activePreset = PRESETS.find((p) => p.wake === wake && p.sleep === sleep)?.key ?? null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onDone(wake, sleep, weekendHours)}
    >
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.card}>
          <Text variant="subtitle">When are you usually up?</Text>
          <Text variant="body" color={C.textSecondary} style={styles.copy}>
            Pawse builds your plan inside your waking hours, so it fits your rhythm — not a generic
            9-to-5.
          </Text>

          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                selected={activePreset === p.key}
                onPress={() => {
                  setWake(p.wake);
                  setSleep(p.sleep);
                }}
              />
            ))}
          </View>

          <View style={styles.fieldRow}>
            <Text variant="label" color={C.textSecondary}>
              I wake up
            </Text>
            <TimeField value={wake} onChange={setWake} />
          </View>
          <View style={styles.fieldRow}>
            <Text variant="label" color={C.textSecondary}>
              Wind down by
            </Text>
            <TimeField value={sleep} onChange={setSleep} />
          </View>

          <View style={styles.divider} />

          <Text variant="label">How many hours will you work on a weekend day?</Text>
          <View style={styles.presets}>
            {WEEKEND_HOURS.map((h) => (
              <Chip
                key={h}
                label={h === 0 ? 'None' : `${h}h`}
                selected={weekendHours === h}
                onPress={() => setWeekendHours(h)}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Button title="Continue" onPress={() => onDone(wake, sleep, weekendHours)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.five, backgroundColor: 'rgba(0,0,0,0.35)' },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.backgroundElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.five,
    gap: Spacing.four,
    ...Shadow.card,
  },
  copy: { marginTop: -Spacing.two },
  presets: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  actions: { marginTop: Spacing.two },
});
