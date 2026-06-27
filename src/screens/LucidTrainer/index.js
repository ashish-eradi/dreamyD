import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDreamStore } from '../../store';
import {
  requestPermissions,
  scheduleRealityCheckNotifications,
  cancelRealityCheckNotifications,
  areRealityChecksScheduled,
  scheduleWBTBNotification,
  cancelWBTBNotification,
} from '../../services/notifications';
import { COLORS } from '../../constants/theme';

const TECHNIQUES = [
  { k: 'MILD', n: 'M.I.L.D.', s: 'Mnemonic Induction of Lucid Dreams' },
  { k: 'WILD', n: 'W.I.L.D.', s: 'Wake-Initiated Lucid Dream' },
  { k: 'WBTB', n: 'W.B.T.B.', s: 'Wake-Back-To-Bed' },
];

const REALITY_TIMES = ['08:00', '11:00', '14:00', '17:00', '21:00'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayKey() {
  const d = new Date();
  return `@dreamdiary/rcDone_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function fmt12h(time24h) {
  if (!time24h) return '';
  const [h, m] = time24h.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Calculate WBTB alarm time: wakeTime minus 3 hours
function calcWBTBTime(wakeTime24h) {
  if (!wakeTime24h) return '04:00';
  const [h, m] = wakeTime24h.split(':').map(Number);
  let wbtbH = h - 3;
  if (wbtbH < 0) wbtbH += 24;
  return `${String(wbtbH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Calculate REM peak time: 75% through sleep session (assumed sleep onset 22:30)
function calcRemPeakTime(wakeTime24h) {
  if (!wakeTime24h) return '04:18 AM';
  const [wh, wm] = wakeTime24h.split(':').map(Number);
  const sleepStartMins = 22 * 60 + 30;
  let wakeTimeMins = wh * 60 + wm;
  if (wakeTimeMins < sleepStartMins) wakeTimeMins += 24 * 60;
  const sleepDuration = wakeTimeMins - sleepStartMins;
  const remMinsSinceMidnight = (sleepStartMins + sleepDuration * 0.75) % (24 * 60);
  const remH = Math.floor(remMinsSinceMidnight / 60);
  const remM = Math.floor(remMinsSinceMidnight % 60);
  return fmt12h(`${String(remH).padStart(2, '0')}:${String(remM).padStart(2, '0')}`);
}

// Position of REM peak within the bar (0.0–1.0) — always ~75%
const REM_PEAK_LEFT = '58%';
const REM_PEAK_WIDTH = '18%';

export default function LucidTrainerScreen() {
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const wakeTime    = useDreamStore(s => s.wakeTime);

  const [reminders,   setReminders]   = useState(false);
  const [doneChecks,  setDoneChecks]  = useState(new Set());
  const [alarmSet,    setAlarmSet]    = useState(false);
  const [tech,        setTech]        = useState('MILD');
  const [loading,     setLoading]     = useState(true);

  // Load persisted state on mount
  useEffect(() => {
    Promise.all([
      areRealityChecksScheduled(),
      AsyncStorage.getItem(todayKey()).catch(() => null),
    ]).then(([scheduled, stored]) => {
      setReminders(scheduled);
      if (stored) {
        try { setDoneChecks(new Set(JSON.parse(stored))); } catch {}
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggleReminders = useCallback(async (val) => {
    setReminders(val);
    if (val) {
      const granted = await requestPermissions();
      if (!granted) {
        setReminders(false);
        Alert.alert('Notifications blocked', 'Enable notifications for DreamDiary in your device Settings.');
        return;
      }
      await scheduleRealityCheckNotifications();
    } else {
      await cancelRealityCheckNotifications();
    }
  }, []);

  const handleCheckTap = useCallback(async (time) => {
    setDoneChecks(prev => {
      const next = new Set(prev);
      if (next.has(time)) next.delete(time); else next.add(time);
      AsyncStorage.setItem(todayKey(), JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const handleSetAlarm = useCallback(async () => {
    const wbtbTime = calcWBTBTime(wakeTime);
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert('Notifications blocked', 'Enable notifications in your device Settings.');
      return;
    }
    await scheduleWBTBNotification(wbtbTime);
    setAlarmSet(true);
    Alert.alert('Alarm set', `Wake-back-to-bed alarm set daily at ${fmt12h(wbtbTime)}.`);
  }, [wakeTime]);

  const completedChecks = doneChecks.size;
  const wbtbTime = calcWBTBTime(wakeTime);
  const remPeakTime = calcRemPeakTime(wakeTime);

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
        <Text style={styles.sub}>
          {completedChecks > 0
            ? `${completedChecks} of ${REALITY_TIMES.length} checks done today`
            : 'Train your awareness — start your checks'}
        </Text>
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
              <Text style={styles.rcSub}>{completedChecks} of {REALITY_TIMES.length} done today · tap to mark</Text>
            </View>
            <Switch
              value={reminders}
              onValueChange={handleToggleReminders}
              trackColor={{ false: COLORS.line2, true: COLORS.peach }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.rcGrid}>
            {REALITY_TIMES.map((t, i) => {
              const done = doneChecks.has(t);
              return (
                <TouchableOpacity key={t} style={styles.rcCell} onPress={() => handleCheckTap(t)} activeOpacity={0.7}>
                  <View style={[styles.rcBox, done && styles.rcBoxDone]}>
                    {done && <Text style={styles.rcCheck}>✓</Text>}
                  </View>
                  <Text style={styles.rcTime}>{t}</Text>
                </TouchableOpacity>
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
          <Text style={styles.cardSub}>
            Based on {wakeTime ? `your ${fmt12h(wakeTime)} wake time` : 'typical sleep patterns'}, REM peaks here.
          </Text>
          <View style={styles.remBar}>
            <LinearGradient
              colors={['#1c1733', '#4b3e94', '#1c1733']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.remPeak}>
              <LinearGradient
                colors={['rgba(245,216,150,0.5)', 'rgba(245,216,150,0.15)']}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
            <Text style={styles.remPeakLabel}>REM peak</Text>
            <Text style={styles.remPeakTime}>{remPeakTime}</Text>
            <Text style={styles.remStart}>11pm</Text>
            <Text style={styles.remEnd}>{wakeTime ? fmt12h(wakeTime) : '7am'}</Text>
          </View>
          <View style={{ height: 14 }} />
          <TouchableOpacity style={[styles.alarmBtn, alarmSet && styles.alarmBtnSet]} onPress={handleSetAlarm}>
            <Text style={styles.alarmBtnText}>
              {alarmSet
                ? `✓ Alarm set · ${fmt12h(wbtbTime)}`
                : `Set wake-back-to-bed alarm · ${fmt12h(wbtbTime)}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tonight's intention */}
        <View style={styles.intentionCard}>
          <LinearGradient
            colors={['#2a2350', '#4b3e94']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.intentionLabel}>TONIGHT'S INTENTION</Text>
          <Text style={styles.intentionText}>
            "Tonight, I will recognize{'\n'}that I am dreaming."
          </Text>
          <Text style={styles.intentionSub}>Whisper this 5× before sleep</Text>
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
  rcSub: { fontSize: 12, color: COLORS.ink3, marginTop: 2 },
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
  cardSub: { fontSize: 12, color: COLORS.ink3, marginBottom: 14 },
  remBar: {
    height: 56, borderRadius: 12, overflow: 'hidden', position: 'relative',
  },
  remPeak: {
    position: 'absolute', left: REM_PEAK_LEFT, width: REM_PEAK_WIDTH, top: 0, bottom: 0,
    overflow: 'hidden',
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f5d896',
  },
  remPeakLabel: {
    position: 'absolute', left: '60%', top: 6,
    fontSize: 9, fontWeight: '600', color: '#f5d896',
  },
  remPeakTime: {
    position: 'absolute', left: '60%', bottom: 6,
    fontFamily: 'Lora_500Medium', fontSize: 12, fontWeight: '500', color: '#f5d896',
  },
  remStart: {
    position: 'absolute', left: 8, bottom: 6,
    fontSize: 9, color: 'rgba(247,243,236,0.5)',
  },
  remEnd: {
    position: 'absolute', right: 8, bottom: 6,
    fontSize: 9, color: 'rgba(247,243,236,0.5)',
  },
  alarmBtn: {
    height: 52, borderRadius: 26, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  alarmBtnSet: { backgroundColor: COLORS.moss ?? '#7ea98a' },
  alarmBtnText: { fontSize: 14, fontWeight: '600', color: '#f5d896' },
  intentionCard: {
    padding: 22, borderRadius: 20, alignItems: 'center',
    overflow: 'hidden', position: 'relative', marginBottom: 14,
  },
  intentionLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(247,243,236,0.55)',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
  },
  intentionText: {
    fontFamily: 'Lora_500Medium', fontSize: 18, lineHeight: 26,
    color: '#f5d896', textAlign: 'center', marginBottom: 10,
  },
  intentionSub: { fontSize: 11.5, color: 'rgba(247,243,236,0.5)' },
});
