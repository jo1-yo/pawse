import * as Haptics from 'expo-haptics';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { CatMascot } from '@/components/CatMascot';
import { DateField } from '@/components/DateField';
import { EventEditor } from '@/components/EventEditor';
import { SchedulePane } from '@/components/SchedulePane';
import { TaskComposer } from '@/components/TaskComposer';
import { C, Card, Screen, Text } from '@/components/ui';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { generatePlan } from '@/lib/api';
import { BRAND } from '@/lib/config';
import { buildLocalPlan } from '@/lib/localPlanner';
import { toast } from '@/lib/toast';
import { usePlanStore } from '@/store/usePlanStore';
import type { Plan, PlanEvent } from '@/types/plan';

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
  const planRange = usePlanStore((s) => s.planRange);
  const setPlanRange = usePlanStore((s) => s.setPlanRange);

  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<EditState>(null);

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
      let next: Plan;
      let usedAI = true;
      try {
        const classText = [
          s.scheduleText.trim(),
          ...s.classEntries.map((c) => `${c.name} — ${c.time}`),
        ]
          .filter(Boolean)
          .join('\n');
        next = await generatePlan(s.backendUrl, {
          scheduleText: classText || undefined,
          scheduleImageBase64: s.scheduleImageBase64 ?? undefined,
          scheduleImageMime: s.scheduleImageMime ?? undefined,
          tasks: validTasks,
          preferences: s.preferences,
          nowISO: now.toISOString(),
          rangeStart: s.planRange.start,
          rangeEnd: s.planRange.end,
        });
      } catch {
        usedAI = false;
        next = buildLocalPlan(validTasks, s.preferences, now, s.planRange);
        next.warnings = [
          ...next.warnings,
          "Planned on your device. Add Pawse's server in Settings for smarter AI planning.",
        ];
      }
      setPlan(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(usedAI ? 'Your plan is ready 🐱' : 'Plan ready — made on your device 🐱');
    } finally {
      setGenerating(false);
    }
  }

  function openNewBlock(date?: string) {
    const d = date ?? planRange.start;
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
      <SchedulePane onEditEvent={(e) => setEditing({ event: e, isNew: false })} onAddEvent={openNewBlock} />
    </Card>
  );

  return (
    <Screen scroll glow center maxWidth={wide ? 1120 : undefined}>
      <View style={styles.header}>
        <CatMascot size={44} />
        <View style={{ flex: 1 }}>
          <Text variant="subtitle" style={{ fontSize: 22 }}>
            {BRAND.name}
          </Text>
          <Text variant="caption" color={Brand.pink}>
            {BRAND.tagline}
          </Text>
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

      <View style={styles.windowBar}>
        <Text variant="caption" color={C.textMuted}>
          PLANNING WINDOW
        </Text>
        <View style={styles.windowDates}>
          <DateField value={planRange.start} onChange={(start) => setPlanRange({ start })} />
          <Text variant="label" color={C.textMuted}>
            →
          </Text>
          <DateField value={planRange.end} onChange={(end) => setPlanRange({ end })} />
        </View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginVertical: Spacing.five,
  },
  gear: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.backgroundElement,
    borderWidth: 1,
    borderColor: C.border,
  },
  windowBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.five,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.backgroundElement,
  },
  windowDates: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.five },
  stack: { gap: Spacing.five },
  col: { flex: 1 },
});
