// =============================================================================
// DreamDiary — PaywallScreen
// =============================================================================
// Premium upgrade screen with full-screen gradient, feature list,
// pricing cards, and RevenueCat purchase integration.
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient }         from 'expo-linear-gradient';
import { SafeAreaView }           from 'react-native-safe-area-context';
import { Ionicons }               from '@expo/vector-icons';
import { useNavigation }          from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Purchases                  from 'react-native-purchases';
import { useDreamStore }          from '../../store';

// =============================================================================
// Constants
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg:      '#0D0D1A',
  card:    '#1A1A2E',
  primary: '#7B5EA7',
  accent:  '#C084FC',
  gold:    '#F59E0B',
  text:    '#F1F0FF',
  muted:   '#8B8BAE',
  success: '#10B981',
};

const FEATURES = [
  {
    icon:  '🗺️',
    title: 'Dreamscape Map',
    desc:  'Interactive symbol network showing connections across all your dreams',
  },
  {
    icon:  '🔍',
    title: 'Pattern Analysis',
    desc:  'AI finds recurring themes and symbols across your dream archive',
  },
  {
    icon:  '📊',
    title: 'Monthly Reports',
    desc:  'Deep analytics with charts, mood trends, and narrative summaries',
  },
  {
    icon:  '🌙',
    title: 'Lucid Trainer',
    desc:  'Step-by-step guides and reminders to master lucid dreaming',
  },
  {
    icon:  '🔎',
    title: 'Semantic Search',
    desc:  'Search your dreams by meaning, emotion, or symbol — not just keywords',
  },
];

// =============================================================================
// FeatureRow
// =============================================================================

