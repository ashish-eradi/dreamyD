// =============================================================================
// DreamDiary — PremiumGate component
// =============================================================================
// Wraps premium-only content. When the user does not have premium:
//   • Renders children behind a BlurView overlay
//   • Shows a lock icon + upgrade CTA over the blur
//   • "Upgrade" button navigates to the Paywall screen
//
// Props:
//   children     {ReactNode}  — the content to gate
//   featureName  {string}     — human-readable feature name shown in the CTA
// =============================================================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../store';

// =============================================================================
// Color constants
// =============================================================================

const COLORS = {
  bg:      '#0D0D1A',
  card:    '#1A1A2E',
  primary: '#7B5EA7',
  accent:  '#C084FC',
  gold:    '#F59E0B',
  text:    '#F1F0FF',
  muted:   '#8B8BAE',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =============================================================================
// Component
// =============================================================================

export default function PremiumGate({ children, featureName = 'this feature' }) {
  const navigation  = useNavigation();
  const isPremium   = useDreamStore((s) => s.isPremium);

  // Premium users see content directly — no wrapper overhead
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {/* Underlying content (intentionally visible but blurred) */}
      <View style={styles.contentWrapper} pointerEvents="none">
        {children}
      </View>

      {/* Blur overlay */}
      <BlurView
        intensity={28}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Dark gradient at the centre to increase CTA contrast */}
      <LinearGradient
        colors={['transparent', 'rgba(13,13,26,0.65)', 'rgba(13,13,26,0.85)']}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Lock card */}
      <View style={styles.lockCard}>
        {/* Icon */}
        <View style={styles.lockIconContainer}>
          <LinearGradient
            colors={['#7B5EA7', '#C084FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockIconGradient}
          >
            <Ionicons name="lock-closed" size={28} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Headline */}
        <Text style={styles.lockTitle}>Premium Feature</Text>

        {/* Description */}
        <Text style={styles.lockSubtitle}>
          Upgrade to unlock{' '}
          <Text style={styles.featureName}>{featureName}</Text>
          {' '}and all premium features.
        </Text>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Paywall')}
          activeOpacity={0.88}
          style={styles.upgradeButtonWrapper}
          accessibilityRole="button"
          accessibilityLabel={`Upgrade to unlock ${featureName}`}
        >
          <LinearGradient
            colors={['#F59E0B', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeButtonGradient}
          >
            <Ionicons
              name="star"
              size={16}
              color="#0D0D1A"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary hint */}
        <Text style={styles.freeTrialHint}>7-day free trial available</Text>
      </View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  // The children are rendered at full opacity but pointer events are disabled
  contentWrapper: {
    flex: 1,
  },

  // ── Lock card ────────────────────────────────────────────────────────────────
  lockCard: {
    position: 'absolute',
    alignSelf: 'center',
    // Vertically centred in the container
    top: '50%',
    left: 20,
    right: 20,
    transform: [{ translateY: -120 }],
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(123, 94, 167, 0.4)',
    shadowColor: '#7B5EA7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },

  // ── Lock icon ────────────────────────────────────────────────────────────────
  lockIconContainer: {
    marginBottom: 16,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  lockIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Text ─────────────────────────────────────────────────────────────────────
  lockTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  lockSubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  featureName: {
    color: COLORS.accent,
    fontWeight: '600',
  },

  // ── CTA button ───────────────────────────────────────────────────────────────
  upgradeButtonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 12,
    width: '100%',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D1A',
    letterSpacing: 0.2,
  },

  // ── Free trial hint ──────────────────────────────────────────────────────────
  freeTrialHint: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
});
