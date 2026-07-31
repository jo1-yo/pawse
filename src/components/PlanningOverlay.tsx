/**
 * A brief "Pawse is planning" overlay with an animated progress bar, shown
 * while a timetable photo is being read (the one multi-second wait). It gives
 * the student something to watch, then vanishes on its own — the schedule
 * underneath has already refreshed, so they see the latest result directly.
 */

import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Glass, INK, Radius, Shadow, Spacing } from '@/constants/theme';

export function PlanningOverlay({
  visible,
  label = 'Reading your timetable…',
}: {
  visible: boolean;
  label?: string;
}) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    progress.setValue(0.06);
    // Ease toward "almost done" over a few seconds; it disappears the moment
    // the real work finishes, so it never stalls at 100%.
    const anim = Animated.timing(progress, {
      toValue: 0.92,
      duration: 8000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [visible, progress]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.center}>
        <View style={styles.card}>
          <Text variant="subtitle" center>
            Pawse is planning 🐱
          </Text>
          <Text variant="caption" color={C.textSecondary} center style={styles.label}>
            {label}
          </Text>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width }]} />
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
    maxWidth: 340,
    ...Glass,
    backgroundColor: C.backgroundElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.five,
    gap: Spacing.two,
    ...Shadow.card,
  },
  label: { marginBottom: Spacing.two },
  track: {
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: `rgba(${INK}, 0.10)`,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: C.text },
});
