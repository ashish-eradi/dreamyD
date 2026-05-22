import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { COLORS } from '../../constants/theme';

const FEATURES = [
  'Unlimited pattern analysis',
  'Visual symbol map',
  'Monthly insight reports',
  'Lucid dream trainer',
  'Semantic dream search',
  'Therapist export · HIPAA-friendly',
];

export default function PaywallScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
    <LinearGradient
      colors={['#fde8dc', '#f5e8d4']}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>DreamDiary Premium</Text>
        <Text style={styles.headline}>The patterns are{'\n'}<Text style={{ color: COLORS.peach }}>waiting for you.</Text></Text>
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
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaBtnText}>Begin · ₹179/month</Text>
          }
        </TouchableOpacity>
        <Text style={styles.legalText}>7-day free trial · cancel anytime</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 8 },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: COLORS.ink },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingTop: 28, paddingBottom: 20 },
  eyebrow: {
    fontSize: 12, fontWeight: '700', color: COLORS.peach,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14,
  },
  headline: {
    fontFamily: 'Lora_500Medium', fontSize: 36, fontWeight: '500',
    lineHeight: 42, color: COLORS.ink, marginBottom: 14,
  },
  subtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 16, lineHeight: 24,
    color: COLORS.ink2, marginBottom: 28,
  },
  features: { gap: 10 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.peach,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 12, color: '#fff', fontWeight: '700' },
  featureText: { fontSize: 15, color: COLORS.ink, fontWeight: '500' },
  footer: { paddingHorizontal: 24, paddingTop: 16 },
  ctaBtn: {
    height: 56, borderRadius: 28, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  ctaBtnText: { fontSize: 17, fontWeight: '600', color: COLORS.bg2 },
  legalText: { textAlign: 'center', fontSize: 12, color: COLORS.ink3 },
});
