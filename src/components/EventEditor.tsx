/**
 * Manual schedule editor. Opens for a tapped event (or a new block) and lets
 * the student rename it, nudge start/end by 15 minutes, move it across days,
 * change its type, or delete it. All controls are cross-platform (no native
 * date picker needed), so manual tweaks work on web and device alike.
 */

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, C, Chip, Text } from '@/components/ui';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatDateHeading, formatTime, nudgeTime, shiftDate } from '@/lib/datetime';
import type { EventType, PlanEvent } from '@/types/plan';

const TYPES: { value: EventType; label: string }[] = [
  { value: 'study', label: 'Focus' },
  { value: 'class', label: 'Class' },
  { value: 'break', label: 'Break' },
  { value: 'deadline', label: 'Due' },
  { value: 'other', label: 'Other' },
];

export function EventEditor({
  event,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  event: PlanEvent | null;
  isNew: boolean;
  onSave: (event: PlanEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  // The parent passes a fresh `key` per event, so this mounts with the right
  // draft and we never need to sync via an effect.
  const [draft, setDraft] = useState<PlanEvent | null>(event);

  if (!draft) return null;
  const patch = (p: Partial<PlanEvent>) => setDraft({ ...draft, ...p });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.card}>
          <Text variant="subtitle" style={{ marginBottom: Spacing.four }}>
            {isNew ? 'Add a block' : 'Edit block'}
          </Text>

          <TextInput
            value={draft.title}
            onChangeText={(t) => patch({ title: t })}
            placeholder="What is it?"
            placeholderTextColor={C.textMuted}
            style={styles.title}
          />

          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                selected={draft.type === t.value}
                onPress={() => patch({ type: t.value })}
              />
            ))}
          </View>

          <NudgeRow
            label="Day"
            value={formatDateHeading(draft.date)}
            onMinus={() => patch({ date: shiftDate(draft.date, -1) })}
            onPlus={() => patch({ date: shiftDate(draft.date, 1) })}
          />
          <NudgeRow
            label="Start"
            value={formatTime(draft.start)}
            onMinus={() => patch({ start: nudgeTime(draft.start, -15) })}
            onPlus={() => patch({ start: nudgeTime(draft.start, 15) })}
          />
          <NudgeRow
            label="End"
            value={formatTime(draft.end)}
            onMinus={() => patch({ end: nudgeTime(draft.end, -15) })}
            onPlus={() => patch({ end: nudgeTime(draft.end, 15) })}
          />

          <View style={styles.actions}>
            <Button title={isNew ? 'Add to schedule' : 'Save'} onPress={() => onSave(draft)} />
            {!isNew && (
              <Pressable onPress={onDelete} style={styles.delete} hitSlop={8}>
                <Text variant="label" color={Brand.deadline}>
                  Delete block
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NudgeRow({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.nudgeRow}>
      <Text variant="label" color={C.textSecondary}>
        {label}
      </Text>
      <View style={styles.nudgeControls}>
        <Pressable onPress={onMinus} hitSlop={6} style={styles.nudgeBtn}>
          <Text variant="subtitle" color={C.text}>
            –
          </Text>
        </Pressable>
        <Text variant="label" style={styles.nudgeValue}>
          {value}
        </Text>
        <Pressable onPress={onPlus} hitSlop={6} style={styles.nudgeBtn}>
          <Text variant="subtitle" color={C.text}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.five },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.backgroundElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.five,
    ...Shadow.card,
  },
  title: {
    color: C.text,
    fontFamily: 'DMSans_700Bold',
    fontSize: 19,
    backgroundColor: C.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.four,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.four },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  nudgeControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  nudgeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeValue: { minWidth: 96, textAlign: 'center' },
  actions: { marginTop: Spacing.five, gap: Spacing.three, alignItems: 'center' },
  delete: { paddingVertical: Spacing.two },
});
