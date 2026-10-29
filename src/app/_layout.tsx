import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useUniwind } from 'uniwind';

import { useNavigationTheme } from '@/hooks/use-navigation-theme';
import { loadThemePreference } from '@/services/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { theme } = useUniwind();
  const navigationTheme = useNavigationTheme();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Apply the saved theme before any screen renders.
  useEffect(() => {
    loadThemePreference().finally(() => setSettingsLoaded(true));
  }, []);

  const ready = settingsLoaded && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
