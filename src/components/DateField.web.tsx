import { C } from '@/components/ui';

/**
 * Web date field: a real `<input type="date">` — the student can type
 * month/day or open the browser's native date picker, instead of tapping
 * –/+ one day at a time. value/onChange use "YYYY-MM-DD" (exactly what the
 * input reads and emits). Native uses the OS picker in DateField.tsx.
 *
 * `lang` is pinned to en-US so the browser's own locale can't render the field
 * (or its picker) in another language next to Pawse's English copy.
 */
export function DateField({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  return (
    <input
      type="date"
      lang="en-US"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      style={webFieldStyle}
    />
  );
}

/** Shared dark-theme styling for the web date/time inputs. */
export const webFieldStyle = {
  fontFamily: 'DMSans_600SemiBold, system-ui, sans-serif',
  // Two of these plus an arrow have to fit one phone-width row (the planning
  // window in the header), so the box stays tight.
  fontSize: 13,
  color: C.text,
  background: C.background,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '7px 6px',
  colorScheme: 'dark',
  outline: 'none',
  cursor: 'pointer',
};
