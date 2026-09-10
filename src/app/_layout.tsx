import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { getSession, onAuthStateChange } from '@/services/auth';
import { loadUserGamificationState } from '@/services/gamification';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Fail open for the hackathon demo if session restore hangs or auth is unavailable.
    const failSafe = setTimeout(() => {
      if (!cancelled) setAuthInitialized(true);
    }, 2500);

    getSession()
      .then((initialSession) => {
        if (cancelled) return;
        if (initialSession?.user) {
          loadUserGamificationState(initialSession.user.id);
        }
      })
      .catch(() => {
        // Continue into the demo without a session.
      })
      .finally(() => {
        if (!cancelled) setAuthInitialized(true);
      });

    const subscription = onAuthStateChange((_event, newSession) => {
      if (newSession?.user) {
        loadUserGamificationState(newSession.user.id);
      }
      // Do not wipe local XP/streaks when auth is missing — demo must keep working offline.
    });

    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, []);

  if (!authInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#4F46E5" size="large" />
        <Text style={styles.loadingText}>Restoring your learning session...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signin" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="practice" />
        <Stack.Screen name="reading" />
        <Stack.Screen name="writing" />
        <Stack.Screen name="progress" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="explore" />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
});
