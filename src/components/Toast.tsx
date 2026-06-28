import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, Text } from '@/components/ui';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { _setToastListener } from '@/lib/toast';

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    _setToastListener((msg) => {
      setMessage(msg);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() =>
          setMessage(null),
        );
      }, 2600);
    });
    return () => _setToastListener(null);
  }, [opacity]);

  if (!message) return null;

  return (
    <SafeAreaView pointerEvents="none" style={styles.host} edges={['top']}>
      <Animated.View style={[styles.toast, { opacity }]}>
        <Text variant="label" color={C.text} center>
          {message}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  toast: {
    marginTop: Spacing.three,
    maxWidth: 360,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: C.backgroundElevated,
    borderWidth: 1,
    borderColor: C.border,
    ...Shadow.card,
  },
});
