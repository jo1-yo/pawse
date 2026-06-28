/**
 * The "Add Tasks" content (inside the Tasks box):
 *  - Add a to-do with a NAME field and a separate DUE date field (so a deadline
 *    is never forgotten). Tap a to-do to fine-tune time/length.
 *  - Add classes: a photo, structured "course name + time" rows, or one box to
 *    paste a whole timetable.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ClassPhotoZone } from '@/components/ClassPhotoZone';
import { DateField } from '@/components/DateField';
import { Button, C, Chip, SectionLabel, Text } from '@/components/ui';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { formatDeadline, localDate } from '@/lib/datetime';
import { taskEmoji } from '@/lib/taskMeta';
import { usePlanStore } from '@/store/usePlanStore';
import type { TaskInput } from '@/types/plan';

const DURATIONS = [0.5, 1, 1.5, 2, 3, 4];
const durLabel = (h: number) => (h < 1 ? `${Math.round(h * 60)}m` : `${h}h`);

function bumpDeadline(iso: string, days: number, minutes: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function TaskComposer({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  const tasks = usePlanStore((s) => s.tasks);
  const addTask = usePlanStore((s) => s.addTask);
  const updateTask = usePlanStore((s) => s.updateTask);
  const removeTask = usePlanStore((s) => s.removeTask);
  const classEntries = usePlanStore((s) => s.classEntries);
  const addClassEntry = usePlanStore((s) => s.addClassEntry);
  const removeClassEntry = usePlanStore((s) => s.removeClassEntry);
  const scheduleText = usePlanStore((s) => s.scheduleText);
  const setScheduleText = usePlanStore((s) => s.setScheduleText);
  const planRange = usePlanStore((s) => s.planRange);

  const [name, setName] = useState('');
  const [due, setDue] = useState(() => planRange.end);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [classTime, setClassTime] = useState('');

  function addTaskRow() {
    const t = name.trim();
    if (!t) return;
    addTask({ title: t, deadline: localDate(due, '17:00').toISOString(), estimatedHours: 2 });
    setName('');
  }

  function addClass() {
    const n = className.trim();
    if (!n) return;
    addClassEntry(n, classTime.trim());
    setClassName('');
    setClassTime('');
  }

  return (
    <View style={styles.pane}>
      <Text variant="subtitle">Your to-dos</Text>

      {/* Add a to-do: name + due, side by side */}
      <View style={styles.addCard}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={addTaskRow}
          returnKeyType="done"
          placeholder="Task name — e.g. CS project"
          placeholderTextColor={C.textMuted}
          style={styles.nameInput}
        />
        <View style={styles.addBottom}>
          <View style={styles.dueWrap}>
            <Text variant="caption" color={C.textMuted}>
              DUE
            </Text>
            <DateField value={due} onChange={setDue} />
          </View>
          <Pressable onPress={addTaskRow} style={styles.addBtn} hitSlop={6}>
            <Text variant="label" color={Brand.bgDark}>
              Add
            </Text>
          </Pressable>
        </View>
      </View>

      {tasks.length > 0 && (
        <View style={styles.list}>
          {tasks.map((task, i) => (
            <View key={task.id}>
              {i > 0 && <View style={styles.divider} />}
              <TaskRow
                task={task}
                expanded={expanded === task.id}
                onToggle={() => setExpanded(expanded === task.id ? null : task.id)}
                onChange={(p) => updateTask(task.id, p)}
                onRemove={() => removeTask(task.id)}
              />
            </View>
          ))}
        </View>
      )}

      {/* Classes */}
      <SectionLabel>Class times · optional</SectionLabel>
      <ClassPhotoZone />

      <Text variant="caption" color={C.textMuted} style={styles.subLabel}>
        Or add classes one by one
      </Text>
      <View style={styles.classRow}>
        <TextInput
          value={className}
          onChangeText={setClassName}
          placeholder="Course (CS 101)"
          placeholderTextColor={C.textMuted}
          style={[styles.classInput, { flex: 1 }]}
        />
        <TextInput
          value={classTime}
          onChangeText={setClassTime}
          placeholder="Mon/Wed 10:00–11:15"
          placeholderTextColor={C.textMuted}
          style={[styles.classInput, { flex: 1.3 }]}
        />
        <Pressable onPress={addClass} style={styles.addBtnSm} hitSlop={6}>
          <Text variant="label" color={C.tint}>
            +
          </Text>
        </Pressable>
      </View>

      {classEntries.length > 0 && (
        <View style={styles.classList}>
          {classEntries.map((c) => (
            <View key={c.id} style={styles.classChip}>
              <Text variant="caption" color={C.text} numberOfLines={1} style={{ flex: 1 }}>
                {c.name}
                {c.time ? `  ·  ${c.time}` : ''}
              </Text>
              <Pressable onPress={() => removeClassEntry(c.id)} hitSlop={8}>
                <Text variant="caption" color={C.textMuted}>
                  ✕
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text variant="caption" color={C.textMuted} style={styles.subLabel}>
        Or paste your whole timetable
      </Text>
      <TextInput
        value={scheduleText}
        onChangeText={setScheduleText}
        placeholder={'Paste it here, e.g.\nMon/Wed 10:00–11:15 CS 101\nTue/Thu 13:00–14:30 Bio Lab'}
        placeholderTextColor={C.textMuted}
        multiline
        style={styles.paste}
      />

      <View style={styles.generate}>
        <Button title="✨  Generate Smart Schedule" onPress={onGenerate} loading={generating} disabled={generating} />
      </View>
    </View>
  );
}

function TaskRow({
  task,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  task: TaskInput;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<TaskInput>) => void;
  onRemove: () => void;
}) {
  const dueLabel = formatDeadline(task.deadline).split(' · ')[1] ?? '';
  return (
    <View>
      <Pressable style={styles.row} onPress={onToggle}>
        <Text style={styles.rowEmoji}>{taskEmoji(task.title)}</Text>
        <View style={{ flex: 1 }}>
          <Text variant="label" color={C.text} numberOfLines={1} style={{ fontSize: 16 }}>
            {task.title || 'Untitled task'}
          </Text>
          <Text variant="caption" color={C.textMuted}>
            Due {dueLabel} · ~{task.estimatedHours}h
          </Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={10} style={styles.remove}>
          <Text variant="label" color={C.textMuted}>
            ✕
          </Text>
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={styles.expand}>
          <View style={styles.chipRow}>
            {DURATIONS.map((h) => (
              <Chip key={h} label={durLabel(h)} selected={task.estimatedHours === h} onPress={() => onChange({ estimatedHours: h })} />
            ))}
          </View>
          <NudgeRow
            label="Due day"
            value={dueLabel.split(' ')[0] ?? ''}
            onMinus={() => onChange({ deadline: bumpDeadline(task.deadline, -1, 0) })}
            onPlus={() => onChange({ deadline: bumpDeadline(task.deadline, 1, 0) })}
          />
          <NudgeRow
            label="Time"
            value={dueLabel.split(' ').slice(1).join(' ')}
            onMinus={() => onChange({ deadline: bumpDeadline(task.deadline, 0, -30) })}
            onPlus={() => onChange({ deadline: bumpDeadline(task.deadline, 0, 30) })}
          />
        </View>
      )}
    </View>
  );
}

