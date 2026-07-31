// Browser stand-in for expo-localization, covering what datetime.ts uses.
export function getCalendars(): { timeZone: string | null }[] {
  return [{ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null }];
}
