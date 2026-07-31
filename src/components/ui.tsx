/**
 * Pawse UI kit — dark-first, soft-pink primitives built on the design tokens
 * in `constants/theme.ts`. Everything here uses DM Sans.
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  View,
  type ViewProps,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ACTIVE_SCHEME, Colors, Fonts, Glass, INK, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';

/** Minimal, Apple-like, black-and-white — following the system's light/dark. */
export const C = Colors[ACTIVE_SCHEME];

type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption';

const TEXT_STYLES: Record<
  TextVariant,
  { fontSize: number; lineHeight: number; fontFamily: string; letterSpacing?: number }
> = {
  display: { fontSize: 42, lineHeight: 46, fontFamily: Fonts.bold, letterSpacing: -1 },
  title: { fontSize: 27, lineHeight: 33, fontFamily: Fonts.bold, letterSpacing: -0.5 },
  subtitle: { fontSize: 19, lineHeight: 25, fontFamily: Fonts.semibold, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontFamily: Fonts.regular },
  label: { fontSize: 14, lineHeight: 19, fontFamily: Fonts.semibold },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.medium },
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

export function Text({ variant = 'body', color, center, style, ...rest }: TextProps) {
  return (
    <RNText
      style={[TEXT_STYLES[variant], { color: color ?? C.text }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  glow = false,
  center = false,
  maxWidth = MaxContentWidth,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  glow?: boolean;
  center?: boolean;
  maxWidth?: number;
  contentStyle?: ViewProps['style'];
}) {
  const inner = (
    <View style={[styles.screenInner, center && styles.centerV, contentStyle]}>
      <View style={[styles.screenMax, { maxWidth }]}>{children}</View>
    </View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {glow && (
        <LinearGradient
          pointerEvents="none"
          colors={[`rgba(${INK},0.03)`, `rgba(${INK},0)`, `rgba(${INK},0)`]}
          style={styles.glow}
        />
      )}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, center && styles.centerV]}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Card({
  style,
  children,
  elevated,
  ...rest
}: ViewProps & { children: ReactNode; elevated?: boolean }) {
  return (
    <View style={[styles.card, elevated && styles.cardElevated, style]} {...rest}>
      {children}
    </View>
  );
}

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  left?: ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  fullWidth = true,
  left,
  ...rest
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const inactive = disabled || loading;

  const content = (
    <View style={styles.btnRow}>
      {loading ? (
        <ActivityIndicator color={C.text} />
      ) : (
        <>
          {left}
          <Text variant="label" style={styles.btnLabel} color={C.text}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      style={({ pressed }) => [
        styles.btnBase,
        styles.btnFill,
        fullWidth && styles.stretch,
        isPrimary ? styles.btnPrimary : isGhost ? styles.btnGhost : styles.btnSecondary,
        isPrimary && styles.primaryShadow,
        inactive && styles.dim,
        pressed && !inactive && styles.pressed,
      ]}
      {...rest}
    >
      {content}
    </Pressable>
  );
}

/** Selectable pill for quick options (durations, etc.). */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipOn : styles.chipOff,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text variant="caption" color={selected ? C.text : C.textSecondary} style={selected && styles.chipOnText}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Pill({
  label,
  selected,
  tint = C.tint,
  onPress,
}: {
  label: string;
  selected?: boolean;
  tint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected ? { backgroundColor: tint, borderColor: tint } : { borderColor: C.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text variant="caption" color={selected ? C.onTint : C.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text variant="caption" color={C.textMuted} style={styles.sectionLabel}>
      {String(children).toUpperCase()}
    </Text>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  screenInner: { flex: 1, paddingHorizontal: Spacing.five, width: '100%', alignItems: 'center' },
  screenMax: { width: '100%', maxWidth: MaxContentWidth },
  scrollContent: { flexGrow: 1, paddingBottom: Spacing.seven },
  centerV: { justifyContent: 'center' },
  card: {
    ...Glass,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.five,
    ...Shadow.card,
  },
  cardElevated: { backgroundColor: C.backgroundElevated },
  btnBase: { borderRadius: Radius.lg, minHeight: 50, justifyContent: 'center' },
  btnFill: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stretch: { alignSelf: 'stretch' },
  primaryShadow: { ...Shadow.card },
  // Frosted glass with a neutral grey tint (Apple "material") so the buttons
  // read clearly on a white page instead of vanishing. Primary is a touch
  // denser + carries a soft lift so it still reads as the main action.
  btnPrimary: { ...Glass, backgroundColor: 'rgba(118, 118, 128, 0.24)', borderWidth: 1, borderColor: `rgba(${INK}, 0.16)` },
  btnSecondary: { ...Glass, backgroundColor: 'rgba(118, 118, 128, 0.14)', borderWidth: 1, borderColor: C.border },
  btnGhost: { backgroundColor: 'transparent', minHeight: 44 },
  dim: { opacity: 0.4 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  btnLabel: { fontSize: 16, fontFamily: Fonts.semibold },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 1,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipOn: { backgroundColor: `rgba(${INK}, 0.08)`, borderColor: `rgba(${INK}, 0.30)` },
  chipOff: { backgroundColor: 'transparent', borderColor: C.border },
  chipOnText: { fontFamily: Fonts.bold },
  pill: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  sectionLabel: { letterSpacing: 1.4, marginBottom: Spacing.three },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: Spacing.four },
});
