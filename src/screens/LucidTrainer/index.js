import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';

const TECHNIQUES = [
  { k: 'MILD', n: 'M.I.L.D.', s: 'Mnemonic Induction of Lucid Dreams' },
  { k: 'WILD', n: 'W.I.L.D.', s: 'Wake-Initiated Lucid Dream' },
  { k: 'WBTB', n: 'W.B.T.B.', s: 'Wake-Back-To-Bed' },
];

const REALITY_TIMES = ['08:00', '11:00', '14:00', '17:00', '21:00'];

export default function LucidTrainerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState(true);
  const [tech, setTech] = useState('MILD');

  const completedChecks = 2;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.circleBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lucid trainer</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sub}>2 lucid this month · onset 4:12 AM</Text>
        <Text style={styles.pageTitle}>Lucid trainer</Text>

        {/* Intro */}
        <View style={styles.card}>
          <Text style={styles.introText}>
            To wake inside the dream, you must first teach yourself to ask:{' '}
            <Text style={{ fontStyle: 'italic' }}>am I dreaming now?</Text>
          </Text>
        </View>

        {/* Reality checks */}
        <View style={styles.card}>
          <View style={styles.rcHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rcTitle}>Reality checks</Text>
              <Text style={styles.rcSub}>{completedChecks} of {REALITY_TIMES.length} done today</Text>
            </View>
            <Switch
              value={reminders}
              onValueChange={setReminders}
              trackColor={{ false: COLORS.line2, true: COLORS.peach }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.rcGrid}>
            {REALITY_TIMES.map((t, i) => {
              const done = i < completedChecks;
              return (
                <View key={i} style={styles.rcCell}>
                  <View style={[styles.rcBox, done && styles.rcBoxDone]}>
                    {done && <Text style={styles.rcCheck}>✓</Text>}
                  </View>
                  <Text style={styles.rcTime}>{t}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Technique selector */}
        <Text style={styles.sectionLabel}>TECHNIQUE</Text>
        <View style={styles.techniqueList}>
          {TECHNIQUES.map(t => {
            const active = tech === t.k;
            return (
              <TouchableOpacity
                key={t.k}
                style={[styles.techBtn, active && styles.techBtnActive]}
                onPress={() => setTech(t.k)}
                activeOpacity={0.8}
              >
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.techName}>{t.n}</Text>
                  <Text style={styles.techSub}>{t.s}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* REM window */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>TONIGHT'S REM WINDOW</Text>
          <View style={styles.remBar}>
            <View style={styles.remPeak} />
            <Text style={styles.remPeakLabel}>REM PEAK</Text>
            <Text style={styles.remPeakTime}>4:18 AM</Text>
            <Text style={styles.remStart}>23:00</Text>
            <Text style={styles.remEnd}>07:00</Text>
          </View>
          <View style={{ height: 16 }} />
          <TouchableOpacity style={styles.alarmBtn}>
            <Text style={styles.alarmBtnText}>Set wake alarm · 4:00 AM</Text>
          </TouchableOpacity>
        </View>

        {/* Tonight's intention */}
        <View style={styles.intentionCard}>
          <Text style={styles.intentionLabel}>TONIGHT'S INTENTION</Text>
          <Text style={styles.intentionText}>
            "Tonight, I will recognize{'\n'}that I am dreaming."
          </Text>
          <Text style={styles.intentionSub}>Whisper 5× before sleep</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  circleBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnText: { fontSize: 16, color: COLORS.ink },
  headerTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sub: { fontSize: 13, color: COLORS.ink3, marginBottom: 4 },
  pageTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 14,
  },
  introText: {
    fontFamily: 'Lora_400Regular', fontSize: 17, lineHeight: 26, color: COLORS.ink,
  },
  rcHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rcTitle: { fontSize: 16, fontWeight: '500', color: COLORS.ink },
  rcSub: { fontSize: 13, color: COLORS.ink3, marginTop: 2 },
  rcGrid: { flexDirection: 'row', gap: 6 },
  rcCell: { flex: 1, alignItems: 'center' },
  rcBox: {
    height: 38, width: '100%', borderRadius: 10,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  rcBoxDone: { backgroundColor: COLORS.peach2, borderColor: COLORS.peach },
  rcCheck: { fontSize: 14, color: COLORS.peach, fontWeight: '700' },
  rcTime: { fontSize: 11, color: COLORS.ink3, marginTop: 4 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.ink2,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10,
  },
  techniqueList: { gap: 8, marginBottom: 14 },
  techBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
  },
  techBtnActive: { backgroundColor: COLORS.peach2, borderColor: COLORS.peach },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.line2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: COLORS.peach, backgroundColor: COLORS.peach },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  techName: { fontFamily: 'Lora_500Medium', fontSize: 17, fontWeight: '500', color: COLORS.ink },
  techSub: { fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  remBar: {
    height: 56, borderRadius: 12, overflow: 'hidden',
    backgroundColor: COLORS.sky2, position: 'relative',
  },
  remPeak: {
    position: 'absolute', left: '58%', width: '18%', top: 0, bottom: 0,
    backgroundColor: 'rgba(244,165,133,0.4)',
    borderLeftWidth: 2, borderRightWidth: 2, borderColor: COLORS.peach,
  },
  remPeakLabel: {
    position: 'absolute', left: '59%', top: 6,
    fontSize: 10, fontWeight: '600', color: COLORS.ink,
  },
  remPeakTime: {
    position: 'absolute', left: '60%', bottom: 6,
    fontFamily: 'Lora_500Medium', fontSize: 13, fontWeight: '500', color: COLORS.ink,
  },
  remStart: { position: 'absolute', left: 8, bottom: 6, fontSize: 10, color: COLORS.ink2 },
  remEnd: { position: 'absolute', right: 8, bottom: 6, fontSize: 10, color: COLORS.ink2 },
  alarmBtn: {
    height: 52, borderRadius: 26, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  alarmBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.bg2 },
  intentionCard: {
    padding: 24, borderRadius: 20, alignItems: 'center',
    backgroundColor: COLORS.plum2,
  },
  intentionLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.ink2,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
  },
  intentionText: {
    fontFamily: 'Lora_500Medium', fontSize: 22, lineHeight: 30,
    color: COLORS.ink, textAlign: 'center', marginBottom: 14,
  },
  intentionSub: { fontSize: 12, color: COLORS.ink3 },
});
