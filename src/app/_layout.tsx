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
import { ROLE_AREA_NAMES } from '@/constants/roles';
import { useIsLoggedIn, useRoleArea } from '@/hooks/use-session';
import { startSessionMonitor } from '@/services/api';
import { loadServerConfig } from '@/services/server-config';
import { loadThemePreference } from '@/services/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { theme } = useUniwind();
  const navigationTheme = useNavigationTheme();
  const isLoggedIn = useIsLoggedIn();
  const area = useRoleArea();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Apply the saved server and theme before any screen renders or makes API requests.
  useEffect(() => {
    Promise.all([loadServerConfig(), loadThemePreference()]).finally(() => setSettingsLoaded(true));
  }, []);

  // Keep the session token fresh when the app returns from the background.
  useEffect(() => startSessionMonitor(), []);

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isLoggedIn}>
          {/* index sends the user to their role's area; each area is only reachable with that role. */}
          <Stack.Screen name="index" />
          {ROLE_AREA_NAMES.map((name) => (
            <Stack.Protected key={name} guard={area === name}>
              <Stack.Screen name={name} options={{ animation: 'none' }} />
            </Stack.Protected>
          ))}
        </Stack.Protected>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="login" />
          <Stack.Screen
            name="server-config"
            options={{ headerShown: true, title: 'IP Config', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }}
          />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
