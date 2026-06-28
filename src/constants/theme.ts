/**
 * Pawse design system — "Study smarter. Stress less."
 *
 * Dark-first, soft-pink palette mirrored from the web demo
 * (imjane.top/Pawse_demo). Warm near-black surfaces, one confident pink
 * accent, generous spacing, soft glows. A light palette is kept as a
 * graceful fallback for users who force light mode.
 */

import { Platform } from 'react-native';

/** Raw brand palette — accents that should NOT flip with the theme. */
export const Brand = {
  bgDark: '#0c0b10', // warm near-black
  bgCard: '#171520',
  bgCardElevated: '#201d2b',
  pink: '#f5a0b8',
  pinkSoft: '#ffd1dc',
  pinkDeep: '#e87fa0',
  pinkGlow: 'rgba(245, 160, 184, 0.30)',
  grayCat: '#9a9aa8',
  hairline: 'rgba(255, 255, 255, 0.07)',
  hairlineStrong: 'rgba(255, 255, 255, 0.14)',
  overlay: 'rgba(255, 255, 255, 0.05)',
  // Semantic event accents (consistent across themes)
  classBlock: '#8ab4ff', // fixed class — calm blue
  studyBlock: '#f5a0b8', // focused study — brand pink
  breakBlock: '#5fd6a6', // break / rest — mint
  deadline: '#ff8aa0', // deadline marker — warm red-pink
  warning: '#ffc861',
} as const;

export const Colors = {
  light: {
    text: '#1a1a22',
    textSecondary: 'rgba(26, 26, 34, 0.62)',
    textMuted: 'rgba(26, 26, 34, 0.42)',
    background: '#fdf7f9',
    backgroundElement: '#ffffff',
    backgroundElevated: '#fbeef2',
    backgroundSelected: '#fbdfe7',
    tint: Brand.pinkDeep,
    border: 'rgba(26, 26, 34, 0.10)',
    onTint: '#ffffff',
  },
  dark: {
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.64)',
    textMuted: 'rgba(255, 255, 255, 0.42)',
    background: Brand.bgDark,
    backgroundElement: Brand.bgCard,
    backgroundElevated: Brand.bgCardElevated,
    backgroundSelected: 'rgba(255, 255, 255, 0.09)',
    tint: Brand.pink,
    border: Brand.hairline,
    onTint: Brand.bgDark,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Font families. DM Sans (loaded via @expo-google-fonts/dm-sans in the
 * root layout) is the display + body face, matching the demo.
 */
export const Fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) as string,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

/** Reusable elevation presets — subtle and premium (not glowy). */
export const Shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pinkGlow: {
    shadowColor: Brand.pinkDeep,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 88, android: 72 }) ?? 72;
export const MaxContentWidth = 720;

/** Color used for the dedicated "Pawse" OS calendar + event accents. */
export const EVENT_COLORS: Record<string, string> = {
  class: Brand.classBlock,
  study: Brand.studyBlock,
  break: Brand.breakBlock,
  deadline: Brand.deadline,
  other: Brand.grayCat,
};
