import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable } from 'react-native';

import { C, Text } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { formatDay, isoDate, localDate } from '@/lib/datetime';

/** Pick a calendar date; value/onChange use "YYYY-MM-DD". */
export function DateField({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const d = localDate(value, '12:00');

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={d}
        mode="date"
        display="compact"
        themeVariant="dark"
        accentColor={Brand.pink}
        onChange={(_e, sel) => sel && onChange(isoDate(sel))}
      />
    );
  }

  return (
    <Pressable
      onPress={() => DateTimePickerAndroid.open({ value: d, mode: 'date', onChange: (_e, sel) => sel && onChange(isoDate(sel)) })}
    >
      <Text variant="label" color={C.tint}>
        {formatDay(value)}
      </Text>
    </Pressable>
  );
}
