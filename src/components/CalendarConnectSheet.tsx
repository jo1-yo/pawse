/**
 * Onboarding "connect your calendar" popup. One question, three honest
 * choices: Apple Calendar (native asks for EventKit access right away, so
 * later exports are one tap), Google Calendar, or skip. The choice powers the
 * one-tap export buttons under the schedule and can be changed there anytime.
 */

import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, C, Text } from '@/components/ui';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { requestAppleCalendarAccess } from '@/lib/calendar';
import type { CalendarProvider } from '@/types/plan';

export function CalendarConnectSheet({
  visible,
  onChoose,
  onSkip,
}: {
  visible: boolean;
  onChoose: (provider: CalendarProvider) => void;
  onSkip: () => void;
}) {
  const google = useGoogleCalendar();

  function choose(provider: CalendarProvider) {
    // Fire the connect at the moment the student says yes — the button press is
    // the user gesture OAuth/EventKit need — so export later never stalls on it.
    // (Both are safe no-ops when unavailable: web has no EventKit; Google is a
    // no-op until its OAuth client IDs are set in app.json.)
    if (provider === 'apple' && Platform.OS !== 'web') void requestAppleCalendarAccess();
    if (provider === 'google') void google.connect();
    onChoose(provider);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <Pressable style={styles.backdrop} onPress={onSkip} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.card}>
          <Text variant="subtitle">Put your plan on your calendar?</Text>
          <Text variant="body" color={C.textSecondary} style={styles.copy}>
            Pick where your schedule should live and every plan can land there in one tap. You can
            change this anytime.
          </Text>

          <View style={styles.actions}>
            <Button title="Apple Calendar" onPress={() => choose('apple')} />
            <Button title="Google Calendar" variant="secondary" onPress={() => choose('google')} />
            <Pressable onPress={onSkip} hitSlop={8} style={styles.skip}>
              <Text variant="label" color={C.textMuted}>
                Maybe later
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.five },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.backgroundElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.five,
    ...Shadow.card,
  },
  copy: { marginTop: Spacing.two },
  actions: { marginTop: Spacing.five, gap: Spacing.three, alignItems: 'stretch' },
  skip: { alignSelf: 'center', paddingVertical: Spacing.two },
});
