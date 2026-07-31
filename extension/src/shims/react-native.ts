/**
 * Browser stand-in for react-native. The extension only pulls one RN symbol
 * transitively — `Platform` (via lib/ics.ts) — so that's all we implement.
 * Everything runs on the web, so OS is 'web'.
 */
export const Platform = {
  OS: 'web' as const,
  select: <T>(specs: { web?: T; default?: T; ios?: T; android?: T }): T | undefined =>
    specs.web ?? specs.default,
};
