// =============================================================================
// DreamDiary — Root Application Component
// =============================================================================
// Responsibilities:
//   1. Provide SafeAreaProvider and NavigationContainer at the top of the tree
//   2. Restore the Supabase session on launch (AsyncStorage-backed)
//   3. Subscribe to auth state changes so the UI re-routes on sign-in/out
//   4. Show a full-screen SplashScreen while the session check is in-flight
//   5. Route to the Onboarding stack if there is no active session, or to
//      the MainNavigator (tabs) if the user is already authenticated
// =============================================================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainNavigator from './src/navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
} from '@expo-google-fonts/lora';

// ── Supabase ──────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, onAuthStateChange, getProfile, updateProfile } from './src/services/supabase';

// ── Notifications ─────────────────────────────────────────────────────────────
import {
  requestPermissions as requestNotificationPermissions,
  scheduleWakeUpNotification,
  addNotificationResponseListener,
} from './src/services/notifications';

// ── Zustand store ─────────────────────────────────────────────────────────────
import {
  useDreamStore,
  selectIsLoading,
} from './src/store';

// =============================================================================
// Colour palette (inline — keeps App.js self-contained before NativeWind loads)
// =============================================================================

const COLORS = {
  background: '#f6f1e8',
  card: '#ffffff',
  primary: '#f4a585',
  accent: '#d4a574',
  gold: '#d4a574',
  textPrimary: '#2a2622',
  textMuted: '#8a8278',
  success: '#8aaf94',
};

// =============================================================================
// Splash screen
// =============================================================================

function SplashScreen() {
  return (
    <View style={styles.splashRoot}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Text style={styles.splashTitle}>DreamDiary</Text>
      <Text style={styles.splashTagline}>Speak it before it dissolves.</Text>
      <ActivityIndicator
        size="small"
        color={COLORS.accent}
        style={{ marginTop: 48 }}
      />
    </View>
  );
}

// =============================================================================
// App — root component
// =============================================================================

