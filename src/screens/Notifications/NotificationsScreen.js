import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { getProfile, updateProfile } from '../../services/supabase';
import {
  requestPermissions,
  scheduleWakeUpNotification,
  cancelWakeUpNotification,
} from '../../services/notifications';
import { COLORS } from '../../constants/theme';

// ─── Time picker data ─────────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

const REALITY_CHECK_TIMES = ['08:00', '11:00', '14:00', '17:00', '21:00'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parse24hTo12h(time24) {
  if (!time24) return { hour: '06', minute: '00', period: 'AM' };
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return {
    hour:   String(h).padStart(2, '0'),
    minute: m.padStart(2, '0').slice(0, 2),
    period,
  };
}

function format12hTo24h(hour, minute, period) {
  let h = parseInt(hour, 10);
  if (period === 'AM') { if (h === 12) h = 0; }
  else                 { if (h !== 12) h += 12; }
  return `${String(h).padStart(2, '0')}:${minute}:00`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function TimePicker({ hour, minute, period, onHour, onMinute, onPeriod }) {
  return (
    <View style={styles.pickerRow}>
      {/* Hours */}
      <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {HOURS.map(h => (
          <TouchableOpacity
            key={h}
            style={[styles.pickerItem, hour === h && styles.pickerItemActive]}
            onPress={() => onHour(h)}
          >
            <Text style={[styles.pickerItemText, hour === h && styles.pickerItemTextActive]}>{h}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.pickerColon}>:</Text>

      {/* Minutes */}
      <View style={styles.pickerCol}>
        {MINUTES.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.pickerItem, minute === m && styles.pickerItemActive]}
            onPress={() => onMinute(m)}
          >
            <Text style={[styles.pickerItemText, minute === m && styles.pickerItemTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AM/PM */}
      <View style={styles.pickerCol}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.pickerItem, period === p && styles.pickerItemActive]}
            onPress={() => onPeriod(p)}
          >
            <Text style={[styles.pickerItemText, period === p && styles.pickerItemTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── NotificationsScreen ──────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const user       = useDreamStore(s => s.user);

  const [wakeEnabled,    setWakeEnabled]    = useState(true);
  const [checksEnabled,  setChecksEnabled]  = useState(false);
  const [hour,           setHour]           = useState('06');
  const [minute,         setMinute]         = useState('00');
  const [period,         setPeriod]         = useState('AM');
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [permDenied,     setPermDenied]     = useState(false);

  // Load current settings from profile
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    getProfile(user.id)
      .then(profile => {
        if (profile?.wake_time) {
          const { hour: h, minute: m, period: p } = parse24hTo12h(profile.wake_time);
          setHour(h); setMinute(m); setPeriod(p);
          setWakeEnabled(true);
        } else {
          setWakeEnabled(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      if (wakeEnabled) {
        // Request permission if needed
        const granted = await requestPermissions();
        if (!granted) {
          setPermDenied(true);
          Alert.alert(
            'Notifications blocked',
            'Enable notifications for DreamDiary in your device Settings to receive wake-up reminders.',
          );
          setSaving(false);
          return;
        }
        setPermDenied(false);
        const time24 = format12hTo24h(hour, minute, period);
        await updateProfile(user.id, { wake_time: time24 });
        await scheduleWakeUpNotification(time24);
      } else {
        await updateProfile(user.id, { wake_time: null });
        await cancelWakeUpNotification();
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user?.id, wakeEnabled, hour, minute, period]);

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.ink3} />
      </View>
    );
  }

  const previewTime = `${hour}:${minute} ${period}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.circleBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Wake-up reminder ── */}
        <SectionLabel>WAKE-UP REMINDER</SectionLabel>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Morning reminder</Text>
              <Text style={styles.toggleSub}>
                {wakeEnabled
                  ? `Reminds you to record at ${previewTime}`
                  : 'Off — no morning reminder'}
              </Text>
            </View>
            <Switch
              value={wakeEnabled}
              onValueChange={setWakeEnabled}
              trackColor={{ false: COLORS.line2, true: COLORS.peach }}
              thumbColor="#fff"
            />
          </View>

          {wakeEnabled && (
            <>
              <View style={styles.divider} />
              <Text style={styles.fieldLabel}>WAKE TIME</Text>
              <TimePicker
                hour={hour}   onHour={setHour}
                minute={minute} onMinute={setMinute}
                period={period} onPeriod={setPeriod}
              />
            </>
          )}
        </View>

        {/* Notification preview */}
        {wakeEnabled && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>PREVIEW</Text>
            <View style={styles.notifRow}>
              <Text style={styles.notifApp}>DreamDiary · {previewTime}</Text>
              <Text style={styles.notifTitle}>☾ Good morning. What did you dream?</Text>
              <Text style={styles.notifBody}>Speak it before it dissolves — tap to record</Text>
            </View>
          </View>
        )}

        {/* ── Reality checks ── */}
        <SectionLabel>REALITY CHECKS</SectionLabel>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Reality check reminders</Text>
              <Text style={styles.toggleSub}>
                {checksEnabled
                  ? `5 reminders throughout the day`
                  : 'Off — no reality check prompts'}
              </Text>
            </View>
            <Switch
              value={checksEnabled}
              onValueChange={setChecksEnabled}
              trackColor={{ false: COLORS.line2, true: COLORS.peach }}
              thumbColor="#fff"
            />
          </View>

          {checksEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.timesGrid}>
                {REALITY_CHECK_TIMES.map(t => (
                  <View key={t} style={styles.timeChip}>
                    <Text style={styles.timeChipText}>{t}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.timesHint}>
                Each prompt asks: "Are you dreaming right now?"
              </Text>
            </>
          )}
        </View>

        {permDenied && (
          <Text style={styles.permError}>
            Notifications are blocked. Enable them in your device Settings app.
          </Text>
        )}

        {/* Save */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={COLORS.bg2} />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  headerTitle:   { fontSize: 15, fontWeight: '500', color: COLORS.ink },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 16,
  },

  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 18, marginBottom: 12,
  },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink, marginBottom: 2 },
  toggleSub:   { fontSize: 12, color: COLORS.ink3, lineHeight: 17 },

  divider: {
    height: 1, backgroundColor: COLORS.line,
    marginVertical: 16,
  },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
  },

  // Time picker
  pickerRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerScroll: { maxHeight: 192, flex: 1 },
  pickerCol:  { flex: 1 },
  pickerColon: { fontSize: 24, fontWeight: '600', color: COLORS.ink, paddingBottom: 4 },
  pickerItem: {
    height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, backgroundColor: COLORS.bg,
  },
  pickerItemActive:     { backgroundColor: COLORS.ink },
  pickerItemText:       { fontSize: 18, fontWeight: '500', color: COLORS.ink3 },
  pickerItemTextActive: { color: COLORS.bg2 },

  // Preview card
  previewCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 18, marginBottom: 12,
  },
  previewLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
  },
  notifRow: {
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 14,
  },
  notifApp:   { fontSize: 11, fontWeight: '600', color: COLORS.ink3, marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: COLORS.ink, marginBottom: 2 },
  notifBody:  { fontSize: 13, color: COLORS.ink2 },

  // Reality check times
  timesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12,
  },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line,
  },
  timeChipText: { fontSize: 13, fontWeight: '500', color: COLORS.ink2 },
  timesHint: { fontSize: 12, color: COLORS.ink3, lineHeight: 17 },

  permError: {
    fontSize: 12, color: '#c0392b',
    marginBottom: 12, lineHeight: 17,
  },

  saveBtn: {
    height: 52, borderRadius: 26, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.bg2 },
});
