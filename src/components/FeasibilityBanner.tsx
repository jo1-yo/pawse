/**
 * The "Can you make it?" banner — Pawse's headline relief feature. Shows the
 * honest verdict (on track / tight / won't fit) with one concrete fix, in a
 * calm color-coded card. Kept deliberately minimal: one line of truth, one
 * line of what to do.
 */

import { StyleSheet, View } from 'react-native';

import { C, Text } from '@/components/ui';
import { Brand, Radius, Spacing } from '@/constants/theme';
import type { Feasibility } from '@/types/plan';

const ACCENT: Record<Feasibility['verdict'], string> = {
  'on-track': Brand.breakBlock,
  tight: Brand.warning,
  'wont-fit': Brand.deadline,
};

export function FeasibilityBanner({ feasibility }: { feasibility: Feasibility }) {
  const accent = ACCENT[feasibility.verdict];
  return (
    <View style={[styles.banner, { borderColor: accent + '55', backgroundColor: accent + '14' }]}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <View style={{ flex: 1 }}>
        <Text variant="label" color={accent} style={styles.headline}>
          {feasibility.headline}
        </Text>
        <Text variant="caption" color={C.textSecondary} style={styles.detail}>
          {feasibility.detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  headline: { fontSize: 14 },
  detail: { marginTop: 2, lineHeight: 16 },
});
