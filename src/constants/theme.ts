/**
 * Pawse design system — "Study smarter. Stress less."
 *
 * Dark-first, soft-pink palette mirrored from the web demo
 * (imjane.top/Pawse_demo). Warm near-black surfaces, one confident pink
 * accent, generous spacing, soft glows. A light palette is kept as a
 * graceful fallback for users who force light mode.
 */

import { Appearance, Platform } from 'react-native';

/**
 * Active colour scheme, read once at load from the OS. RN bakes StyleSheet
 * colours at module init, so the app renders in the system's light/dark on
 * launch; changing the system theme takes effect on the next reload. (The
 * website inherits this; the extension flips live via a CSS media query.)
 */
export const ACTIVE_SCHEME: 'light' | 'dark' =
  Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

/** RGB triplet for "ink" — black in light mode, white in dark — for tint fills
 *  and hairlines: use as `rgba(${INK}, 0.06)`. */
export const INK = ACTIVE_SCHEME === 'dark' ? '255, 255, 255' : '0, 0, 0';

/**
 * Raw brand palette. Reworked to a clean black-and-white, Apple-like scheme:
 * near-black ink, white surfaces, one restrained red for deadlines. The
 * `pink*` keys are kept (many call sites reference them) but now resolve to
 * ink/greys so the whole app reads monochrome without touching every file.
 */
export const Brand = {
  bgDark: '#1d1d1f', // Apple near-black ink
  bgCard: '#ffffff',
  bgCardElevated: '#ffffff',
  pink: '#1d1d1f', // (accent → ink) selected chips, "today" marker
  pinkSoft: '#f5f5f7',
  pinkDeep: '#000000',
  pinkGlow: 'rgba(0, 0, 0, 0.10)',
  grayCat: '#8e8e93',
  hairline: 'rgba(0, 0, 0, 0.10)',
  hairlineStrong: 'rgba(0, 0, 0, 0.16)',
  overlay: 'rgba(255, 255, 255, 0.72)', // frosted-glass surface
  // Semantic event accents — monochrome, with red reserved for deadlines.
  classBlock: '#8e8e93', // fixed class — grey
  studyBlock: '#1d1d1f', // focused study — ink
  breakBlock: '#8e8e93', // break / rest — grey
  deadline: '#d70015', // deadline marker — the one accent
  warning: '#8a6d00',
} as const;

export const Colors = {
  light: {
    text: '#1d1d1f',
    textSecondary: 'rgba(0, 0, 0, 0.56)',
    textMuted: 'rgba(0, 0, 0, 0.40)',
    background: '#f5f5f7', // Apple off-white
    backgroundElement: '#ffffff',
    backgroundElevated: '#ffffff',
    backgroundSelected: 'rgba(0, 0, 0, 0.05)',
    tint: '#1d1d1f',
    border: 'rgba(0, 0, 0, 0.10)',
    onTint: '#ffffff',
  },
  dark: {
    text: '#f5f5f7',
    textSecondary: 'rgba(255, 255, 255, 0.60)',
    textMuted: 'rgba(255, 255, 255, 0.40)',
    background: '#0b0b0d', // near-black, mirrors the light off-white
    backgroundElement: '#1c1c1e',
    backgroundElevated: '#1c1c1e',
    backgroundSelected: 'rgba(255, 255, 255, 0.08)',
    tint: '#f5f5f7',
    border: 'rgba(255, 255, 255, 0.14)',
    onTint: '#0b0b0d',
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

/** Reusable elevation presets — soft and airy for a white/glass surface. */
export const Shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  // Quiet lift under primary (black) buttons — never a glow.
  pinkGlow: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
} as const;

/**
 * Frosted-glass surface (translucent white + backdrop blur on web; on native
 * the translucency reads clean and expo-glass-effect can layer real blur).
 * Spread into a style: `{ ...Glass }`.
 */
export const Glass = {
  backgroundColor: ACTIVE_SCHEME === 'dark' ? 'rgba(44, 44, 48, 0.55)' : Brand.overlay,
  ...(Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as object)
    : null),
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
