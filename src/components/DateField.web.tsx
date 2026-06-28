import { Pressable, StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { formatDay, shiftDate } from '@/lib/datetime';

/** Web date field: nudge by day with –/+ (no native picker on web). */
export function DateField({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => onChange(shiftDate(value, -1))} hitSlop={6} style={styles.btn}>
        <Text variant="label" color={C.text}>
          –
        </Text>
      </Pressable>
      <Text variant="label" color={C.tint} style={styles.value}>
        {formatDay(value)}
      </Text>
      <Pressable onPress={() => onChange(shiftDate(value, 1))} hitSlop={6} style={styles.btn}>
        <Text variant="label" color={C.text}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  btn: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 64, textAlign: 'center' },
});
