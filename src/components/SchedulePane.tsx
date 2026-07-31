/**
 * The "Schedule" content (inside the Schedule box). The plan spans a rolling
 * window, but the student acts on it Today-first: a Today / Week / Month
 * switcher keeps the month as the horizon and the day as the unit of action.
 * Up top, the feasibility banner tells them — honestly — whether it all fits.
 * Tap a block to edit, check a block off to drive the rolling re-plan.
 */

import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DayTimeline } from '@/components/DayTimeline';
import { FeasibilityBanner } from '@/components/FeasibilityBanner';
import { MonthCalendar } from '@/components/MonthCalendar';
import { Button, C, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { addPlanToAppleCalendar, CalendarPermissionError } from '@/lib/calendar';
import { analyzeFeasibility } from '@/lib/feasibility';
import { addPlanToGoogleCalendar, GoogleAuthError } from '@/lib/googleCalendar';
import { exportPlanAsIcs, GOOGLE_CALENDAR_IMPORT_URL } from '@/lib/ics';
import { getSamplePlan } from '@/lib/samplePlan';
import { toast } from '@/lib/toast';
import { usePlanStore } from '@/store/usePlanStore';
import type { CalendarProvider, PlanEvent } from '@/types/plan';

export function SchedulePane({
  onEditEvent,
  onAddEvent,
  onToggleDone,
  onReplan,
  replanning,
}: {
  onEditEvent: (event: PlanEvent) => void;
  onAddEvent: (date?: string) => void;
  onToggleDone: (event: PlanEvent) => void;
  onReplan: () => void;
  replanning: boolean;
}) {
  const plan = usePlanStore((s) => s.plan);
  const tasks = usePlanStore((s) => s.tasks);
  const setPlan = usePlanStore((s) => s.setPlan);
  const provider = usePlanStore((s) => s.calendarProvider);
  const setCalendarProvider = usePlanStore((s) => s.setCalendarProvider);
  const google = useGoogleCalendar();
  const [busy, setBusy] = useState<CalendarProvider | null>(null);
  /** A day opened from the month grid — the Apple-style day timeline. */
  const [dayDetail, setDayDetail] = useState<string | null>(null);

  // Show only real, actionable blocks (study/class/deadline) — the "Recharge"
  // breaks are just visual spacing and clutter the agenda. Their time is still
  // reserved by the planner, so study blocks stay spaced; we just don't list
  // them. (Export already skips breaks in ics.ts / calendar.ts.)
  const events = useMemo(() => (plan?.events ?? []).filter((e) => e.type !== 'break'), [plan]);
  const hasEvents = events.length > 0;

  const feasibility = useMemo(
    () => (hasEvents ? analyzeFeasibility(tasks, events, new Date()) : null),
    [tasks, events, hasEvents],
  );

  const hasDone = useMemo(() => events.some((e) => e.done), [events]);

  /**
   * One-tap export to the chosen calendar. Apple on device writes straight
   * into EventKit; everything else rides the .ics path (share sheet on
   * device, a real file download on web — plus Google's import page so the
   * downloaded file has somewhere to land).
   */
  async function exportTo(target: CalendarProvider) {
    if (!plan) return;
    setCalendarProvider(target); // remember as the one-tap default
    setBusy(target);
    try {
      if (target === 'apple' && Platform.OS !== 'web') {
        const n = await addPlanToAppleCalendar(plan);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast(`Added ${n} events to your Pawse calendar 🐱`);
      } else if (target === 'google' && google.configured) {
        // Direct write via the Calendar API — no download, works on web too.
        let token = await google.ensureToken();
        if (!token) {
          toast('Google sign-in was cancelled.');
          return;
        }
        let n: number;
        try {
          n = await addPlanToGoogleCalendar(plan, token);
        } catch (err) {
          if (!(err instanceof GoogleAuthError)) throw err;
          // Stored token went stale — reconnect once, then retry.
          google.disconnect();
          token = await google.connect();
          if (!token) {
            toast('Google sign-in was cancelled.');
            return;
          }
          n = await addPlanToGoogleCalendar(plan, token);
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast(`Added ${n} events to Google Calendar 🐱`);
      } else {
        const ok = await exportPlanAsIcs(plan);
        if (!ok) {
          toast('Sharing isn’t available on this device.');
          return;
        }
        if (Platform.OS === 'web') {
          if (target === 'google') {
            window.open(GOOGLE_CALENDAR_IMPORT_URL, '_blank', 'noopener');
            toast('Schedule downloaded — import pawse-schedule.ics on the Google Calendar page 🐱');
          } else {
            toast('Schedule downloaded — open pawse-schedule.ics to add it to Apple Calendar 🐱');
          }
        }
      }
    } catch (err) {
      if (err instanceof CalendarPermissionError) {
        Alert.alert('Calendar access needed', 'Turn on calendar access for Pawse in iOS Settings — or use Export.');
      } else {
        toast(`Couldn't export: ${(err as Error).message}`);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.pane}>
      {/* One clean header: title + add. The schedule is month-only, Apple-
          Calendar style — tap a day to drop into its timeline. */}
      <View style={styles.head}>
        <Text variant="subtitle" style={{ flexGrow: 1 }}>
          Schedule
        </Text>
        <Pressable onPress={() => onAddEvent()} style={styles.addBtn} hitSlop={8} accessibilityLabel="Add a block">
          <Text variant="label" color={C.textSecondary}>
            +
          </Text>
        </Pressable>
      </View>

      {feasibility && <FeasibilityBanner feasibility={feasibility} />}

      {dayDetail ? (
        <DayTimeline
          date={dayDetail}
          events={events}
          onSelectDate={setDayDetail}
          onBack={() => setDayDetail(null)}
          onEventPress={onEditEvent}
          onAddEvent={onAddEvent}
        />
      ) : (
        <MonthCalendar events={events} onDayPress={setDayDetail} onEventPress={onEditEvent} />
      )}

      {!hasEvents && (
        <Pressable onPress={() => setPlan(getSamplePlan())} hitSlop={8} style={styles.sample}>
          <Text variant="label" color={C.tint}>
            See a sample week
          </Text>
        </Pressable>
      )}

      {hasEvents && (
        <View style={styles.actions}>
          {hasDone && (
            <View style={styles.action}>
              <Button
                title="Re-plan"
                variant="secondary"
                onPress={onReplan}
                loading={replanning}
                disabled={replanning}
              />
            </View>
          )}
          {/* One-tap export — the calendar connected at onboarding leads;
              picking the other one switches the default. */}
          <View style={[styles.action, styles.actionWide]}>
            <Button
              title="Apple Calendar"
              variant={provider === 'apple' ? 'primary' : 'secondary'}
              onPress={() => exportTo('apple')}
              loading={busy === 'apple'}
              disabled={busy !== null}
            />
          </View>
          <View style={[styles.action, styles.actionWide]}>
            <Button
              title="Google Calendar"
              variant={provider === 'google' ? 'primary' : 'secondary'}
              onPress={() => exportTo('google')}
              loading={busy === 'google'}
              disabled={busy !== null}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pane: { gap: Spacing.four },
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.backgroundSelected,
  },
  sample: { alignItems: 'center', paddingVertical: Spacing.two },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  action: { flexGrow: 1, flexBasis: 120 },
  actionWide: { flexBasis: 200 },
});
