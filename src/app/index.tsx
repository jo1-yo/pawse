import * as Haptics from 'expo-haptics';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { CatMascot } from '@/components/CatMascot';
import { DateField } from '@/components/DateField';
import { EventEditor } from '@/components/EventEditor';
import { PlanningOverlay } from '@/components/PlanningOverlay';
import { SchedulePane } from '@/components/SchedulePane';
import { TaskComposer } from '@/components/TaskComposer';
import { C, Card, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { readScheduleImage } from '@/lib/classPhoto';
import { BRAND } from '@/lib/config';
import { durationMinutes } from '@/lib/datetime';
import { buildLocalPlan } from '@/lib/localPlanner';
import { parseClasses } from '@/lib/parseClasses';
import { toast } from '@/lib/toast';
import { usePlanStore } from '@/store/usePlanStore';
import type { PlanEvent } from '@/types/plan';

const WIDE = 820;

/** Outline settings gear: eight rounded teeth around the centre circle. */
const GEAR_PATH =
  'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z';

type EditState = { event: PlanEvent } | null;

export default function PlanScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const router = useRouter();

  const setPlan = usePlanStore((s) => s.setPlan);
  const updatePlanEvent = usePlanStore((s) => s.updatePlanEvent);
  const removePlanEvent = usePlanStore((s) => s.removePlanEvent);
  const onboarded = usePlanStore((s) => s.onboarded);
  const parsingClasses = usePlanStore((s) => s.parsingClasses);
  const planRange = usePlanStore((s) => s.planRange);
  const setPlanRange = usePlanStore((s) => s.setPlanRange);

  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<EditState>(null);

  /**
   * Build — or rebuild — the week. Placement is always the deterministic
   * on-device engine (predictable, PRD v0.2). AI's only job is reading the
   * timetable photo into class rows, which normally happened at attach time;
   * an unread photo (server was down) gets one more chance here.
   *
   * A rebuild keeps blocks already checked off and credits their hours, so
   * pressing this mid-week re-fits what's left instead of erasing progress.
   */
  async function generate() {
    const s = usePlanStore.getState();
    const validTasks = s.tasks.filter((t) => t.title.trim().length > 0);
    if (validTasks.length === 0) {
      toast('Add at least one to-do first 🐱');
      return;
    }
    setGenerating(true);
    const now = new Date();
    try {
      const warnings: string[] = [];
      // One more chance for a photo that never got read (server down at attach
      // time). One already judged unreadable isn't retried — the answer won't
      // change, and the student has been told to swap it.
      if (s.scheduleImageBase64 && s.scheduleImageStatus !== 'read') {
        if (s.scheduleImageStatus !== 'unreadable') await readScheduleImage({ quiet: true });
        if (usePlanStore.getState().scheduleImageStatus !== 'read') {
          warnings.push(
            'Your timetable photo could not be read, so the plan only uses typed classes.',
          );
        }
      }
      const fresh = usePlanStore.getState();
      // Prefer the *current* class list — the plan's snapshot goes stale when
      // classes were added or removed after the last build.
      const parsed = parseClasses(fresh.classEntries, fresh.scheduleText);
      const courses = parsed.length > 0 ? parsed : (fresh.plan?.courses ?? []);

      const keepEvents = fresh.plan?.events.filter((e) => e.done) ?? [];
      const completedHoursByTask: Record<string, number> = {};
      for (const e of keepEvents) {
        if (e.type !== 'study' || !e.taskId) continue;
        completedHoursByTask[e.taskId] =
          (completedHoursByTask[e.taskId] ?? 0) + durationMinutes(e.start, e.end) / 60;
      }

      const next = buildLocalPlan(
        validTasks,
        courses,
        fresh.preferences,
        now,
        fresh.planRange,
        keepEvents.length > 0 ? { completedHoursByTask, busyEvents: keepEvents } : undefined,
      );
      next.warnings = [...next.warnings, ...warnings];
      setPlan(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(keepEvents.length > 0 ? "Re-planned what's left 🐱" : 'Your plan is ready 🐱');
    } finally {
      setGenerating(false);
    }
  }

  function toggleDone(ev: PlanEvent) {
    updatePlanEvent(ev.id, { done: !ev.done });
    void Haptics.selectionAsync();
  }

  function saveEvent(ev: PlanEvent) {
    updatePlanEvent(ev.id, ev);
    setEditing(null);
  }

  function deleteEvent() {
    if (editing) removePlanEvent(editing.event.id);
    setEditing(null);
  }

  if (!onboarded) return <Redirect href={'/onboarding' as Href} />;

  const tasksBox = (
    <Card style={wide ? styles.col : undefined}>
      <TaskComposer onGenerate={generate} generating={generating} />
    </Card>
  );
  const scheduleBox = (
    <Card style={wide ? styles.col : undefined}>
      <SchedulePane onEditEvent={(e) => setEditing({ event: e })} onToggleDone={toggleDone} />
    </Card>
  );

  return (
    <Screen scroll glow center maxWidth={wide ? 1120 : undefined}>
      {/* One header row: brand, the (quiet) planning window, settings. */}
      <View style={styles.header}>
        <CatMascot size={40} />
        <Text variant="subtitle" style={{ fontSize: 22, flex: 1 }}>
          {BRAND.name}
        </Text>
        <View style={styles.window}>
          <DateField value={planRange.start} onChange={(start) => setPlanRange({ start })} />
          <Text variant="caption" color={C.textMuted}>
            →
          </Text>
          <DateField value={planRange.end} onChange={(end) => setPlanRange({ end })} />
        </View>
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={styles.gear}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={3.1} stroke={C.textSecondary} strokeWidth={1.7} />
            <Path
              d={GEAR_PATH}
              stroke={C.textSecondary}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      {wide ? (
        <View style={styles.row}>
          {tasksBox}
          {scheduleBox}
        </View>
      ) : (
        <View style={styles.stack}>
          {tasksBox}
          {scheduleBox}
        </View>
      )}

      <EventEditor
        key={editing?.event.id ?? 'none'}
        event={editing?.event ?? null}
        onSave={saveEvent}
        onDelete={deleteEvent}
        onClose={() => setEditing(null)}
      />

      <PlanningOverlay visible={parsingClasses} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginVertical: Spacing.five,
  },
  gear: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  window: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginEnd: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.five },
  stack: { gap: Spacing.five },
  col: { flex: 1 },
});
