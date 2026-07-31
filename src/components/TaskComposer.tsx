/**
 * The "Add Tasks" content (inside the Tasks box):
 *  - Add a to-do with a NAME field and a separate DUE date field (so a deadline
 *    is never forgotten). Tap a to-do to fine-tune time/length.
 *  - Add classes: a photo, or one box to paste/type the timetable.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ClassPhotoZone } from '@/components/ClassPhotoZone';
import { DateField } from '@/components/DateField';
import { TimeField } from '@/components/TimeField';
import { Button, C, Chip, Text } from '@/components/ui';
import { Glass, INK, Radius, Spacing } from '@/constants/theme';
import { formatDay, formatTime, isoDate, localDate, shiftDate } from '@/lib/datetime';
import { usePlanStore } from '@/store/usePlanStore';
import type { TaskInput } from '@/types/plan';

const DURATIONS = [0.5, 1, 1.5, 2, 3, 4];
const durLabel = (h: number) => (h < 1 ? `${Math.round(h * 60)}m` : `${h}h`);
const pad2 = (n: number) => String(n).padStart(2, '0');

export function TaskComposer({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  const tasks = usePlanStore((s) => s.tasks);
  const addTask = usePlanStore((s) => s.addTask);
  const updateTask = usePlanStore((s) => s.updateTask);
  const removeTask = usePlanStore((s) => s.removeTask);
  const classEntries = usePlanStore((s) => s.classEntries);
  const removeClassEntry = usePlanStore((s) => s.removeClassEntry);
  const scheduleText = usePlanStore((s) => s.scheduleText);
  const setScheduleText = usePlanStore((s) => s.setScheduleText);
  const hasPlan = usePlanStore((s) => !!s.plan);

  const [name, setName] = useState('');
  // Default a new to-do to a week out — sensible within a month-long window.
  const [due, setDue] = useState(() => shiftDate(isoDate(new Date()), 7));
  const [dueTime, setDueTime] = useState('17:00');
  const [estHours, setEstHours] = useState(2);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showClasses, setShowClasses] = useState(false);

  function addTaskRow() {
    const t = name.trim();
    if (!t) return;
    addTask({ title: t, deadline: localDate(due, dueTime).toISOString(), estimatedHours: estHours });
    setName('');
    // Keep the length/due choices — handy when adding several similar to-dos.
  }

  return (
    <View style={styles.pane}>
      <Text variant="subtitle">To-dos</Text>

      {/* Add a to-do: set it all up front — name, how long it'll take, and when
          it's due (day + time together) — before tapping Add. */}
      <View style={styles.addForm}>
        <View style={styles.addRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={addTaskRow}
            returnKeyType="done"
            placeholder="Add a to-do — e.g. CS project"
            placeholderTextColor={C.textMuted}
            style={styles.nameInput}
          />
          <Pressable onPress={addTaskRow} style={styles.addBtn} hitSlop={6}>
            <Text variant="label" color={C.text}>
              Add
            </Text>
          </Pressable>
        </View>

        <DurationLabel />
        <View style={styles.chipRow}>
          {DURATIONS.map((h) => (
            <Chip
              key={h}
              label={durLabel(h)}
              selected={estHours === h}
              onPress={() => setEstHours(h)}
            />
          ))}
        </View>

        <View style={styles.fieldRow}>
          <Text variant="caption" color={C.textMuted}>
            Due
          </Text>
          <View style={styles.dueControls}>
            <DateField value={due} onChange={setDue} />
            <TimeField value={dueTime} onChange={setDueTime} />
          </View>
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

      {/* Classes — collapsed by default so the screen stays calm */}
      <Pressable style={styles.classHeader} onPress={() => setShowClasses((v) => !v)} hitSlop={6}>
        <Text variant="label" color={C.textSecondary}>
          Classes{classEntries.length > 0 ? ` · ${classEntries.length}` : ''}
        </Text>
        <Text variant="subtitle" color={C.textMuted}>
          {showClasses ? '–' : '+'}
        </Text>
      </Pressable>

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

      {showClasses && (
        <View style={styles.classBody}>
          <ClassPhotoZone />

          <Text variant="caption" color={C.textMuted} style={styles.subLabel}>
            Or type your classes, one per line
          </Text>
          <TextInput
            value={scheduleText}
            onChangeText={setScheduleText}
            placeholder={'Paste it here, e.g.\nMon/Wed 10:00–11:15 CS 101\nTue/Thu 13:00–14:30 Bio Lab'}
            placeholderTextColor={C.textMuted}
            multiline
            style={styles.paste}
          />
        </View>
      )}

      <View style={styles.generate}>
        <Button
          title={hasPlan ? 'Update my schedule' : 'Generate my schedule'}
          onPress={onGenerate}
          loading={generating}
          disabled={generating}
        />
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
  // Split the stored deadline into the date + time the fields edit directly.
  const deadline = new Date(task.deadline);
  const dueDate = isoDate(deadline); // "YYYY-MM-DD"
  const dueTime = `${pad2(deadline.getHours())}:${pad2(deadline.getMinutes())}`; // "HH:mm"
  // Show the concrete date ("Jul 26"), not just a weekday — "Sun" alone is
  // ambiguous (which Sunday?) and hides whether a due date is already past.
  const dayLabel = formatDay(dueDate);
  const timeLabel = formatTime(dueTime);
  return (
    <View>
      <Pressable style={styles.row} onPress={onToggle}>
        <Text variant="label" color={C.text} numberOfLines={1} style={{ fontSize: 16, flex: 1 }}>
          {task.title || 'Untitled task'}
        </Text>
        <Text variant="caption" color={C.textMuted}>
          {dayLabel}, {timeLabel} · {task.estimatedHours}h
        </Text>
        <Pressable onPress={onRemove} hitSlop={10} style={styles.remove}>
          <Text variant="label" color={C.textMuted}>
            ✕
          </Text>
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={styles.expand}>
          <DurationLabel />
          <View style={styles.chipRow}>
            {DURATIONS.map((h) => (
              <Chip key={h} label={durLabel(h)} selected={task.estimatedHours === h} onPress={() => onChange({ estimatedHours: h })} />
            ))}
          </View>
          <View style={styles.fieldRow}>
            <Text variant="caption" color={C.textMuted}>
              Due day
            </Text>
            <DateField
              value={dueDate}
              onChange={(d) => onChange({ deadline: localDate(d, dueTime).toISOString() })}
            />
          </View>
          <View style={styles.fieldRow}>
            <Text variant="caption" color={C.textMuted}>
              Time
            </Text>
            <TimeField
              value={dueTime}
              onChange={(t) => onChange({ deadline: localDate(dueDate, t).toISOString() })}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/** Label + hint for the duration chips: it's the *effort* the task needs. */
function DurationLabel() {
  return (
    <View>
      <Text variant="caption" color={C.textSecondary}>
        How much time will this take?
      </Text>
      <Text variant="caption" color={C.textMuted} style={styles.hint}>
        Time to study for the exam or finish the assignment.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: 1, opacity: 0.85 },
  pane: { gap: Spacing.four },
  addForm: { gap: Spacing.three },
  addRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  dueControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  nameInput: {
    flexGrow: 1,
    flexBasis: 200,
    backgroundColor: C.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    color: C.text,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  addBtn: {
    ...Glass,
    backgroundColor: 'rgba(118, 118, 128, 0.20)',
    borderWidth: 1,
    borderColor: `rgba(${INK}, 0.14)`,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.four,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 0 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three + 2 },
  remove: { padding: 2 },
  expand: { gap: Spacing.three, paddingBottom: Spacing.three },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  classBody: { gap: Spacing.four },
  subLabel: { letterSpacing: 0.4 },
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
