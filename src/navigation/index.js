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
import { SignUpScreen, SignInScreen } from '../screens/Auth';

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

// ─── Custom record button (lifted, peach circle) ────────────────────────────
function RecordTabButton({ onPress, children }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.recordBtnOuter}
      activeOpacity={0.85}
    >
      <View style={styles.recordBtn}>
        <Text style={styles.recordBtnIcon}>⊙</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── App tabs ────────────────────────────────────────────────────────────────
function AppTabs({ navigation: navProp }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <LinearGradient
            colors={['transparent', COLORS.bg]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: COLORS.ink,
        tabBarInactiveTintColor: COLORS.ink3,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
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
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="WakeTimePicker" component={WakeTimePickerScreen} />
      <OnboardingStack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
      <OnboardingStack.Screen name="SignUp" component={SignUpScreen} />
      <OnboardingStack.Screen name="SignIn" component={SignInScreen} />
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
      <RootStack.Screen name="DreamscapeMap" component={DreamscapeMapScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="LucidTrainer" component={LucidTrainerScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
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
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: 11, fontWeight: '500',
  },
  recordBtnOuter: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
  },
  recordBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  recordBtnIcon: { fontSize: 24, color: COLORS.bg2 },
});
