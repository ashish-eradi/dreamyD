import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../store';
import { COLORS } from '../constants/theme';

// Onboarding
import WelcomeScreen from '../screens/Onboarding/Welcome';
import WakeTimePickerScreen from '../screens/Onboarding/WakeTimePicker';
import NotificationPermissionScreen from '../screens/Onboarding/NotificationPermission';

// Auth
import { SignUpScreen, SignInScreen, ForgotPasswordScreen } from '../screens/Auth';

// Main tabs
import HomeScreen from '../screens/Home';
import TimelineScreen from '../screens/Timeline';
import RecordScreen from '../screens/Record';
import SettingsScreen from '../screens/Settings';

// Modals
import DreamDetailScreen from '../screens/DreamDetail';
import ShareCardScreen from '../screens/ShareCard';
import PatternAnalysisScreen from '../screens/PatternAnalysis';
import DreamscapeMapScreen from '../screens/DreamscapeMap';
import MonthlyReportScreen from '../screens/MonthlyReport';
import LucidTrainerScreen from '../screens/LucidTrainer';
import PaywallScreen from '../screens/Paywall';
import ProfileEditScreen from '../screens/Profile/ProfileEditScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';

const OnboardingStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// ─── SVG tab icons (inline paths for zero dependency) ────────────────────────
function TabIcon({ name, color, size = 24 }) {
  const s = size;
  const icons = {
    today: (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: s * 0.7, color, lineHeight: s }}>⌂</Text>
      </View>
    ),
    journal: (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: s * 0.7, color, lineHeight: s }}>☰</Text>
      </View>
    ),
    patterns: (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: s * 0.7, color, lineHeight: s }}>◈</Text>
      </View>
    ),
    you: (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: s * 0.7, color, lineHeight: s }}>◯</Text>
      </View>
    ),
  };
  return icons[name] || null;
}

// ─── Custom record button — dark night circle lifted above the pill ──────────
function RecordTabButton({ onPress, style, accessibilityState }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[style, styles.recordBtnOuter]}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel="Record dream"
      accessibilityState={accessibilityState}
    >
      <LinearGradient
        colors={['#2a2350', '#1c1733']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.recordBtn}
      >
        {/* Mic symbol in gold */}
        <Text style={styles.recordBtnIcon}>♪</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── App tabs ────────────────────────────────────────────────────────────────
function AppTabs() {
  const isPremium = useStore(s => s.isPremium ?? false);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <>
            {/* Fade-to-paper gradient behind everything */}
            <LinearGradient
              colors={['rgba(247,243,236,0)', 'rgba(247,243,236,0.92)']}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* White frosted pill */}
            <View style={styles.tabPill} />
          </>
        ),
        tabBarActiveTintColor: COLORS.ink,
        tabBarInactiveTintColor: COLORS.ink4,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Today"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color }) => <TabIcon name="today" color={color} />,
        }}
      />
      <Tab.Screen
        name="Journal"
        component={TimelineScreen}
        options={{
          tabBarLabel: 'Journal',
          tabBarIcon: ({ color }) => <TabIcon name="journal" color={color} />,
        }}
      />
      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: RecordTabButton,
        }}
      />
      <Tab.Screen
        name="Patterns"
        component={DreamscapeMapScreen}
        options={{
          tabBarLabel: 'Patterns',
          tabBarIcon: ({ color }) => <TabIcon name="patterns" color={color} />,
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
        name="You"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'You',
          tabBarIcon: ({ color }) => <TabIcon name="you" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Onboarding navigator ────────────────────────────────────────────────────
function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="WakeTimePicker" component={WakeTimePickerScreen} />
      <OnboardingStack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
      <OnboardingStack.Screen name="SignUp" component={SignUpScreen} />
      <OnboardingStack.Screen name="SignIn" component={SignInScreen} />
      <OnboardingStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </OnboardingStack.Navigator>
  );
}

// ─── Root navigator ──────────────────────────────────────────────────────────
function RootNavigator() {
  const user = useStore(s => s.user);

  if (!user?.id) {
    return <OnboardingNavigator />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="AppTabs" component={AppTabs} />
      <RootStack.Screen name="DreamDetail" component={DreamDetailScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="ShareCard" component={ShareCardScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="PatternAnalysis" component={PatternAnalysisScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="LucidTrainer" component={LucidTrainerScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'modal' }} />
    </RootStack.Navigator>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function MainNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    height: Platform.OS === 'ios' ? 90 : 72,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  // White frosted pill background — positioned inside the gradient layer
  tabPill: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 8,
    left: 16,
    right: 16,
    height: 60,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 0.5,
    borderColor: 'rgba(28,23,51,0.07)',
    shadowColor: '#1c1733',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  tabLabel: {
    fontSize: 10, fontWeight: '500', marginTop: 1,
  },
  // Record button — lifted dark night circle
  recordBtnOuter: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  recordBtn: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1c1733',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 18,
    elevation: 10,
    overflow: 'hidden',
  },
  recordBtnIcon: { fontSize: 20, color: '#f5d896' },
});
