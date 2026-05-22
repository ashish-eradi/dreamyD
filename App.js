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
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ── Supabase ──────────────────────────────────────────────────────────────────
import { supabase, onAuthStateChange, getProfile } from './src/services/supabase';

// ── Notifications ─────────────────────────────────────────────────────────────
import {
  requestPermissions as requestNotificationPermissions,
  scheduleWakeUpNotification,
  addNotificationResponseListener,
} from './src/services/notifications';

// ── Zustand store ─────────────────────────────────────────────────────────────
import {
  useDreamStore,
  selectUser,
  selectSession,
  selectIsLoading,
} from './src/store';

// =============================================================================
// Colour palette (inline — keeps App.js self-contained before NativeWind loads)
// =============================================================================

const COLORS = {
  background: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  gold: '#F59E0B',
  textPrimary: '#F1F0FF',
  textMuted: '#8B8BAE',
  success: '#10B981',
};

// =============================================================================
// Placeholder screens
// =============================================================================
// These are minimal stand-in components.  Replace each one with the real
// screen implementation in src/screens/ as the project grows.

function PlaceholderScreen({ route }) {
  return (
    <SafeAreaView style={styles.placeholderRoot}>
      <View style={styles.placeholderCenter}>
        <Text style={styles.placeholderTitle}>{route?.name ?? 'Screen'}</Text>
        <Text style={styles.placeholderSubtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

// Onboarding screens
const WelcomeScreen    = (props) => <PlaceholderScreen {...props} />;
const SignInScreen     = (props) => <PlaceholderScreen {...props} />;
const SignUpScreen     = (props) => <PlaceholderScreen {...props} />;

// Main tab screens
const HomeScreen       = (props) => <PlaceholderScreen {...props} />;
const RecordDreamScreen = (props) => <PlaceholderScreen {...props} />;
const DreamDetailScreen = (props) => <PlaceholderScreen {...props} />;
const InsightsScreen   = (props) => <PlaceholderScreen {...props} />;
const ProfileScreen    = (props) => <PlaceholderScreen {...props} />;

// =============================================================================
// Navigators
// =============================================================================

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ---------------------------------------------------------------------------
// Onboarding stack
// ---------------------------------------------------------------------------
// Shown when there is no active session.

function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Welcome"  component={WelcomeScreen} />
      <Stack.Screen name="SignIn"   component={SignInScreen}  />
      <Stack.Screen name="SignUp"   component={SignUpScreen}  />
    </Stack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Tab icon helper (text-only until vector icon library is wired up)
// ---------------------------------------------------------------------------

function TabIcon({ label, focused }) {
  const icons = {
    Home: '🌙',
    Record: '⏺',
    Insights: '✨',
    Profile: '👤',
  };
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.55 }}>
      {icons[label] ?? '●'}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Main tab navigator
// ---------------------------------------------------------------------------
// Shown when the user is authenticated.

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: '#2A2A4A',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Dreams' }}
      />
      <Tab.Screen
        name="Record"
        component={RecordDreamScreen}
        options={{ tabBarLabel: 'Record' }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ tabBarLabel: 'Insights' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// We also need a root stack that wraps MainNavigator so we can push detail
// screens (like DreamDetail) on top of the tabs without the tab bar showing.
function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="MainTabs"    component={MainNavigator}    />
      <Stack.Screen name="DreamDetail" component={DreamDetailScreen} />
    </Stack.Navigator>
  );
}

// =============================================================================
// Splash screen
// =============================================================================

function SplashScreen() {
  return (
    <View style={styles.splashRoot}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Text style={styles.splashTitle}>DreamDiary</Text>
      <Text style={styles.splashTagline}>Decode your dreams</Text>
      <ActivityIndicator
        size="small"
        color={COLORS.accent}
        style={{ marginTop: 48 }}
      />
    </View>
  );
}

// =============================================================================
// Navigation theme
// =============================================================================

const navigationTheme = {
  dark: true,
  colors: {
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.card,
    text: COLORS.textPrimary,
    border: '#2A2A4A',
    notification: COLORS.accent,
  },
};

// =============================================================================
// App — root component
// =============================================================================

export default function App() {
  // ── Store actions ───────────────────────────────────────────────────────────
  const setSession   = useDreamStore((s) => s.setSession);
  const setUser      = useDreamStore((s) => s.setUser);
  const setIsLoading = useDreamStore((s) => s.setIsLoading);
  const setIsPremium = useDreamStore((s) => s.setIsPremium);
  const storeSignOut = useDreamStore((s) => s.signOut);

  // ── Store state ─────────────────────────────────────────────────────────────
  const session   = useDreamStore(selectSession);
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
          await hydrateProfile(initialSession.user.id);
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
      } else if (event === 'SIGNED_OUT') {
        storeSignOut();
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(newSession);
      } else if (event === 'USER_UPDATED' && newSession) {
        setUser(newSession.user);
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
      const profile = await getProfile(userId);
      if (!profile) return;

      setIsPremium(profile.is_premium ?? false);

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

  if (isLoading) {
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
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <NavigationContainer theme={navigationTheme}>
          {session ? <RootNavigator /> : <OnboardingNavigator />}
        </NavigationContainer>
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
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  splashTagline: {
    fontSize: 16,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },

  // ── Placeholder screens ──────────────────────────────────────────────────────
  placeholderRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  placeholderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
