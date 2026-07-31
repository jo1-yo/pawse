/**
 * Welcome screen — one screen, zero questions, one hero: Pawse herself, big
 * and tappable (every tap feeds her — see InteractiveCat). Copy stays to two
 * short lines; the single CTA opens the planner with sensible defaults (the
 * old quiz lives in Settings, and the planner's empty state offers a sample
 * week).
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { CalendarConnectSheet } from '@/components/CalendarConnectSheet';
import { InteractiveCat } from '@/components/InteractiveCat';
import { RhythmSheet } from '@/components/RhythmSheet';
import { Button, C, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usePlanStore } from '@/store/usePlanStore';
import type { CalendarProvider } from '@/types/plan';

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const catSize = Math.min(230, Math.max(150, width * 0.5));
  const router = useRouter();
  const setOnboarded = usePlanStore((s) => s.setOnboarded);
  const setCalendarProvider = usePlanStore((s) => s.setCalendarProvider);
  const preferences = usePlanStore((s) => s.preferences);
  const setPreferences = usePlanStore((s) => s.setPreferences);
  const [showRhythm, setShowRhythm] = useState(false);
  const [showConnect, setShowConnect] = useState(false);

  function saveRhythm(wake: string, sleep: string, weekendHours: number) {
    setPreferences({ wakeTime: wake, sleepTime: sleep, weekendStudyHours: weekendHours });
    setShowRhythm(false);
    setShowConnect(true);
  }

  function enterPlanner(provider: CalendarProvider | null) {
    setCalendarProvider(provider);
    setOnboarded(true);
    router.replace('/');
  }

  return (
    <Screen scroll glow center maxWidth={480}>
      <View style={styles.stack}>
        <InteractiveCat size={catSize} />

        <View style={styles.copy}>
          <Text variant="title" center>
            Your week, planned in seconds
          </Text>
          <Text variant="body" color={C.textSecondary} center style={styles.sub}>
            Add what&apos;s due. Pawse fits it around your classes.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Plan my week" onPress={() => setShowRhythm(true)} />
          <Text variant="caption" color={C.textMuted} center style={styles.fine}>
            No sign-up. Everything stays on your device.
          </Text>
        </View>
      </View>

      <RhythmSheet
        visible={showRhythm}
        initialWake={preferences.wakeTime}
        initialSleep={preferences.sleepTime}
        initialWeekendHours={preferences.weekendStudyHours ?? 3}
        onDone={saveRhythm}
      />

      <CalendarConnectSheet
        visible={showConnect}
        onChoose={(provider) => enterPlanner(provider)}
        onSkip={() => enterPlanner(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { alignItems: 'center', gap: Spacing.six },
  copy: { gap: Spacing.three },
  sub: { maxWidth: 380, alignSelf: 'center' },
  actions: { width: '100%', maxWidth: 360, gap: Spacing.three },
  fine: { marginTop: Spacing.one },
});