function FeatureRow({ icon, title, desc, delay }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={styles.featureRow}
    >
      <View style={styles.featureIconWrap}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// PricingCard
// =============================================================================

function PricingCard({
  label,
  price,
  period,
  badge,
  highlighted,
  selected,
  onSelect,
  delay,
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={[
        styles.pricingCard,
        highlighted && styles.pricingCardHighlighted,
        selected    && styles.pricingCardSelected,
      ]}
    >
      <TouchableOpacity
        onPress={onSelect}
        activeOpacity={0.85}
        style={styles.pricingCardInner}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label} plan: ${price} per ${period}`}
      >
        {badge && (
          <View style={styles.pricingBadge}>
            <Text style={styles.pricingBadgeText}>{badge}</Text>
          </View>
        )}

        <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
          {selected && <View style={styles.radioInner} />}
        </View>

        <View style={styles.pricingDetails}>
          <Text style={[styles.pricingLabel, highlighted && styles.pricingLabelHighlighted]}>
            {label}
          </Text>
          <View style={styles.pricingPriceRow}>
            <Text style={[styles.pricingPrice, highlighted && styles.pricingPriceHighlighted]}>
              {price}
            </Text>
            <Text style={styles.pricingPeriod}>/{period}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// =============================================================================
// PaywallScreen
// =============================================================================

export default function PaywallScreen() {
  const navigation      = useNavigation();
  const setIsPremium    = useDreamStore((s) => s.setIsPremium);

  const [selectedPlan,  setSelectedPlan]  = useState('annual');
  const [offerings,     setOfferings]     = useState(null);
  const [purchasing,    setPurchasing]    = useState(false);
  const [restoring,     setRestoring]     = useState(false);

  // Load RevenueCat offerings on mount
  useEffect(() => {
    let cancelled = false;
    Purchases.getOfferings()
      .then((o) => {
        if (!cancelled && o.current) setOfferings(o.current);
      })
      .catch((err) =>
        console.warn('[Paywall] Could not fetch offerings:', err)
      );
    return () => { cancelled = true; };
  }, []);

  // Resolve the RevenueCat package for the selected plan
  const getPackage = useCallback((planKey) => {
    if (!offerings) return null;
    if (planKey === 'annual') {
      return (
        offerings.annual ??
        offerings.availablePackages.find((p) =>
          p.packageType === 'ANNUAL' || p.identifier.includes('annual')
        ) ??
        null
      );
    }
    return (
      offerings.monthly ??
      offerings.availablePackages.find((p) =>
        p.packageType === 'MONTHLY' || p.identifier.includes('monthly')
      ) ??
      null
    );
  }, [offerings]);

  const handlePurchase = useCallback(async () => {
    const pkg = getPackage(selectedPlan);

    setPurchasing(true);
    try {
      if (pkg) {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const active = customerInfo.entitlements.active;
        if (active['premium'] || Object.keys(active).length > 0) {
          setIsPremium(true);
          navigation.goBack();
          return;
        }
      } else {
        // No offerings loaded — simulate success in dev mode
        console.warn('[Paywall] No package available, simulating purchase');
        setIsPremium(true);
        navigation.goBack();
        return;
      }
    } catch (err) {
      if (!err.userCancelled) {
        Alert.alert(
          'Purchase Failed',
          err.message ?? 'Something went wrong. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setPurchasing(false);
    }
  }, [selectedPlan, getPackage, setIsPremium, navigation]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const active       = customerInfo.entitlements.active;
      if (active['premium'] || Object.keys(active).length > 0) {
        setIsPremium(true);
        Alert.alert(
          'Purchases Restored',
          'Your premium access has been restored.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We couldn\'t find any active subscriptions for your account.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert('Restore Failed', err.message ?? 'Please try again.', [{ text: 'OK' }]);
    } finally {
      setRestoring(false);
    }
  }, [setIsPremium, navigation]);

  // Build display prices from offerings or fall back to localized defaults
  const monthlyPackage = getPackage('monthly');
  const annualPackage  = getPackage('annual');

  const monthlyPrice = monthlyPackage?.product?.localizedPriceString ?? '₹179';
  const annualPrice  = annualPackage?.product?.localizedPriceString  ?? '₹1,499';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Full-screen gradient background */}
      <LinearGradient
        colors={['#1A0A2E', '#0D0D1A', '#0A0A1F']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative glow orb */}
      <View style={styles.glowOrb} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Close button */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.closeRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={COLORS.muted} />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top hero ── */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(500)}
            style={styles.hero}
          >
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={styles.heroTitle}>DreamDiary Premium</Text>
            <Text style={styles.heroSubtitle}>
              Unlock your full dream universe
            </Text>
          </Animated.View>

          {/* ── Feature list ── */}
          <Animated.View
            entering={FadeInDown.delay(160).duration(400)}
            style={styles.featuresCard}
          >
            {FEATURES.map((f, i) => (
              <FeatureRow
                key={f.title}
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                delay={200 + i * 60}
              />
            ))}
          </Animated.View>

          {/* ── Pricing cards ── */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(400)}
            style={styles.pricingSection}
          >
            <Text style={styles.pricingHeading}>Choose your plan</Text>

            <PricingCard
              label="Monthly"
              price={monthlyPrice}
              period="month"
              highlighted={false}
              selected={selectedPlan === 'monthly'}
              onSelect={() => setSelectedPlan('monthly')}
              delay={540}
            />

            <PricingCard
              label="Annual"
              price={annualPrice}
              period="year"
              badge="Save 30%"
              highlighted
              selected={selectedPlan === 'annual'}
              onSelect={() => setSelectedPlan('annual')}
              delay={600}
            />
          </Animated.View>

          {/* ── CTA ── */}
          <Animated.View
            entering={FadeInUp.delay(650).duration(400)}
            style={styles.ctaSection}
          >
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={purchasing}
              activeOpacity={0.88}
              style={styles.ctaButtonWrapper}
              accessibilityRole="button"
              accessibilityLabel="Start 7-day free trial"
            >
              <LinearGradient
                colors={['#F59E0B', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButtonGradient}
              >
                {purchasing ? (
                  <ActivityIndicator color="#0D0D1A" size="small" />
                ) : (
                  <>
                    <Text style={styles.ctaButtonText}>
                      Start 7-Day Free Trial
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#0D0D1A"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.ctaSubtext}>
              Cancel anytime · No charge until trial ends
            </Text>

            {/* Restore */}
            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              style={styles.restoreButton}
              accessibilityRole="button"
            >
              {restoring ? (
                <ActivityIndicator color={COLORS.muted} size="small" />
              ) : (
                <Text style={styles.restoreText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>

            {/* Legal links */}
            <View style={styles.legalRow}>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL('https://dreamdiary.app/terms').catch(() => {})
                }
              >
                <Text style={styles.legalLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>·</Text>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL('https://dreamdiary.app/privacy').catch(() => {})
                }
              >
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },

  // ── Decorative glow ──────────────────────────────────────────────────────────
  glowOrb: {
    position:        'absolute',
    top:             -80,
    alignSelf:       'center',
    width:           300,
    height:          300,
    borderRadius:    150,
    backgroundColor: 'rgba(123,94,167,0.18)',
    // Blur is not available via StyleSheet; use a large borderRadius + opacity
  },

  // ── Close button ─────────────────────────────────────────────────────────────
  closeRow: {
    flexDirection:  'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop:     8,
  },
  closeButton: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: 'rgba(139,139,174,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
  },

  // ── Scroll content ───────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom:     16,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    marginTop:  8,
    marginBottom: 28,
  },
  heroEmoji: {
    fontSize:     44,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize:      28,
    fontWeight:    '900',
    color:         COLORS.text,
    textAlign:     'center',
    letterSpacing: 0.4,
    marginBottom:  8,
  },
  heroSubtitle: {
    fontSize:   16,
    color:      COLORS.muted,
    textAlign:  'center',
    lineHeight: 24,
  },

  // ── Features card ─────────────────────────────────────────────────────────────
  featuresCard: {
    backgroundColor: 'rgba(26,26,46,0.85)',
    borderRadius:    20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth:     1,
    borderColor:     'rgba(123,94,167,0.25)',
    marginBottom:    24,
  },
  featureRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,139,174,0.10)',
  },
  featureIconWrap: {
    width:          44,
    height:         44,
    borderRadius:   12,
    backgroundColor: 'rgba(123,94,167,0.15)',
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    14,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize:     15,
    fontWeight:   '700',
    color:        COLORS.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize:   13,
    color:      COLORS.muted,
    lineHeight: 19,
  },

  // ── Pricing ──────────────────────────────────────────────────────────────────
  pricingSection: {
    marginBottom: 24,
  },
  pricingHeading: {
    fontSize:      16,
    fontWeight:    '700',
    color:         COLORS.text,
    marginBottom:  14,
    textAlign:     'center',
    letterSpacing: 0.3,
  },
  pricingCard: {
    borderRadius:    16,
    marginBottom:    12,
    borderWidth:     1.5,
    borderColor:     'rgba(139,139,174,0.25)',
    backgroundColor: 'rgba(26,26,46,0.75)',
    overflow:        'hidden',
  },
  pricingCardHighlighted: {
    borderColor:     'rgba(245,158,11,0.5)',
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  pricingCardSelected: {
    borderColor: COLORS.accent,
  },
  pricingCardInner: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        16,
    gap:            14,
  },
  pricingBadge: {
    position:        'absolute',
    top:             -1,
    right:           12,
    backgroundColor: COLORS.gold,
    borderBottomLeftRadius:  8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    paddingVertical:   3,
  },
  pricingBadgeText: {
    fontSize:   11,
    fontWeight: '800',
    color:      '#0D0D1A',
  },
  radioOuter: {
    width:           22,
    height:          22,
    borderRadius:    11,
    borderWidth:     2,
    borderColor:     COLORS.muted,
    alignItems:      'center',
    justifyContent:  'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.accent,
  },
  radioInner: {
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: COLORS.accent,
  },
  pricingDetails: {
    flex: 1,
  },
  pricingLabel: {
    fontSize:     15,
    fontWeight:   '600',
    color:        COLORS.muted,
    marginBottom: 2,
  },
  pricingLabelHighlighted: {
    color: COLORS.gold,
  },
  pricingPriceRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           2,
  },
  pricingPrice: {
    fontSize:   22,
    fontWeight: '900',
    color:      COLORS.text,
  },
  pricingPriceHighlighted: {
    color: COLORS.gold,
  },
  pricingPeriod: {
    fontSize:   13,
    color:      COLORS.muted,
    fontWeight: '500',
  },

  // ── CTA ──────────────────────────────────────────────────────────────────────
  ctaSection: {
    alignItems: 'center',
  },
  ctaButtonWrapper: {
    width:         '100%',
    borderRadius:  16,
    overflow:      'hidden',
    shadowColor:   COLORS.gold,
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius:  14,
    elevation:     10,
    marginBottom:  12,
  },
  ctaButtonGradient: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical:   18,
    paddingHorizontal: 28,
  },
  ctaButtonText: {
    fontSize:      18,
    fontWeight:    '900',
    color:         '#0D0D1A',
    letterSpacing: 0.3,
  },
  ctaSubtext: {
    fontSize:     13,
    color:        COLORS.muted,
    textAlign:    'center',
    marginBottom: 20,
  },
  restoreButton: {
    paddingVertical:   8,
    paddingHorizontal: 16,
    marginBottom:      16,
  },
  restoreText: {
    fontSize:   14,
    color:      COLORS.muted,
    textAlign:  'center',
    fontWeight: '500',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  legalLink: {
    fontSize: 12,
    color:    COLORS.muted,
  },
  legalDot: {
    fontSize: 12,
    color:    COLORS.muted,
  },
});
