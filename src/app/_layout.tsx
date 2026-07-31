import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/Toast';
import { ACTIVE_SCHEME, Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const palette = Colors[ACTIVE_SCHEME];
const navTheme = {
  ...(ACTIVE_SCHEME === 'dark' ? DarkTheme : DefaultTheme),
  colors: {
    ...(ACTIVE_SCHEME === 'dark' ? DarkTheme : DefaultTheme).colors,
    background: palette.background,
    card: palette.backgroundElement,
    text: palette.text,
    border: palette.border,
    primary: palette.tint,
    notification: palette.tint,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={ACTIVE_SCHEME === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" />
        </Stack>
        <ToastHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
