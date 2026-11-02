import '../global.css';

import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useUniwind } from 'uniwind';

import { useNavigationTheme } from '@/hooks/use-navigation-theme';
import { ROLE_AREA_NAMES } from '@/constants/roles';
import { useIsLoggedIn, useNeedsOnboarding, useRoleArea } from '@/hooks/use-session';
import { restoreSession, startSessionMonitor } from '@/services/api';
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
  const needsOnboarding = useNeedsOnboarding();
  const [fontsLoaded, fontError] = useFonts({ IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Apply the saved server and theme, and sign back in from the saved token, before any screen
  // renders or makes API requests. Signing in waits for the server address, which its refresh uses.
  useEffect(() => {
    Promise.all([loadServerConfig().then(restoreSession), loadThemePreference()]).finally(() => setSettingsLoaded(true));
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
            {/* First, so a user who still has to onboard lands here instead of on their home screen. */}
            <Stack.Protected guard={needsOnboarding}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            {ROLE_AREA_NAMES.map((name) => (
              <Stack.Protected key={name} guard={area === name && !needsOnboarding}>
                <Stack.Screen name={name} options={ENTER_APP} />
              </Stack.Protected>
            ))}
            {/* Signed in with a role the mobile app doesn't support. */}
            <Stack.Protected guard={area === null && !needsOnboarding}>
              <Stack.Screen name="index" options={ENTER_APP} />
            </Stack.Protected>
          </Stack.Protected>
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="login" options={SHOW_LOGIN} />
            <Stack.Screen name="verify-email" />
            <Stack.Screen
              name="register"
              options={{ headerShown: true, title: 'Create account', headerTitleStyle: { fontFamily: 'IBMPlexSans_600SemiBold' } }}
            />
            <Stack.Screen
              name="server-config"
              options={{ headerShown: true, title: 'IP Config', headerTitleStyle: { fontFamily: 'IBMPlexSans_600SemiBold' } }}
            />
          </Stack.Protected>
          {/* Last, so it is never the screen the router falls back to. */}
          <Stack.Screen
            name="form-preview"
            options={{ headerShown: true, title: 'Form components', headerTitleStyle: { fontFamily: 'IBMPlexSans_600SemiBold' } }}
          />
        </Stack>
      </ThemeProvider>
    </KeyboardProvider>
  );
}
