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
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useUniwind } from 'uniwind';

import { useNavigationTheme } from '@/hooks/use-navigation-theme';
import { ROLE_AREA_NAMES } from '@/constants/roles';
import { useIsLoggedIn, useRoleArea } from '@/hooks/use-session';
import { startSessionMonitor } from '@/services/api';
import { loadServerConfig } from '@/services/server-config';
import { loadThemePreference } from '@/services/theme';

SplashScreen.preventAutoHideAsync();

// Screens shown when the session changes, with no swipe back since there is nothing to go back to.
/** Signed in: an instant swap. Login animates out first and the home screen builds itself in. */
const ENTER_APP = { animation: 'none', gestureEnabled: false } as const;
/** Signed out (logout, expired session): the login screen fades in. */
const SHOW_LOGIN = { animation: 'fade', animationDuration: 250, gestureEnabled: false } as const;

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
    // KeyboardProvider tracks the keyboard for FormScrollView (keeps focused fields above it).
    <KeyboardProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        {/*
          When the session changes, the router moves to the first screen that is still allowed, in the
          order below: after login that is the user's role area, after logout the login screen.
        */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={isLoggedIn}>
            {ROLE_AREA_NAMES.map((name) => (
              <Stack.Protected key={name} guard={area === name}>
                <Stack.Screen name={name} options={ENTER_APP} />
              </Stack.Protected>
            ))}
            {/* Signed in with a role the mobile app doesn't support. */}
            <Stack.Protected guard={area === null}>
              <Stack.Screen name="index" options={ENTER_APP} />
            </Stack.Protected>
          </Stack.Protected>
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="login" options={SHOW_LOGIN} />
            <Stack.Screen
              name="server-config"
              options={{ headerShown: true, title: 'IP Config', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }}
            />
          </Stack.Protected>
          {/* Last, so it is never the screen the router falls back to. */}
          <Stack.Screen
            name="form-preview"
            options={{ headerShown: true, title: 'Form components', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }}
          />
        </Stack>
      </ThemeProvider>
    </KeyboardProvider>
  );
}
