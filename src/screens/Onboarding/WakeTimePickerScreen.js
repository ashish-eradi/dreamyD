import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

export default function WakeTimePickerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [hour, setHour] = useState('06');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('AM');

  const handleContinue = () => {
    navigation.navigate('NotificationPermission', { wakeTime: `${hour}:${minute} ${period}` });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Back */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.dots}>
          {[0,1,2].map(i => (
            <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.titleSection}>
          <Text style={styles.glyph}>◔</Text>
          <Text style={styles.title}>When do you{'\n'}wake up?</Text>
          <Text style={styles.subtitle}>
            We'll remind you the moment you open your eyes — before the dream fades.
          </Text>
        </View>

        {/* Time picker */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>WAKE TIME</Text>
          <View style={styles.pickerRow}>
            {/* Hour */}
            <View style={styles.pickerCol}>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {HOURS.map(h => (
                  <TouchableOpacity key={h} style={[styles.pickerItem, hour === h && styles.pickerItemActive]} onPress={() => setHour(h)}>
                    <Text style={[styles.pickerItemText, hour === h && styles.pickerItemTextActive]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.pickerColon}>:</Text>

            {/* Minute */}
            <View style={styles.pickerCol}>
              {MINUTES.map(m => (
                <TouchableOpacity key={m} style={[styles.pickerItem, minute === m && styles.pickerItemActive]} onPress={() => setMinute(m)}>
                  <Text style={[styles.pickerItemText, minute === m && styles.pickerItemTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* AM/PM */}
            <View style={styles.pickerCol}>
              {PERIODS.map(p => (
                <TouchableOpacity key={p} style={[styles.pickerItem, period === p && styles.pickerItemActive]} onPress={() => setPeriod(p)}>
                  <Text style={[styles.pickerItemText, period === p && styles.pickerItemTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Preview notification */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>PREVIEW</Text>
          <View style={styles.notifRow}>
            <Text style={styles.notifTitle}>DreamDiary · {hour}:{minute} {period}</Text>
            <Text style={styles.notifBody}>☾ Good morning. What did you dream?</Text>
            <Text style={styles.notifSub}>Speak it before it dissolves — tap to record</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 16, color: COLORS.ink },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(42,38,34,0.2)' },
  dotActive: { width: 24, backgroundColor: COLORS.ink },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  titleSection: { paddingTop: 28, paddingBottom: 28 },
  glyph: { fontSize: 48, color: COLORS.ink, marginBottom: 16 },
  title: {
    fontFamily: 'Lora_500Medium', fontSize: 32, fontWeight: '500',
    lineHeight: 38, color: COLORS.ink, marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 16, lineHeight: 24, color: COLORS.ink2,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerCol: { flex: 1 },
  pickerScroll: { maxHeight: 180 },
  pickerColon: {
    fontSize: 28, fontWeight: '600', color: COLORS.ink,
    textAlign: 'center', paddingBottom: 4,
  },
  pickerItem: {
    height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, backgroundColor: COLORS.bg,
  },
  pickerItemActive: { backgroundColor: COLORS.ink },
  pickerItemText: { fontSize: 20, fontWeight: '500', color: COLORS.ink3 },
  pickerItemTextActive: { color: COLORS.bg2 },
  previewCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 24,
  },
  previewLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
  },
  notifRow: {
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 14,
  },
  notifTitle: { fontSize: 12, fontWeight: '600', color: COLORS.ink, marginBottom: 4 },
  notifBody: { fontSize: 15, fontWeight: '600', color: COLORS.ink, marginBottom: 2 },
  notifSub: { fontSize: 13, color: COLORS.ink3 },
  ctaBtn: {
    height: 56, borderRadius: 28, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnText: { fontSize: 17, fontWeight: '600', color: COLORS.bg2 },
});