export default function App() {
  // ── Fonts ─────────────────────────────────────────────────────────────────
  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
  });

  // ── Store actions ─────────────────────────────────────────────────────────
  const setSession             = useDreamStore((s) => s.setSession);
  const setUser                = useDreamStore((s) => s.setUser);
  const setIsLoading           = useDreamStore((s) => s.setIsLoading);
  const setIsPremium           = useDreamStore((s) => s.setIsPremium);
  const setOnboardingDone      = useDreamStore((s) => s.setOnboardingDone);
  const setNeedsPasswordReset  = useDreamStore((s) => s.setNeedsPasswordReset);
  const setWakeTime            = useDreamStore((s) => s.setWakeTime);
  const storeSignOut           = useDreamStore((s) => s.signOut);

  // ── Store state ───────────────────────────────────────────────────────────
  const isLoading = useDreamStore(selectIsLoading);

  // ── Handle deep links from notification taps ────────────────────────────────
  // Stored here so we can pass it to NavigationContainer later if needed.
  const handleNotificationResponse = useCallback((response) => {
    const data = response?.notification?.request?.content?.data;
    if (data?.type === 'wake_up_reminder' && data?.openScreen) {
      // Navigation ref would be used here to navigate programmatically.
      // For now we just log — wire up a navigationRef when screens are built.
      console.log('[App] Notification tap → navigate to', data.openScreen);
    }
  }, []);

  // ── Handle deep links (password reset, etc.) ───────────────────────────────
  const handleDeepLink = useCallback(async (url) => {
    if (!url) return;
    try {
      // Supabase sends: dreamdiary://auth/reset#access_token=...&type=recovery
      // or:             dreamdiary://auth/reset?code=...
      const parsed = new URL(url);

      // Only handle known auth paths — prevents unrelated deep links from
      // accidentally triggering exchangeCodeForSession
      if (parsed.hostname !== 'auth') return;

      // PKCE flow — code param
      const code = parsed.searchParams.get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }

      // Implicit flow — hash fragment contains access_token + refresh_token
      const hash = parsed.hash?.slice(1) ?? '';
      const params = new URLSearchParams(hash);
      const accessToken  = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type         = params.get('type');

      if (type === 'recovery' && accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    } catch (err) {
      console.warn('[App] handleDeepLink error:', err.message);
    }
  }, []);

  useEffect(() => {
    // Handle link that opened the app from cold start
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    }).catch(() => {});

    // Handle link while app is already running
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [handleDeepLink]);

  // ── Initialise notifications ────────────────────────────────────────────────
  useEffect(() => {
    let unsubscribeNotification;

    async function initNotifications() {
      const granted = await requestNotificationPermissions();
      if (granted) {
        unsubscribeNotification = addNotificationResponseListener(
          handleNotificationResponse
        );
      }
    }

    initNotifications().catch((err) =>
      console.warn('[App] Notification init error:', err)
    );

    return () => {
      if (typeof unsubscribeNotification === 'function') {
        unsubscribeNotification();
      }
    };
  }, [handleNotificationResponse]);

  // ── Restore session on launch & subscribe to auth events ───────────────────
  useEffect(() => {
    let unsubscribeAuth;

    async function bootstrapSession() {
      try {
        // getSession() reads from AsyncStorage synchronously on native
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn('[App] getSession error:', error.message);
        }

        if (initialSession) {
          setSession(initialSession);
          const pendingReset = await AsyncStorage.getItem('@dreamdiary/needsPasswordReset').catch(() => null);
          if (pendingReset === 'true') {
            setNeedsPasswordReset(true);
          } else {
            await hydrateProfile(initialSession.user.id);
          }
        }
      } catch (err) {
        console.error('[App] Session bootstrap failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    // Subscribe to future auth changes (sign-in, sign-out, token refresh)
    unsubscribeAuth = onAuthStateChange(async (event, newSession) => {
      console.log('[App] Auth event:', event);

      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        await hydrateProfile(newSession.user.id);
        setIsLoading(false);
      } else if (event === 'PASSWORD_RECOVERY' && newSession) {
        // User clicked a reset link — they're authenticated but need to set a new password
        setSession(newSession);
        setNeedsPasswordReset(true);
        AsyncStorage.setItem('@dreamdiary/needsPasswordReset', 'true').catch(() => {});
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        storeSignOut();
        AsyncStorage.removeItem('@dreamdiary/needsPasswordReset').catch(() => {});
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(newSession);
      } else if (event === 'USER_UPDATED' && newSession) {
        setUser(newSession.user);
        setNeedsPasswordReset(false);
        AsyncStorage.removeItem('@dreamdiary/needsPasswordReset').catch(() => {});
        await hydrateProfile(newSession.user.id);
      }
    });

    bootstrapSession();

    return () => {
      if (typeof unsubscribeAuth === 'function') {
        unsubscribeAuth();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Fetch the user's app profile from Supabase and populate premium status
   * and notification schedule.
   */
  async function hydrateProfile(userId) {
    try {
      let profile = await getProfile(userId);
      if (!profile) return;

      setIsPremium(profile.is_premium ?? false);
      setOnboardingDone(profile.onboarding_done ?? false);
      setWakeTime(profile.wake_time ?? null);

      // Merge name from the users table into the store's user object so
      // Settings shows the correct name even if user_metadata wasn't set.
      if (profile.name) {
        const currentUser = useDreamStore.getState().user;
        if (currentUser) {
          setUser({ ...currentUser, user_metadata: { ...currentUser.user_metadata, full_name: profile.name } });
        }
      }

      // Apply pending_wake_time stored in user_metadata during email-confirmation signup
      if (!profile.wake_time) {
        const currentUser = useDreamStore.getState().user;
        const pendingWakeTime = currentUser?.user_metadata?.pending_wake_time;
        if (pendingWakeTime) {
          await updateProfile(userId, { wake_time: pendingWakeTime, onboarding_done: true }).catch(() => {});
          profile = { ...profile, wake_time: pendingWakeTime };
        }
      }

      // Re-schedule wake-up notification in case wake_time changed on another device
      if (profile.wake_time) {
        await scheduleWakeUpNotification(profile.wake_time).catch(() => {
          // Notification scheduling can fail if permission was revoked; non-fatal
        });
      }
    } catch (err) {
      // Non-fatal — the app can work without the premium flag being set
      console.warn('[App] hydrateProfile error:', err.message);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading || (!fontsLoaded && !fontError)) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SplashScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <MainNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // ── Splash ──────────────────────────────────────────────────────────────────
  splashRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  splashTitle: {
    fontFamily: 'Lora_500Medium',
    fontSize: 38,
    fontWeight: '500',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  splashTagline: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 16,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

});
