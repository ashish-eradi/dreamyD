// =============================================================================
// DreamDiary — NotificationPermissionScreen
// =============================================================================
// Onboarding step 3: request push notification permissions, showing the value
// prop before the system permission dialog appears.
// =============================================================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../../hooks/useNotifications';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  gold: '#F59E0B',
  success: '#10B981',
};

// ─── BellIcon ─────────────────────────────────────────────────────────────────
/**
 * Animated notification bell illustration using three concentric pulse rings
 * and a subtle bell-swing animation.
 */
function BellIcon() {
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);
  const bellRotate = useSharedValue(0);
  const bellScale = useSharedValue(1);

  useEffect(() => {
    // Staggered expanding pulse rings
    ring1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 0 }),
        withDelay(200, withTiming(0, { duration: 200 })),
      ),
      -1,
      false
    );

    ring2.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 0 }),
          withDelay(200, withTiming(0, { duration: 200 })),
        ),
        -1,
        false
      )
    );

    ring3.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 0 }),
          withDelay(200, withTiming(0, { duration: 200 })),
        ),
        -1,
        false
      )
    );

    // Bell gentle swing
    bellRotate.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(12, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000 }), // pause
      ),
      -1,
      false
    );

    bellScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2300 }),
      ),
      -1,
      false
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring1.value, [0, 0.3, 1], [0.7, 0.5, 0]),
    transform: [{ scale: interpolate(ring1.value, [0, 1], [1, 2.6]) }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring2.value, [0, 0.3, 1], [0.5, 0.35, 0]),
    transform: [{ scale: interpolate(ring2.value, [0, 1], [1, 2.0]) }],
  }));

  const ring3Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring3.value, [0, 0.3, 1], [0.3, 0.2, 0]),
    transform: [{ scale: interpolate(ring3.value, [0, 1], [1, 1.5]) }],
  }));

  const bellStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${bellRotate.value}deg` },
      { scale: bellScale.value },
    ],
  }));

  return (
    <View style={styles.bellContainer}>
      {/* Pulse rings */}
      <Animated.View style={[styles.pulseRing, styles.pulseRing1, ring1Style]} />
      <Animated.View style={[styles.pulseRing, styles.pulseRing2, ring2Style]} />
      <Animated.View style={[styles.pulseRing, styles.pulseRing3, ring3Style]} />

      {/* Bell circle background */}
      <LinearGradient
        colors={['#7B5EA7', '#C084FC']}
        style={styles.bellCircle}
      >
        <Animated.Text style={[styles.bellEmoji, bellStyle]}>🔔</Animated.Text>
      </LinearGradient>
    </View>
  );
}

// ─── FeatureRow ───────────────────────────────────────────────────────────────
function FeatureRow({ icon, text, delay }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(450)}
      style={styles.featureRow}
    >
      <View style={styles.featureIconCircle}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </Animated.View>
  );
}

// ─── NotificationPermissionScreen ────────────────────────────────────────────
export default function NotificationPermissionScreen({ navigation, route }) {
  const { requestPermissions, scheduleNotification } = useNotifications();
  const wakeTime = route?.params?.wakeTime ?? '07:00';

  const buttonScale = useSharedValue(1);

  const handleEnable = useCallback(async () => {
    buttonScale.value = withSpring(0.96, { damping: 15 }, () => {
      buttonScale.value = withSpring(1, { damping: 15 });
    });

    try {
      const granted = await requestPermissions();
      if (granted) {
        await scheduleNotification(wakeTime);
      }
    } catch (err) {
      console.warn('[NotificationPermissionScreen] permission error:', err);
    } finally {
      // Always advance — user agreed to try
      navigation.navigate('SignUp');
    }
  }, [requestPermissions, scheduleNotification, wakeTime, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('SignUp');
  }, [navigation]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Header / progress ── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerProgress}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>
        </Animated.View>

        {/* ── Illustration ── */}
        <Animated.View
          entering={FadeIn.delay(200).duration(600)}
          style={styles.illustrationSection}
        >
          <BellIcon />
        </Animated.View>

        {/* ── Copy ── */}
        <Animated.View
          entering={FadeInDown.delay(350).duration(500)}
          style={styles.copySection}
        >
          <Text style={styles.title}>Never lose a dream again</Text>
          <Text style={styles.body}>
            We'll remind you each morning right as you wake up, before your
            dream fades from memory
          </Text>
        </Animated.View>

        {/* ── Feature list ── */}
        <View style={styles.featureList}>
          <FeatureRow
            icon="🌙"
            text="Daily reminder timed exactly to your wake-up"
            delay={500}
          />
          <FeatureRow
            icon="⚡"
            text="Capture dreams in under 30 seconds with voice"
            delay={620}
          />
          <FeatureRow
            icon="🔕"
            text="One notification per day — no spam, ever"
            delay={740}
          />
        </View>

        {/* ── CTAs ── */}
        <Animated.View
          entering={FadeInUp.delay(850).duration(500)}
          style={styles.bottomSection}
        >
          <Animated.View style={buttonStyle}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleEnable}
              style={styles.enableWrapper}
              accessibilityRole="button"
              accessibilityLabel="Enable Notifications"
            >
              <LinearGradient
                colors={['#7B5EA7', '#C084FC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.enableGradient}
              >
                <Text style={styles.enableText}>Enable Notifications</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSkip}
            style={styles.skipButton}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(139,139,174,0.35)',
  },
  progressDotActive: {
    backgroundColor: COLORS.accent,
    width: 20,
    borderRadius: 4,
  },

  // Illustration
  illustrationSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  bellContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 70,
    borderWidth: 2,
  },
  pulseRing1: {
    width: 100,
    height: 100,
    borderColor: COLORS.accent,
  },
  pulseRing2: {
    width: 100,
    height: 100,
    borderColor: COLORS.primary,
  },
  pulseRing3: {
    width: 100,
    height: 100,
    borderColor: COLORS.accent,
  },
  bellCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  bellEmoji: {
    fontSize: 44,
  },

  // Copy
  copySection: {
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },

  // Feature rows
  featureList: {
    paddingHorizontal: 28,
    marginTop: 16,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.18)',
  },
  featureIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(123,94,167,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Bottom
  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
    marginTop: 'auto',
    paddingTop: 20,
  },
  enableWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: 4,
  },
  enableGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: COLORS.muted,
  },
});
