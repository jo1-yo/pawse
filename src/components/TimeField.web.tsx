import { C } from '@/components/ui';

/**
 * Web time field: a real `<input type="time">` — the student can type a time
 * or open the browser's clock picker, instead of nudging in 30-min steps.
 * value/onChange use "HH:mm" (24h), matching the native picker in TimeField.tsx.
 */
export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      style={webFieldStyle}
    />
  );
}

const webFieldStyle = {
  fontFamily: 'DMSans_600SemiBold, system-ui, sans-serif',
  fontSize: 15,
  color: C.text,
  background: C.background,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '7px 12px',
  colorScheme: 'dark',
  outline: 'none',
  cursor: 'pointer',
};
