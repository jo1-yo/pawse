import * as Haptics from 'expo-haptics';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { CatMascot } from '@/components/CatMascot';
import { DateField } from '@/components/DateField';
import { EventEditor } from '@/components/EventEditor';
import { PlanningOverlay } from '@/components/PlanningOverlay';
import { SchedulePane } from '@/components/SchedulePane';
import { TaskComposer } from '@/components/TaskComposer';
import { C, Card, Screen, Text } from '@/components/ui';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { readScheduleImage } from '@/lib/classPhoto';
import { BRAND } from '@/lib/config';
import { durationMinutes, isoDate } from '@/lib/datetime';
import { buildLocalPlan } from '@/lib/localPlanner';
import { parseClasses } from '@/lib/parseClasses';
import { toast } from '@/lib/toast';
import { usePlanStore } from '@/store/usePlanStore';
import type { PlanEvent } from '@/types/plan';

const uid = () => 'm' + Math.random().toString(36).slice(2, 9);
const WIDE = 820;

type EditState = { event: PlanEvent; isNew: boolean } | null;

export default function PlanScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const router = useRouter();

  const setPlan = usePlanStore((s) => s.setPlan);
  const addPlanEvent = usePlanStore((s) => s.addPlanEvent);
  const updatePlanEvent = usePlanStore((s) => s.updatePlanEvent);
  const removePlanEvent = usePlanStore((s) => s.removePlanEvent);
  const onboarded = usePlanStore((s) => s.onboarded);
  const parsingClasses = usePlanStore((s) => s.parsingClasses);
  const planRange = usePlanStore((s) => s.planRange);
  const setPlanRange = usePlanStore((s) => s.setPlanRange);

  const [generating, setGenerating] = useState(false);
  const [replanning, setReplanning] = useState(false);
  const [editing, setEditing] = useState<EditState>(null);

  /**
   * Placement is always the deterministic on-device engine (predictable,
   * PRD v0.2). AI's only job is reading the timetable photo into class rows,
   * which normally happened at attach time; an unread photo (server was down)
   * gets one more chance here.
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
      if (s.scheduleImageBase64 && !s.scheduleImageRead) {
        const added = await readScheduleImage({ quiet: true });
        if (added === 0 && !usePlanStore.getState().scheduleImageRead) {
          warnings.push(
            'Your timetable photo could not be read, so the plan only uses typed classes.',
          );
        }
      }
      const fresh = usePlanStore.getState();
      const courses = parseClasses(fresh.classEntries, fresh.scheduleText);
      const next = buildLocalPlan(validTasks, courses, fresh.preferences, now, fresh.planRange);
      next.warnings = [...next.warnings, ...warnings];
      setPlan(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('Your plan is ready 🐱');
    } finally {
      setGenerating(false);
    }
  }

  /** Rolling re-plan: keep done blocks put, re-fit everything that's left. */
  function replan() {
    const s = usePlanStore.getState();
    if (!s.plan) return;
    setReplanning(true);
    try {
      const now = new Date();
      const keepEvents = s.plan.events.filter((e) => e.done);
      const completedHoursByTask: Record<string, number> = {};
      for (const e of keepEvents) {
        if (e.type !== 'study' || !e.taskId) continue;
        completedHoursByTask[e.taskId] =
          (completedHoursByTask[e.taskId] ?? 0) + durationMinutes(e.start, e.end) / 60;
      }
      const validTasks = s.tasks.filter((t) => t.title.trim().length > 0);
      // Prefer the *current* class list — the plan's snapshot goes stale when
      // classes were added/removed after generating.
      const parsed = parseClasses(s.classEntries, s.scheduleText);
      const courses = parsed.length > 0 ? parsed : s.plan.courses;
      const next = buildLocalPlan(validTasks, courses, s.preferences, now, s.planRange, {
        completedHoursByTask,
        busyEvents: keepEvents,
      });
      setPlan(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast("Re-planned what's left 🐱");
    } finally {
      setReplanning(false);
    }
  }

  function toggleDone(ev: PlanEvent) {
    updatePlanEvent(ev.id, { done: !ev.done });
    void Haptics.selectionAsync();
  }

  function openNewBlock(date?: string) {
    const d = date ?? isoDate(new Date());
    setEditing({
      event: { id: uid(), title: 'Focus block', type: 'study', date: d, start: '18:00', end: '19:00' },
      isNew: true,
    });
  }

  function saveEvent(ev: PlanEvent) {
    if (editing?.isNew) addPlanEvent(ev);
    else updatePlanEvent(ev.id, ev);
    setEditing(null);
  }

  function deleteEvent() {
    if (editing && !editing.isNew) removePlanEvent(editing.event.id);
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
      <SchedulePane
        onEditEvent={(e) => setEditing({ event: e, isNew: false })}
        onAddEvent={openNewBlock}
        onToggleDone={toggleDone}
        onReplan={replan}
        replanning={replanning}
      />
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
            <Line x1={4} y1={8} x2={20} y2={8} stroke={C.textSecondary} strokeWidth={1.8} strokeLinecap="round" />
            <Line x1={4} y1={16} x2={20} y2={16} stroke={C.textSecondary} strokeWidth={1.8} strokeLinecap="round" />
            <Circle cx={9} cy={8} r={2.6} fill={Brand.bgDark} stroke={C.textSecondary} strokeWidth={1.8} />
            <Circle cx={15} cy={16} r={2.6} fill={Brand.bgDark} stroke={C.textSecondary} strokeWidth={1.8} />
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
        isNew={editing?.isNew ?? false}
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
