// =============================================================================
// DreamDiary — Paywall Screen
// Design: dark night gradient with stars, breathing moon, gold CTA
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../../store';

const FEATURES = [
  'Unlimited AI pattern analysis',
  'Visual dreamscape map',
  'Monthly insight reports (PDF)',
  'Lucid dream trainer + reality checks',
  'Semantic dream search',
  'Therapist export · HIPAA-friendly',
];

// ─── Star field ───────────────────────────────────────────────────────────────

const STARS = [
  { x:'8%',  y:'6%',  sz:2, delay:0    },
  { x:'22%', y:'3%',  sz:1, delay:600  },
  { x:'45%', y:'9%',  sz:2, delay:1200 },
  { x:'65%', y:'4%',  sz:1, delay:300  },
  { x:'82%', y:'12%', sz:2, delay:900  },
  { x:'93%', y:'22%', sz:1, delay:1500 },
  { x:'6%',  y:'30%', sz:1, delay:400  },
  { x:'88%', y:'40%', sz:2, delay:800  },
  { x:'15%', y:'55%', sz:1, delay:1100 },
  { x:'78%', y:'65%', sz:2, delay:200  },
  { x:'35%', y:'75%', sz:1, delay:1400 },
  { x:'55%', y:'85%', sz:2, delay:700  },
  { x:'70%', y:'90%', sz:1, delay:1000 },
  { x:'25%', y:'92%', sz:2, delay:500  },
  { x:'48%', y:'45%', sz:1, delay:1600 },
  { x:'90%', y:'75%', sz:1, delay:350  },
  { x:'12%', y:'80%', sz:2, delay:950  },
  { x:'60%', y:'20%', sz:1, delay:1250 },
  { x:'40%', y:'35%', sz:2, delay:650  },
  { x:'97%', y:'55%', sz:1, delay:1700 },
];

function Star({ x, y, sz, delay }) {
  const op = useSharedValue(0.2);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1,    { duration: 1400 }),
        withTiming(0.15, { duration: 1400 }),
      ), -1, false
    ));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View style={[style, {
      position: 'absolute', left: x, top: y,
      width: sz, height: sz, borderRadius: sz / 2,
      backgroundColor: '#ffffff',
    }]} />
  );
}

// ─── Breathing moon ───────────────────────────────────────────────────────────

function BreathingMoon() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2000 }),
        withTiming(0.92, { duration: 2000 }),
      ), -1, false
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[style, styles.moon]}>
      <LinearGradient
        colors={['#fff5d9', '#f0c876', '#c98f3d']}
        start={{ x: 0.32, y: 0.32 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// ─── PaywallScreen ────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const setPremium = useDreamStore(s => s.setPremium);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      setPremium(true);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Purchase failed', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Night sky background */}
      <LinearGradient
        colors={['#1c1733', '#2a2350', '#4b3e94']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {STARS.map((s, i) => <Star key={i} {...s} />)}
      </View>

      {/* Close */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BreathingMoon />

        <Text style={styles.headline}>
          The patterns are{'\n'}
          <Text style={styles.headlineAccent}>waiting for you.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Premium turns months of your dreams into a map of your inner life.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={handlePurchase}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading
            ? <ActivityIndicator color="#1c1733" />
            : <Text style={styles.ctaBtnText}>Try Premium · ₹179/month</Text>
          }
        </TouchableOpacity>
        <Text style={styles.legalText}>7-day free trial · Cancel anytime</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { alignItems: 'flex-end', paddingHorizontal: 20 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: '#f7f3ec' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: 20 },

  moon: {
    width: 64, height: 64, borderRadius: 32,
    overflow: 'hidden', marginBottom: 22,
    shadowColor: '#f5d896',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20,
    elevation: 8,
  },
  headline: {
    fontFamily: 'Lora_500Medium', fontSize: 32, fontWeight: '500',
    lineHeight: 40, color: '#f7f3ec', marginBottom: 14,
  },
  headlineAccent: { color: '#f5d896', fontStyle: 'italic' },
  subtitle: {
    fontSize: 14, lineHeight: 22,
    color: 'rgba(247,243,236,0.7)', marginBottom: 28,
  },

  features: { gap: 10 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(245,216,150,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 11, color: '#f5d896', fontWeight: '700' },
  featureText: { fontSize: 13.5, color: 'rgba(247,243,236,0.92)', fontWeight: '500' },

  footer: { paddingHorizontal: 20, paddingTop: 16 },
  ctaBtn: {
    height: 56, borderRadius: 28,
    backgroundColor: '#f5d896',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#f5d896',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20,
    elevation: 8,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '600', color: '#1c1733' },
  legalText: {
    textAlign: 'center', fontSize: 11.5,
    color: 'rgba(247,243,236,0.5)',
  },
});
