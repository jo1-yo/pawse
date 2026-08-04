import { webFieldStyle } from '@/components/DateField.web';

/**
 * Web time field: a real `<input type="time">` — the student can type a time
 * or open the browser's clock picker, instead of nudging in 30-min steps.
 * value/onChange use "HH:mm" (24h), matching the native picker in TimeField.tsx.
 *
 * `lang` is pinned to en-US: the browser otherwise formats the field in its own
 * locale, which puts 上午/下午 next to Pawse's English labels.
 */
export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      lang="en-US"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      style={webFieldStyle}
    />
  );
}
