// =============================================================================
// DreamDiary — WelcomeScreen
// =============================================================================
// Full-screen onboarding entry point with animated floating stars background,
// purple-glow title, and navigation to WakeTimePicker / SignIn.
// =============================================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  bg: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  text: '#F1F0FF',
  muted: '#8B8BAE',
};

// ─── Star data ────────────────────────────────────────────────────────────────
// Pre-defined star positions so layout is deterministic and matches each render.
const STARS = [
  { id: 0,  x: 0.08, y: 0.06, size: 2.5, delay: 0 },
  { id: 1,  x: 0.22, y: 0.12, size: 1.8, delay: 300 },
  { id: 2,  x: 0.71, y: 0.04, size: 3.0, delay: 600 },
  { id: 3,  x: 0.88, y: 0.10, size: 2.0, delay: 200 },
  { id: 4,  x: 0.45, y: 0.08, size: 1.5, delay: 900 },
  { id: 5,  x: 0.60, y: 0.18, size: 2.2, delay: 100 },
  { id: 6,  x: 0.15, y: 0.22, size: 1.6, delay: 700 },
  { id: 7,  x: 0.93, y: 0.28, size: 2.8, delay: 400 },
  { id: 8,  x: 0.05, y: 0.35, size: 1.4, delay: 1100 },
  { id: 9,  x: 0.78, y: 0.32, size: 2.0, delay: 500 },
  { id: 10, x: 0.35, y: 0.40, size: 1.2, delay: 800 },
  { id: 11, x: 0.52, y: 0.30, size: 3.2, delay: 250 },
  { id: 12, x: 0.12, y: 0.55, size: 1.8, delay: 1300 },
  { id: 13, x: 0.68, y: 0.48, size: 2.4, delay: 650 },
  { id: 14, x: 0.85, y: 0.60, size: 1.6, delay: 350 },
  { id: 15, x: 0.28, y: 0.65, size: 2.0, delay: 950 },
  { id: 16, x: 0.42, y: 0.72, size: 1.4, delay: 1500 },
  { id: 17, x: 0.75, y: 0.75, size: 2.6, delay: 750 },
  { id: 18, x: 0.06, y: 0.80, size: 1.8, delay: 450 },
  { id: 19, x: 0.55, y: 0.85, size: 1.2, delay: 1200 },
  { id: 20, x: 0.90, y: 0.88, size: 2.0, delay: 200 },
  { id: 21, x: 0.18, y: 0.92, size: 2.4, delay: 850 },
  { id: 22, x: 0.38, y: 0.95, size: 1.6, delay: 1050 },
  { id: 23, x: 0.62, y: 0.93, size: 2.8, delay: 550 },
];

// ─── StarDot ──────────────────────────────────────────────────────────────────
function StarDot({ x, y, size, delay }) {
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sine) }),
          withTiming(0.15, { duration: 1400, easing: Easing.inOut(Easing.sine) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: x * SCREEN_WIDTH,
          top: y * SCREEN_HEIGHT,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    />
  );
}

// ─── MoonLogo ─────────────────────────────────────────────────────────────────
function MoonLogo() {
  const floatY = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2200, easing: Easing.inOut(Easing.sine) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sine) }),
      ),
      -1,
      false,
    );
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: interpolate(glowScale.value, [1, 1.12], [0.25, 0.55]),
  }));

  return (
    <View style={styles.logoContainer}>
      {/* Glow ring behind moon */}
      <Animated.View style={[styles.logoGlow, glowStyle]} />
      <Animated.View style={floatStyle}>
        <Text style={styles.logoEmoji}>🌙</Text>
        <Text style={styles.starsEmoji}>✨</Text>
      </Animated.View>
    </View>
  );
}

// ─── WelcomeScreen ────────────────────────────────────────────────────────────
export default function WelcomeScreen({ navigation }) {
  const titleGlow = useSharedValue(0.7);

  useEffect(() => {
    titleGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const titleGlowStyle = useAnimatedStyle(() => ({
    textShadowRadius: interpolate(titleGlow.value, [0.6, 1], [8, 22]),
    opacity: interpolate(titleGlow.value, [0.6, 1], [0.9, 1]),
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Animated background stars ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {STARS.map((s) => (
          <StarDot key={s.id} x={s.x} y={s.y} size={s.size} delay={s.delay} />
        ))}
      </View>

      {/* ── Radial gradient overlay for depth ── */}
      <LinearGradient
        colors={['rgba(123,94,167,0.18)', 'transparent', 'rgba(13,13,26,0.9)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Center content ── */}
        <View style={styles.centerContent}>
          <Animated.View entering={FadeIn.delay(200).duration(700)}>
            <MoonLogo />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.titleWrapper}
          >
            <Animated.Text style={[styles.title, titleGlowStyle]}>
              DreamDiary
            </Animated.Text>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(600).duration(600)}
            style={styles.subtitle}
          >
            Capture, understand, and explore{'\n'}your dreams
          </Animated.Text>
        </View>

        {/* ── Bottom CTA ── */}
        <Animated.View
          entering={FadeInUp.delay(900).duration(600)}
          style={styles.bottomSection}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('WakeTimePicker')}
            style={styles.getStartedWrapper}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <LinearGradient
              colors={['#7B5EA7', '#C084FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.getStartedGradient}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SignIn')}
            style={styles.signInLink}
            accessibilityRole="link"
            accessibilityLabel="Already have an account? Sign in"
          >
            <Text style={styles.signInLinkText}>
              Already have an account?{' '}
              <Text style={styles.signInLinkAccent}>Sign in</Text>
            </Text>
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
    justifyContent: 'space-between',
  },

  // Stars
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.accent,
  },
  logoEmoji: {
    fontSize: 88,
    textAlign: 'center',
    lineHeight: 100,
  },
  starsEmoji: {
    fontSize: 32,
    textAlign: 'center',
    marginTop: -16,
    marginLeft: 52,
  },

  // Center content
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  titleWrapper: {
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 46,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1.5,
    textAlign: 'center',
    // Purple glow — textShadow is controlled via Reanimated
    textShadowColor: COLORS.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontSize: 17,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.3,
    paddingHorizontal: 16,
  },

  // Bottom section
  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
    alignItems: 'center',
  },
  getStartedWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  getStartedGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  signInLink: {
    marginTop: 20,
    paddingVertical: 8,
  },
  signInLinkText: {
    fontSize: 15,
    color: COLORS.muted,
  },
  signInLinkAccent: {
    color: COLORS.accent,
    fontWeight: '600',
  },
});
