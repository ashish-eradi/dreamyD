// =============================================================================
// DreamDiary — Me / Settings Screen
// Design: Monthly insight report layout from DreamDiary.html prototype
// Sections: month header, 3-col stats, emotional arc, recurring symbols,
//           AI patterns, profile + settings rows, sign out
// =============================================================================

import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { signOut } from '../../services/supabase';
import { COLORS } from '../../constants/theme';

// ─── Mood colours from design ─────────────────────────────────────────────────

const MOOD_COLORS = {
  joy:    '#e8c97a',
  calm:   '#9ec5b8',
  fear:   '#b29ad2',
  melan:  '#92a8c9',
  wonder: '#b9a8e4',
};
const MOOD_LABELS = {
  joy: 'Joy', calm: 'Calm', wonder: 'Wonder', melan: 'Tender', fear: 'Anxious',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getDreamsThisMonth(dreams) {
  const now = new Date();
  return dreams.filter(d => {
    const dt = new Date(d.recorded_at ?? d.created_at);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });
}

function getTopMoodLabel(dreams) {
  const counts = {};
  dreams.forEach(d => {
    (d.dream_tags ?? []).forEach(t => {
      if (t.type === 'emotion') counts[t.label] = (counts[t.label] || 0) + 1;
    });
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? (MOOD_LABELS[top[0]] ?? top[0]) : 'wonder';
}

function getTopSymbols(dreams) {
  const counts = {};
  dreams.forEach(d => {
    (d.dream_tags ?? []).forEach(t => {
      if (t.type === 'symbol' && t.label) {
        counts[t.label] = (counts[t.label] || 0) + 1;
      }
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function getMoodWeeks(dreams) {
  const now = new Date();
  const weeks = [
    { d: 'W1', joy: 0, calm: 0, fear: 0, melan: 0, wonder: 0 },
    { d: 'W2', joy: 0, calm: 0, fear: 0, melan: 0, wonder: 0 },
    { d: 'W3', joy: 0, calm: 0, fear: 0, melan: 0, wonder: 0 },
    { d: 'W4', joy: 0, calm: 0, fear: 0, melan: 0, wonder: 0 },
  ];
  dreams.forEach(d => {
    const dt = new Date(d.recorded_at ?? d.created_at);
    if (dt.getMonth() !== now.getMonth()) return;
    const weekIdx = Math.min(3, Math.floor((dt.getDate() - 1) / 7));
    (d.dream_tags ?? []).forEach(t => {
      if (t.type === 'emotion' && weeks[weekIdx][t.label] !== undefined) {
        weeks[weekIdx][t.label] += 1;
      }
    });
  });
  return weeks;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── EmotionalArc ─────────────────────────────────────────────────────────────

function EmotionalArc({ weeks }) {
  const maxBar = Math.max(1,
    ...weeks.flatMap(w =>
      ['joy','calm','wonder','melan','fear'].map(m => w[m])
    )
  );
  const moods = ['joy','calm','wonder','melan','fear'];

  return (
    <View style={styles.card}>
      <View style={styles.arcHeader}>
        <Text style={styles.cardTitle}>Emotional arc</Text>
        <Text style={styles.arcSub}>by week</Text>
      </View>

      {/* Bar chart */}
      <View style={styles.arcChart}>
        {weeks.map(w => (
          <View key={w.d} style={styles.arcWeek}>
            <View style={styles.arcBars}>
              {moods.map(m => {
                const h = w[m] > 0 ? Math.max(3, (w[m] / maxBar) * 90) : 0;
                return (
                  <View
                    key={m}
                    style={[styles.arcBar, { height: h, backgroundColor: MOOD_COLORS[m] }]}
                  />
                );
              })}
            </View>
            <Text style={styles.arcWeekLabel}>{w.d}</Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.arcLegend}>
        {moods.map(m => (
          <View key={m} style={styles.arcLegendItem}>
            <View style={[styles.arcLegendDot, { backgroundColor: MOOD_COLORS[m] }]} />
            <Text style={styles.arcLegendText}>{MOOD_LABELS[m]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── RecurringSymbols ─────────────────────────────────────────────────────────

function RecurringSymbols({ symbols }) {
  const max = symbols[0]?.count || 1;
  return (
    <View style={styles.card}>
      <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Recurring symbols</Text>
      {symbols.length === 0 && (
        <Text style={styles.emptyHint}>Log more dreams to see patterns.</Text>
      )}
      {symbols.map((s, i) => (
        <View
          key={s.name}
          style={[styles.symbolRow, i < symbols.length - 1 && { marginBottom: 12 }]}
        >
          <View style={styles.symbolIcon}>
            <Text style={styles.symbolIconText}>
              {s.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.symbolName}>{s.name}</Text>
          <View style={styles.symbolBarBg}>
            <View
              style={[
                styles.symbolBarFill,
                { width: `${(s.count / max) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.symbolCount}>{s.count}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── AIPatternCard ────────────────────────────────────────────────────────────

function AIPatternCard({ isPremium, onUpgrade }) {
  const patterns = [
    { title: 'Water appears before big life changes — for you.', detail: 'Based on 18 months of your dreams. 3 of 4 weeks before a major life shift.', confidence: 0.81 },
    { title: 'People from your past appear when you\'re processing change.', detail: 'Recognisable faces from childhood correlate with waking decisions.', confidence: 0.67 },
  ];

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>PATTERNS THE AI FOUND</Text>
        {!isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        )}
      </View>
      {patterns.map((p, i) => {
        const locked = !isPremium && i > 0;
        return (
          <View key={i} style={[styles.card, styles.patternCard]}>
            {locked && (
              <TouchableOpacity
                style={styles.lockOverlay}
                onPress={onUpgrade}
                activeOpacity={0.9}
              >
                <View style={styles.lockBtn}>
                  <Text style={styles.lockBtnText}>⚿  Unlock with Premium</Text>
                </View>
              </TouchableOpacity>
            )}
            <Text style={styles.patternTitle}>{p.title}</Text>
            <Text style={styles.patternDetail}>{p.detail}</Text>
            <View style={styles.patternFooter}>
              <Text style={styles.patternConfidence}>{Math.round(p.confidence * 100)}% confidence</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── SettingsRow ──────────────────────────────────────────────────────────────

function SettingsRow({ icon, title, sub, last, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.settingsRow, !last && styles.settingsRowBorder]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.settingsIcon}>
        <Text style={styles.settingsIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingsTitle}>{title}</Text>
        {sub ? <Text style={styles.settingsSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const { user, isPremium, dreams, signOut: storeSignOut } = useDreamStore();

  const displayName = user?.user_metadata?.full_name || user?.email || 'Dreamer';
  const initial     = displayName.charAt(0).toUpperCase();

  const monthDreams = useMemo(() => getDreamsThisMonth(dreams), [dreams]);
  const topMood     = useMemo(() => getTopMoodLabel(monthDreams), [monthDreams]);
  const topSymbols  = useMemo(() => getTopSymbols(monthDreams), [monthDreams]);
  const moodWeeks   = useMemo(() => getMoodWeeks(monthDreams), [monthDreams]);

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          storeSignOut();
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Month header ── */}
        <View style={styles.monthHeader}>
          <Text style={styles.monthSub}>
            {currentMonthLabel()} · Monthly report
          </Text>
          <Text style={styles.monthHeadline}>
            You dreamed of {topMood.toLowerCase()}.
          </Text>
          <Text style={styles.monthBody}>
            {topMood} was the dominant emotion across {monthDreams.length} dream{monthDreams.length !== 1 ? 's' : ''} this month.
          </Text>
        </View>

        {/* ── Profile strip ── */}
        <TouchableOpacity
          style={[styles.card, styles.profileCard]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ProfileEdit')}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profilePlan}>{isPremium ? 'Premium' : 'Free tier'}</Text>
          </View>
          {!isPremium ? (
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => navigation.navigate('Paywall')}
              activeOpacity={0.85}
            >
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.editHint}>Edit →</Text>
          )}
        </TouchableOpacity>

        {/* ── 3-column stat row ── */}
        <View style={styles.statRow}>
          <StatCard value={monthDreams.length} label="Dreams" />
          <StatCard value={0} label="Lucid" />
          <StatCard
            value={monthDreams.length > 0 ? `${Math.round((monthDreams.length / 30) * 100)}%` : '—'}
            label="Recalled"
          />
        </View>

        {/* ── Emotional arc ── */}
        <EmotionalArc weeks={moodWeeks} />

        {/* ── Recurring symbols ── */}
        <RecurringSymbols symbols={topSymbols} />

        {/* ── AI patterns ── */}
        <AIPatternCard isPremium={isPremium} onUpgrade={() => navigation.navigate('Paywall')} />

        {/* ── Settings rows ── */}
        <View style={[styles.card, { padding: 0, overflow: 'hidden', marginTop: 8 }]}>
          <SettingsRow icon="◔" title="Notifications"    sub="Wake-up reminder, reality checks" onPress={() => navigation.navigate('Notifications')} />
          <SettingsRow icon="⌑" title="Privacy"          sub="On-device transcription" />
          <SettingsRow icon="↗" title="Export your data" sub="JSON, PDF, Markdown" />
          <SettingsRow icon="♡" title="Therapist sharing" sub="HIPAA-friendly" last />
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DreamDiary 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Month header
  monthHeader:   { paddingTop: 16, paddingBottom: 20 },
  monthSub: {
    fontSize: 12, fontWeight: '600', color: COLORS.ink3,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  monthHeadline: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, lineHeight: 36, marginBottom: 8,
  },
  monthBody: { fontSize: 13, color: COLORS.ink3, lineHeight: 18 },

  // Shared card
  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 16, marginBottom: 12,
  },

  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
  },
  profileAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.peach2, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 18, fontWeight: '600', color: COLORS.peach },
  profileName: {
    fontFamily: 'Lora_500Medium', fontSize: 16, fontWeight: '500', color: COLORS.ink,
  },
  profilePlan:  { fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  upgradeBtn: {
    backgroundColor: COLORS.ink, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  upgradeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.bg2 },
  editHint: { fontSize: 13, color: COLORS.ink3 },

  // 3-col stats
  statRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.line,
    padding: 14, alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Lora_500Medium', fontSize: 24, fontWeight: '500',
    color: COLORS.ink, lineHeight: 28, marginBottom: 4,
  },
  statLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.ink3,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },

  // Emotional arc
  arcHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  arcSub:    { fontSize: 11, color: COLORS.ink3 },
  arcChart: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: 14, height: 100, paddingHorizontal: 4,
  },
  arcWeek:  { flex: 1, alignItems: 'center', gap: 4 },
  arcBars: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    gap: 2, width: '100%', justifyContent: 'center',
  },
  arcBar:   { width: 6, borderRadius: 2, minHeight: 0 },
  arcWeekLabel: { fontSize: 9, color: COLORS.ink3, marginTop: 4 },
  arcLegend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.line,
  },
  arcLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  arcLegendDot:  { width: 8, height: 8, borderRadius: 2 },
  arcLegendText: { fontSize: 10.5, color: COLORS.ink3 },

  // Recurring symbols
  symbolRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  symbolIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.gold2,
    alignItems: 'center', justifyContent: 'center',
  },
  symbolIconText: { fontSize: 13, fontWeight: '600', color: COLORS.gold },
  symbolName: { fontSize: 13, color: COLORS.ink, flex: 1 },
  symbolBarBg: {
    flex: 2, height: 6, borderRadius: 3,
    backgroundColor: COLORS.line, overflow: 'hidden', maxWidth: 120,
  },
  symbolBarFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 3 },
  symbolCount:  { fontSize: 11.5, color: COLORS.ink3, minWidth: 18, textAlign: 'right' },
  emptyHint:    { fontSize: 13, color: COLORS.ink3, textAlign: 'center', paddingVertical: 8 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.ink3,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  premiumBadge: {
    backgroundColor: COLORS.gold2, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.gold },

  // Pattern cards
  patternCard:  { marginBottom: 10, overflow: 'hidden', position: 'relative' },
  patternTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 15, fontWeight: '500',
    color: COLORS.ink, lineHeight: 22, marginBottom: 6,
  },
  patternDetail: { fontSize: 12, color: COLORS.ink3, lineHeight: 18 },
  patternFooter: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line,
  },
  patternConfidence: { fontSize: 10, color: COLORS.ink3 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247,243,236,0.92)',
    alignItems: 'center', justifyContent: 'flex-end',
    padding: 14, zIndex: 2,
  },
  lockBtn: {
    backgroundColor: COLORS.ink, borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  lockBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.gold },

  // Settings rows
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
  },
  settingsRowBorder: {
    borderBottomWidth: 1, borderBottomColor: COLORS.line,
  },
  settingsIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center',
  },
  settingsIconText: { fontSize: 16, color: COLORS.ink2 },
  settingsTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
  settingsSub:   { fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  arrow:         { fontSize: 15, color: COLORS.ink4 },

  // Sign out
  signOutBtn: {
    height: 52, borderRadius: 26,
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4, marginBottom: 16,
  },
  signOutText: { fontSize: 15, fontWeight: '500', color: COLORS.ink3 },
  version: {
    textAlign: 'center', fontSize: 12, color: COLORS.ink4, marginBottom: 8,
  },
});
