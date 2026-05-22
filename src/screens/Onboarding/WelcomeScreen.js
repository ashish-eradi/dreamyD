import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';

const PANELS = [
  {
    glyph: '☾',
    title: 'Speak it before\nit dissolves.',
    body: 'You forget 90% of a dream within ten minutes. We listen, transcribe, and tag what recurs.',
    gradient: ['#fde8dc', '#f5e8d4'],
  },
  {
    glyph: '✦',
    title: 'Symbols become\na map.',
    body: 'Water, falling, the same stranger. Across months, we chart what your sleeping mind keeps returning to.',
    gradient: ['#efe4f1', '#e4ecf5'],
  },
  {
    glyph: '☀',
    title: 'Patterns emerge\nafter ten.',
    body: 'Once you log ten entries, we begin to read forward — what your dreams predict, what triggers what.',
    gradient: ['#e3eee2', '#f5e8d4'],
  },
];

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const p = PANELS[step];
  const isLast = step === PANELS.length - 1;

  const handleContinue = () => {
    if (isLast) {
      navigation.navigate('WakeTimePicker');
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <LinearGradient
      colors={p.gradient}
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.stepLabel}>{step + 1} of {PANELS.length}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WakeTimePicker')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.glyph}>{p.glyph}</Text>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.body}>{p.body}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {PANELS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>
            {isLast ? 'Open the journal' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 28, paddingTop: 8, paddingBottom: 0,
  },
  stepLabel: { fontSize: 13, color: COLORS.ink2, fontWeight: '500' },
  skipText: { fontSize: 14, color: COLORS.ink2, fontWeight: '500' },
  content: {
    flex: 1, paddingHorizontal: 28, justifyContent: 'flex-end', paddingBottom: 32,
  },
  glyph: {
    fontFamily: 'Lora_400Regular', fontSize: 80, color: COLORS.ink,
    lineHeight: 90, marginBottom: 32,
  },
  title: {
    fontFamily: 'Lora_500Medium', fontSize: 32, fontWeight: '500',
    lineHeight: 38, color: COLORS.ink, marginBottom: 14,
  },
  body: {
    fontFamily: 'Lora_400Regular', fontSize: 17, lineHeight: 26, color: COLORS.ink2,
  },
  footer: { paddingHorizontal: 28, paddingBottom: 16 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 32, backgroundColor: COLORS.ink },
  dotInactive: { width: 8, backgroundColor: 'rgba(42,38,34,0.2)' },
  ctaBtn: {
    height: 56, borderRadius: 28, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnText: { fontSize: 17, fontWeight: '600', color: COLORS.bg2 },
});
