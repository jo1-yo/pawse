import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable } from 'react-native';

import { C, Text } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { formatTime } from '@/lib/datetime';

const pad = (n: number) => String(n).padStart(2, '0');

export function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [h, m] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(h ?? 8, m ?? 0, 0, 0);
  const apply = (d?: Date) => d && onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={date}
        mode="time"
        display="compact"
        themeVariant="dark"
        accentColor={Brand.pink}
        onChange={(_e, d) => apply(d)}
      />
    );
  }

  return (
    <Pressable
      onPress={() => DateTimePickerAndroid.open({ value: date, mode: 'time', onChange: (_e, d) => apply(d) })}
    >
      <Text variant="label" color={C.tint}>
        {formatTime(value)}
      </Text>
    </Pressable>
  );
}