function NudgeRow({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.nudgeRow}>
      <Text variant="caption" color={C.textMuted}>
        {label}
      </Text>
      <View style={styles.nudgeControls}>
        <Pressable onPress={onMinus} hitSlop={6} style={styles.nudgeBtn}>
          <Text variant="label" color={C.text}>
            –
          </Text>
        </Pressable>
        <Text variant="caption" color={C.text} style={{ minWidth: 74, textAlign: 'center' }}>
          {value}
        </Text>
        <Pressable onPress={onPlus} hitSlop={6} style={styles.nudgeBtn}>
          <Text variant="label" color={C.text}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pane: { gap: Spacing.four },
  addCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  nameInput: {
    backgroundColor: C.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    color: C.text,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
  },
  addBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dueWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  addBtn: {
    backgroundColor: Brand.pink,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.five,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 0 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  rowEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  remove: { padding: 2 },
  expand: { gap: Spacing.three, paddingBottom: Spacing.three },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nudgeControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  nudgeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLabel: { letterSpacing: 0.4 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  classInput: {
    backgroundColor: C.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    color: C.text,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  addBtnSm: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classList: { gap: Spacing.two },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: C.backgroundSelected,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  paste: {
    minHeight: 64,
    backgroundColor: C.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    color: C.text,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  generate: { marginTop: Spacing.two },
});
