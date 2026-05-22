import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store';
import PremiumGate from '../../components/PremiumGate';
import { scheduleWakeUpNotification } from '../../services/notifications';
import * as Notifications from 'expo-notifications';

const COLORS = {
  background: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  gold: '#F59E0B',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  success: '#10B981',
};

const TECHNIQUES = [
  {
    id: 'mild',
    name: 'MILD',
    fullName: 'Mnemonic Induction of Lucid Dreams',
    difficulty: 'Beginner',
    difficultyColor: COLORS.success,
    icon: '💭',
    steps: [
      'Set an alarm for 5-6 hours after you fall asleep',
      'When you wake up, stay in bed and recall your dream in detail',
      'Tell yourself: "Next time I\'m dreaming, I will remember I\'m dreaming"',
      'Visualize yourself becoming lucid in the dream you just recalled',
      'Keep repeating the intention as you drift back to sleep',
      'Fall asleep while focusing on your intention to recognize the dream state',
    ],
    tip: 'Most effective when practiced during the final 2-3 hours of sleep when REM periods are longest.',
  },
  {
    id: 'wild',
    name: 'WILD',
    fullName: 'Wake-Initiated Lucid Dream',
    difficulty: 'Advanced',
    difficultyColor: '#F97316',
    icon: '🌀',
    steps: [
      'Wake up after 5-6 hours of sleep using an alarm',
      'Stay awake for 20-60 minutes doing calm activities (reading, light stretching)',
      'Return to bed in a comfortable position',
      'Keep your mind conscious as your body falls asleep',
      'Watch hypnagogic imagery (patterns, shapes) without engaging with them',
      'Allow sleep paralysis to pass without fear — you\'re entering the dream state directly',
      'Step into the forming dream scene while maintaining awareness',
    ],
    tip: 'Sleep paralysis is normal during WILD. Stay calm — it passes in seconds and you enter a vivid lucid dream.',
  },
];

const REALITY_CHECKS = [
  { id: 'hands', icon: '✋', name: 'Look at your hands', desc: 'In dreams, hands often appear blurry, have extra fingers, or shift when you look away and back.' },
  { id: 'text', icon: '📖', name: 'Read text twice', desc: 'Text in dreams almost always changes when you look at it a second time. Try a sign or book page.' },
  { id: 'clock', icon: '🕐', name: 'Check the time', desc: 'Clocks display random or impossible times in dreams. Look away, then look again — it will change.' },
  { id: 'nose', icon: '👃', name: 'Pinch your nose', desc: 'Pinch your nose shut and try to breathe through it. In dreams, you can still breathe!' },
  { id: 'light', icon: '💡', name: 'Try a light switch', desc: 'Light switches rarely work in dreams. Try flipping one — the light level won\'t change.' },
];

const SLEEP_TIPS = [
  'Record dreams immediately on waking — even 5 minutes later erases 50% of the memory.',
  'Consistent sleep and wake times dramatically increase dream recall.',
  'Vitamin B6 supplements (taken before bed) may increase dream vividness.',
  'Sleeping on your back tends to produce more vivid, memorable dreams.',
  'Avoid alcohol — it suppresses REM sleep and reduces dream activity.',
];

