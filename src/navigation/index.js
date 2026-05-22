import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';

// ─── Screen imports ───────────────────────────────────────────────────────────
// Onboarding
import WelcomeScreen from '../screens/Onboarding/Welcome';
import WakeTimePickerScreen from '../screens/Onboarding/WakeTimePicker';
import NotificationPermissionScreen from '../screens/Onboarding/NotificationPermission';

// Auth
import { SignUpScreen, SignInScreen } from '../screens/Auth';

// Main tabs
import HomeScreen from '../screens/Home';
import TimelineScreen from '../screens/Timeline';
import RecordScreen from '../screens/Record';
import SearchScreen from '../screens/Search';
import SettingsScreen from '../screens/Settings';

// Modals
import DreamDetailScreen from '../screens/DreamDetail';
import ShareCardScreen from '../screens/ShareCard';
import PatternAnalysisScreen from '../screens/PatternAnalysis';
import DreamscapeMapScreen from '../screens/DreamscapeMap';
import MonthlyReportScreen from '../screens/MonthlyReport';
import LucidTrainerScreen from '../screens/LucidTrainer';
import PaywallScreen from '../screens/Paywall';

// ─── Color constants ───────────────────────────────────────────────────────────
const COLORS = {
  background: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  gold: '#F59E0B',
  text: '#F1F0FF',
  muted: '#8B8BAE',
};

// ─── Navigators ───────────────────────────────────────────────────────────────
const OnboardingStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// ─── Premium lock overlay for Search tab ─────────────────────────────────────
function PremiumLockOverlay() {
  return (
    <View style={styles.premiumOverlay} pointerEvents="none">
      <Ionicons name="lock-closed" size={12} color={COLORS.gold} style={styles.premiumLockIcon} />
    </View>
  );
}

// ─── Custom Record tab button ─────────────────────────────────────────────────
function RecordTabButton({ onPress, accessibilityState }) {
  const focused = accessibilityState?.selected;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.recordButtonOuter}
      accessibilityRole="button"
      accessibilityLabel="Record dream"
    >
      <LinearGradient
        colors={focused ? ['#9B6FD0', '#C084FC'] : ['#7B5EA7', '#9B6FD0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.recordButtonGradient}
      >
        <Ionicons
          name="mic"
          size={28}
          color="#FFFFFF"
        />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Tab bar icon helper ──────────────────────────────────────────────────────
function TabIcon({ name, color, size }) {
  return <Ionicons name={name} size={size} color={color} />;
}

// ─── Search tab icon with premium lock overlay ────────────────────────────────
function SearchTabIcon({ color, size, isPremium }) {
  return (
    <View style={styles.searchIconContainer}>
      <Ionicons name="search" size={size} color={color} />
      {!isPremium && <PremiumLockOverlay />}
    </View>
  );
}

// ─── AppTabs navigator ────────────────────────────────────────────────────────
function AppTabs() {
  const isPremium = useStore((s) => s.user?.is_premium ?? false);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          tabBarLabel: 'Timeline',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="list" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <RecordTabButton {...props} />,
        }}
      />

      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => (
            <SearchTabIcon color={color} size={size} isPremium={isPremium} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!isPremium) {
              e.preventDefault();
              navigation.navigate('Paywall');
            }
          },
        })}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Onboarding stack ─────────────────────────────────────────────────────────
function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
        gestureEnabled: false,
      }}
    >
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="WakeTimePicker" component={WakeTimePickerScreen} />
      <OnboardingStack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
      <OnboardingStack.Screen name="SignUp" component={SignUpScreen} />
      <OnboardingStack.Screen name="SignIn" component={SignInScreen} />
    </OnboardingStack.Navigator>
  );
}

// ─── Root stack (tabs + modals) ───────────────────────────────────────────────
function RootNavigator() {
  const user = useStore((s) => s.user);

  if (!user?.id) {
    return <OnboardingNavigator />;
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        cardStyle: { backgroundColor: COLORS.background },
        cardOverlayEnabled: true,
        gestureEnabled: true,
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateY: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.height, 0],
                }),
              },
            ],
            opacity: current.progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.8, 1],
            }),
          },
          overlayStyle: {
            opacity: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.6],
            }),
            backgroundColor: '#000000',
          },
        }),
      }}
    >
      {/* Base: tab bar app */}
      <RootStack.Screen
        name="AppTabs"
        component={AppTabs}
        options={{ presentation: 'card' }}
      />

      {/* Modals */}
      <RootStack.Screen
        name="DreamDetail"
        component={DreamDetailScreen}
        options={{ gestureEnabled: true }}
      />
      <RootStack.Screen
        name="ShareCard"
        component={ShareCardScreen}
        options={{ gestureEnabled: true }}
      />
      <RootStack.Screen
        name="PatternAnalysis"
        component={PatternAnalysisScreen}
        options={{ gestureEnabled: true }}
      />
      <RootStack.Screen
        name="DreamscapeMap"
        component={DreamscapeMapScreen}
        options={{ gestureEnabled: true }}
      />
      <RootStack.Screen
        name="MonthlyReport"
        component={MonthlyReportScreen}
        options={{ gestureEnabled: true }}
      />
      <RootStack.Screen
        name="LucidTrainer"
        component={LucidTrainerScreen}
        options={{ gestureEnabled: true }}
      />
      <RootStack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ gestureEnabled: true }}
      />
    </RootStack.Navigator>
  );
}

// ─── MainNavigator (exported root) ───────────────────────────────────────────
export function MainNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default MainNavigator;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Tab bar
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopColor: 'rgba(123, 94, 167, 0.25)',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },

  // Record button
  recordButtonOuter: {
    // Lift button above the tab bar
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  recordButtonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },

  // Search tab icon
  searchIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Premium lock overlay
  premiumOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    padding: 1,
  },
  premiumLockIcon: {
    // icon is self-sized
  },
});
