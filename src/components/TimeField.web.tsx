import { C, Text } from '@/components/ui';
import { formatTime } from '@/lib/datetime';

// Web preview fallback — show the time as static text (native picker unavailable).
export function TimeField({ value }: { value: string; onChange: (v: string) => void }) {
  return (
    <Text variant="label" color={C.tint}>
      {formatTime(value)}
    </Text>
  );
}