export default function LucidTrainerScreen() {
  const navigation = useNavigation();
  const user = useStore((s) => s.user);
  const dreams = useStore((s) => s.dreams);
  const [expandedTechnique, setExpandedTechnique] = useState(null);
  const [rcScheduled, setRcScheduled] = useState(false);

  const avgWakeHour = (() => {
    if (!user?.wake_time) return 7;
    const [h] = (user.wake_time || '07:00').split(':').map(Number);
    return h;
  })();

  const handleScheduleRC = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please enable notifications to schedule reality check reminders.');
      return;
    }
    // Schedule every 2 hours from 9am to 9pm
    const hours = [9, 11, 13, 15, 17, 19, 21];
    for (const hour of hours) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reality Check 🌀',
          body: REALITY_CHECKS[hours.indexOf(hour) % REALITY_CHECKS.length].name,
        },
        trigger: { hour, minute: 0, repeats: true },
      });
    }
    setRcScheduled(true);
    Alert.alert('Scheduled!', 'Reality check reminders set for every 2 hours (9am–9pm).');
  };

  const handleTechniqueReminder = async (technique) => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const wakeHour = avgWakeHour;
    const practiceHour = Math.max(0, wakeHour - 2);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${technique.name} Practice Time 🌙`,
        body: `Your ${technique.name} session is ready. Set your intention now.`,
      },
      trigger: { hour: practiceHour, minute: 0, repeats: true },
    });
    Alert.alert(
      'Reminder Set',
      `${technique.name} practice reminder set for ${practiceHour}:00 daily (2 hours before your usual wake time).`
    );
  };

  return (
    <PremiumGate featureName="Lucid Trainer">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lucid Trainer</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Intro */}
          <LinearGradient
            colors={['rgba(123,94,167,0.2)', 'transparent']}
            style={styles.introCard}
          >
            <Text style={styles.introText}>
              🌙 Master the art of lucid dreaming — where you become aware that you are dreaming and can shape your dream world.
            </Text>
          </LinearGradient>

          {/* Techniques */}
          <Text style={styles.sectionTitle}>Techniques</Text>
          {TECHNIQUES.map((t) => (
            <View key={t.id} style={styles.techniqueCard}>
              <TouchableOpacity
                onPress={() => setExpandedTechnique(expandedTechnique === t.id ? null : t.id)}
                activeOpacity={0.8}
              >
                <View style={styles.techniqueHeader}>
                  <Text style={styles.techniqueIcon}>{t.icon}</Text>
                  <View style={styles.techniqueTitleBlock}>
                    <Text style={styles.techniqueName}>{t.name}</Text>
                    <Text style={styles.techniqueFullName}>{t.fullName}</Text>
                  </View>
                  <View style={[styles.difficultyBadge, { borderColor: t.difficultyColor }]}>
                    <Text style={[styles.difficultyText, { color: t.difficultyColor }]}>
                      {t.difficulty}
                    </Text>
                  </View>
                  <Ionicons
                    name={expandedTechnique === t.id ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={COLORS.muted}
                  />
                </View>
              </TouchableOpacity>

              {expandedTechnique === t.id && (
                <View style={styles.techniqueBody}>
                  {t.steps.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                  <View style={styles.tipCard}>
                    <Ionicons name="bulb-outline" size={14} color={COLORS.gold} style={{ marginRight: 8 }} />
                    <Text style={styles.tipText}>{t.tip}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.reminderBtn}
                    onPress={() => handleTechniqueReminder(t)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="alarm-outline" size={16} color={COLORS.accent} />
                    <Text style={styles.reminderBtnText}>Set Practice Reminder</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {/* Reality Checks */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reality Checks</Text>
            <TouchableOpacity
              style={[styles.scheduleBtn, rcScheduled && styles.scheduleBtnDone]}
              onPress={handleScheduleRC}
              disabled={rcScheduled}
            >
              <Ionicons name={rcScheduled ? 'checkmark' : 'alarm-outline'} size={14} color={rcScheduled ? COLORS.success : COLORS.accent} />
              <Text style={[styles.scheduleBtnText, rcScheduled && { color: COLORS.success }]}>
                {rcScheduled ? 'Scheduled' : 'Schedule Reminders'}
              </Text>
            </TouchableOpacity>
          </View>

          {REALITY_CHECKS.map((rc) => (
            <View key={rc.id} style={styles.rcCard}>
              <Text style={styles.rcIcon}>{rc.icon}</Text>
              <View style={styles.rcBody}>
                <Text style={styles.rcName}>{rc.name}</Text>
                <Text style={styles.rcDesc}>{rc.desc}</Text>
              </View>
            </View>
          ))}

          {/* Sleep Cycle Tips */}
          <Text style={styles.sectionTitle}>Sleep Tips</Text>
          <View style={styles.tipsCard}>
            {SLEEP_TIPS.map((tip, i) => (
              <View key={i} style={[styles.tipRow, i < SLEEP_TIPS.length - 1 && styles.tipRowBorder]}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipRowText}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Dream timing insight */}
          {dreams.length > 0 && (
            <View style={styles.insightCard}>
              <Ionicons name="moon" size={16} color={COLORS.accent} style={{ marginBottom: 8 }} />
              <Text style={styles.insightTitle}>Your Optimal Window</Text>
              <Text style={styles.insightText}>
                Based on your wake time of {avgWakeHour}:00, your longest REM periods occur between{' '}
                {Math.max(0, avgWakeHour - 3)}:00 and {avgWakeHour}:00. This is the best time for MILD and WILD practice.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(123,94,167,0.2)',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16 },
  introCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.3)',
  },
  introText: { color: COLORS.text, fontSize: 14, lineHeight: 22 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scheduleBtnDone: { borderColor: COLORS.success },
  scheduleBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  techniqueCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.25)',
  },
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  techniqueIcon: { fontSize: 24 },
  techniqueTitleBlock: { flex: 1 },
  techniqueName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  techniqueFullName: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  difficultyBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  difficultyText: { fontSize: 11, fontWeight: '600' },
  techniqueBody: { borderTopWidth: 1, borderTopColor: 'rgba(123,94,167,0.2)', padding: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(192,132,252,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, color: COLORS.text, fontSize: 14, lineHeight: 21 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  tipText: { flex: 1, color: COLORS.gold, fontSize: 13, lineHeight: 19 },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
  },
  reminderBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  rcCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.2)',
  },
  rcIcon: { fontSize: 28, width: 36 },
  rcBody: { flex: 1 },
  rcName: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  rcDesc: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  tipsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.2)',
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  tipRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(123,94,167,0.15)' },
  tipBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent, marginTop: 7 },
  tipRowText: { flex: 1, color: COLORS.text, fontSize: 13, lineHeight: 20 },
  insightCard: {
    backgroundColor: 'rgba(123,94,167,0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.3)',
  },
  insightTitle: { color: COLORS.accent, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  insightText: { color: COLORS.text, fontSize: 13, lineHeight: 20 },
});
