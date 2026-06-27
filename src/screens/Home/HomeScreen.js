// =============================================================================
// DreamDiary — HomeScreen (Today)
// Design: warm-paper aesthetic matching DreamDiary.html prototype
// Sections: header (brand + avatar), streak, hero dream card, AI insight,
//           quick-actions grid, tonight rituals
// =============================================================================

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
  Easing, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDreamStore } from '../../store';
import { getDreams } from '../../services/supabase';
import { areRealityChecksScheduled } from '../../services/notifications';
import { getDreamStreak, getTopEmotion, getTopSymbols } from '../../utils';
import { COLORS, getMoodStyle, getSymbolStyle } from '../../constants/theme';

// ─── Tonight helpers ───────────────────────────────────────────────────────────

const REALITY_CHECK_TIMES = ['08:00', '11:00', '14:00', '17:00', '21:00'];

function getNextCheckLabel() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const t of REALITY_CHECK_TIMES) {
    const [h, m] = t.split(':').map(Number);
    const checkMins = h * 60 + m;
    if (checkMins > nowMins) {
      const diff = checkMins - nowMins;
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }
  }
  return 'tomorrow at 8 AM';
}

function fmt12hShort(time24h) {
  if (!time24h) return '4:18 AM';
  const [h, m] = time24h.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function calcRemPeakTime(wakeTime24h) {
  if (!wakeTime24h) return '4:18 AM';
  const [wh, wm] = wakeTime24h.split(':').map(Number);
  const sleepStartMins = 22 * 60 + 30;
  let wakeTimeMins = wh * 60 + wm;
  if (wakeTimeMins < sleepStartMins) wakeTimeMins += 24 * 60;
  const remMinsSinceMidnight = (sleepStartMins + (wakeTimeMins - sleepStartMins) * 0.75) % (24 * 60);
  const remH = Math.floor(remMinsSinceMidnight / 60);
  const remM = Math.floor(remMinsSinceMidnight % 60);
  return fmt12hShort(`${String(remH).padStart(2, '0')}:${String(remM).padStart(2, '0')}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDayDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─── BrandMoon ────────────────────────────────────────────────────────────────

function BrandMoon({ size = 22 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      overflow: 'hidden', flexShrink: 0,
    }}>
      <LinearGradient
        colors={['#fff5d9', '#f0c876', '#c98f3d']}
        start={{ x: 0.32, y: 0.32 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      />
    </View>
  );
}

// ─── MoodPill ─────────────────────────────────────────────────────────────────

function MoodPill({ moodKey, small }) {
  const mood = getMoodStyle(moodKey);
  return (
    <View style={[styles.chip, { backgroundColor: mood.bg }]}>
      <View style={[styles.chipDot, { backgroundColor: mood.color }]} />
      <Text style={[styles.chipText, { color: mood.color }]}>{mood.label}</Text>
    </View>
  );
}

// ─── SymbolPill ───────────────────────────────────────────────────────────────

function SymbolPill({ name }) {
  const sym = getSymbolStyle(name);
  return (
    <View style={[styles.chip, { backgroundColor: sym.bg }]}>
      <Text style={[styles.chipText, { color: sym.color }]}>
        {name.charAt(0).toUpperCase() + name.slice(1)}
      </Text>
    </View>
  );
}

// ─── StreakCard ───────────────────────────────────────────────────────────────

function StreakCard({ streak, monthCount }) {
  const barHeights = [14, 22, 18, 26, 20, 24, 10];
  const streakLabel = streak === 1 ? '1-day streak' : `${streak}-day streak`;
  const sub = monthCount > 0
    ? `${monthCount} dream${monthCount !== 1 ? 's' : ''} logged this month`
    : 'Start your streak — record tonight';

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.card}>
      <View style={styles.streakRow}>
        <View style={styles.streakNumWrap}>
          <LinearGradient
            colors={['#fef3d6', '#f5d896']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakNumGrad}
          >
            <Text style={styles.streakNum}>{streak}</Text>
          </LinearGradient>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.streakTitle}>{streakLabel}</Text>
          <Text style={styles.streakSub}>{sub}</Text>
        </View>

        <View style={styles.streakBars}>
          {barHeights.map((h, i) => (
            <View
              key={i}
              style={[
                styles.streakBar,
                { height: h, backgroundColor: i < streak ? COLORS.gold : COLORS.line2 },
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── LastNightCard ────────────────────────────────────────────────────────────

function LastNightCard({ dream, onPress, onRecordFirst }) {
  if (!dream) {
    return (
      <Animated.View entering={FadeInDown.delay(160).duration(380)} style={[styles.card, { padding: 22 }]}>
        <Text style={styles.sectionLabel}>LAST NIGHT</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No dream yet</Text>
          <Text style={styles.emptySub}>Nothing recorded last night.</Text>
          <TouchableOpacity onPress={onRecordFirst} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Record your first</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  const tags       = dream.dream_tags ?? [];
  const topEmotion = getTopEmotion(tags);
  const topSymbols = getTopSymbols(tags, 2);
  const title      = dream.title ?? 'Untitled Dream';
  const snippet    = dream.ai_summary ?? dream.transcript ?? '';
  const timeStr    = dream.recorded_at
    ? new Date(dream.recorded_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  return (
    <Animated.View entering={FadeInDown.delay(160).duration(380)}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[styles.card, { padding: 0, overflow: 'hidden' }]}
        accessibilityRole="button"
        accessibilityLabel={`View dream: ${title}`}
      >
        {/* Gradient hero banner — matches design's 140px coloured banner */}
        <LinearGradient
          colors={['#fef3d6', '#f5d896', '#e9a78a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          {/* Abstract orbs */}
          <View style={styles.orb1} />
          <View style={styles.orb2} />
          {/* Corner labels */}
          <Text style={styles.heroTopLeft}>Last night · {timeStr}</Text>
        </LinearGradient>

        {/* Dream details */}
        <View style={{ padding: 18 }}>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.heroSnippet} numberOfLines={2}>
            {snippet || 'Tap to read your dream…'}
          </Text>
          {(topEmotion || topSymbols.length > 0) && (
            <View style={styles.pillRow}>
              {topEmotion && <MoodPill moodKey={topEmotion.label} />}
              {topSymbols.map((sym) => (
                <SymbolPill key={sym.id ?? sym.label} name={sym.label} />
              ))}
            </View>
          )}
          <View style={styles.heroFooter}>
            <Text style={styles.heroMeta}>Tap to read full dream</Text>
            <Text style={styles.heroReadLink}>Read full →</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── AIInsightCard ────────────────────────────────────────────────────────────

function AIInsightCard({ onPress, isPremium, topSymbol, dreamCount }) {
  let label = 'AI NOTICED';
  let body, meta;

  if (dreamCount === 0) {
    body = 'Record your first dream tonight. Patterns emerge after a few entries.';
    meta = 'Symbols, emotions and themes will appear here';
  } else if (!topSymbol || dreamCount < 3) {
    body = `${dreamCount} dream${dreamCount !== 1 ? 's' : ''} recorded — keep going. Patterns surface after a few more.`;
    meta = 'Symbols and recurring themes will appear here';
  } else {
    const cap = topSymbol.name.charAt(0).toUpperCase() + topSymbol.name.slice(1);
    body = `"${cap}" has appeared in ${topSymbol.count} of your dreams — one of your most recurring symbols.`;
    meta = `Tap to explore what ${topSymbol.name} connects to across your journal`;
  }

  return (
    <Animated.View entering={FadeInDown.delay(240).duration(380)}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[styles.card, { overflow: 'hidden' }]}
        accessibilityRole="button"
        accessibilityLabel="View AI pattern insight"
      >
        <LinearGradient
          colors={['#ffffff', '#f5eee2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.insightRow}>
          <View style={styles.insightIcon}>
            <Text style={{ fontSize: 15, color: '#5a3a1f' }}>✦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightLabel}>{label}</Text>
            <Text style={styles.insightBody}>{body}</Text>
            <Text style={styles.insightMeta}>{meta}</Text>
          </View>
          {!isPremium && (
            <View style={styles.premiumPill}>
              <Text style={styles.premiumPillText}>Premium</Text>
            </View>
          )}
        </View>
        <Text style={styles.insightLink}>See all patterns →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── QuickActionsGrid ─────────────────────────────────────────────────────────

function QuickActionsGrid({ onLucid, onRecord, nextCheckLabel, checksEnabled }) {
  return (
    <Animated.View entering={FadeInDown.delay(320).duration(380)}>
      <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>TONIGHT</Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity
          onPress={onLucid}
          activeOpacity={0.88}
          style={[styles.quickCard, styles.card]}
          accessibilityRole="button"
        >
          <View style={[styles.quickIcon, { backgroundColor: COLORS.plum2 }]}>
            <Text style={{ fontSize: 15, color: COLORS.plum }}>◐</Text>
          </View>
          <Text style={styles.quickTitle}>Reality check</Text>
          <Text style={styles.quickSub}>
            {checksEnabled ? `Next nudge in ${nextCheckLabel}` : 'Enable in Lucid trainer'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRecord}
          activeOpacity={0.88}
          style={[styles.quickCard, styles.card]}
          accessibilityRole="button"
        >
          <View style={[styles.quickIcon, { backgroundColor: COLORS.gold2 }]}>
            <Text style={{ fontSize: 15, color: COLORS.gold }}>◎</Text>
          </View>
          <Text style={styles.quickTitle}>Log a nap dream</Text>
          <Text style={styles.quickSub}>Quick capture, 60 seconds</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── TonightCard ──────────────────────────────────────────────────────────────

function TonightCard({ onLucid, onRecord, nextCheckLabel, wakeLabel, checksEnabled }) {
  const items = [
    { icon: '◐', title: "Set tonight's intention",   sub: '5 sec for lucidity',                                                  onPress: onLucid  },
    { icon: '◔', title: 'Reality check',             sub: checksEnabled ? `next in ${nextCheckLabel}` : 'Enable in Lucid trainer', onPress: onLucid  },
    { icon: '☾', title: 'Wake & capture dream',      sub: `optimal: ${wakeLabel}`,                                                onPress: onRecord },
  ];
  return (
    <Animated.View entering={FadeInDown.delay(400).duration(380)} style={styles.card}>
      <Text style={styles.sectionLabel}>RITUALS</Text>
      {items.map((r, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          <TouchableOpacity onPress={r.onPress} activeOpacity={0.75} style={styles.tonightRow}>
            <View style={styles.tonightIconCircle}>
              <Text style={styles.tonightIcon}>{r.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tonightTitle}>{r.title}</Text>
              <Text style={styles.tonightSub}>{r.sub}</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </Animated.View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const user            = useDreamStore((s) => s.user);
  const isPremium       = useDreamStore((s) => s.isPremium);
  const dreams          = useDreamStore((s) => s.dreams);
  const wakeTime        = useDreamStore((s) => s.wakeTime);
  const setDreams       = useDreamStore((s) => s.setDreams);
  const setCurrentDream = useDreamStore((s) => s.setCurrentDream);

  const [checksEnabled, setChecksEnabled] = React.useState(false);

  React.useEffect(() => {
    areRealityChecksScheduled().then(setChecksEnabled).catch(() => {});
  }, []);

  const nextCheckLabel = getNextCheckLabel();
  const wakeLabel = calcRemPeakTime(wakeTime);

  const lastDream = dreams.length > 0 ? dreams[0] : null;
  const streak    = getDreamStreak(dreams);
  const greeting  = getGreeting();
  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ??
    user?.name?.split(' ')[0] ?? 'Dreamer';
  const dayLabel = formatDayDate(new Date());

  // Real monthly count for streak subtitle
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return dreams.filter(d => {
      const dt = new Date(d.recorded_at ?? d.created_at);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    }).length;
  }, [dreams]);

  // Most frequent symbol across all dreams (for AI insight card)
  const topSymbol = useMemo(() => {
    const counts = {};
    dreams.forEach(d => {
      (d.dream_tags ?? []).filter(t => t.type === 'symbol' && t.label).forEach(t => {
        const k = t.label.toLowerCase();
        counts[k] = (counts[k] || 0) + 1;
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], count: sorted[0][1] } : null;
  }, [dreams]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getDreams(user.id)
      .then((data) => { if (!cancelled) setDreams(data); })
      .catch((err) => console.warn('[HomeScreen] getDreams failed:', err));
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleRecord = useCallback(() => navigation.navigate('Record'), [navigation]);

  const handleViewDream = useCallback(() => {
    if (!lastDream) return;
    setCurrentDream(lastDream);
    navigation.navigate('DreamDetail', { dreamId: lastDream.id });
  }, [lastDream, navigation, setCurrentDream]);

  const handlePatterns = useCallback(() => navigation.navigate('PatternAnalysis'), [navigation]);
  const handleLucid    = useCallback(() => navigation.navigate('LucidTrainer'),    [navigation]);
  const handleSettings = useCallback(() => navigation.navigate('You'),             [navigation]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header: brand mark + search + user avatar ── */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <View style={styles.headerBrand}>
              <BrandMoon size={22} />
              <Text style={styles.headerBrandName}>DreamDiary</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Search')}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Search dreams"
              >
                <Text style={styles.iconBtnText}>⌕</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSettings}
                style={styles.avatarBtn}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <Text style={styles.avatarText}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Date + greeting ── */}
          <Animated.View entering={FadeIn.delay(60).duration(300)} style={styles.greetingSection}>
            <Text style={styles.dayLabel}>{dayLabel}</Text>
            <Text style={styles.greetingTitle}>{greeting}, {firstName}.</Text>
            {lastDream && (
              <Text style={styles.greetingSub}>
                You logged a dream {
                  lastDream.recorded_at
                    ? new Date(lastDream.recorded_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                    : 'recently'
                }.
              </Text>
            )}
          </Animated.View>

          {/* ── Last night hero card ── */}
          <LastNightCard
            dream={lastDream}
            onPress={handleViewDream}
            onRecordFirst={handleRecord}
          />

          {/* ── AI insight ── */}
          <AIInsightCard
            onPress={handlePatterns}
            isPremium={isPremium}
            topSymbol={topSymbol}
            dreamCount={dreams.length}
          />

          {/* ── Quick actions grid ── */}
          <QuickActionsGrid onLucid={handleLucid} onRecord={handleRecord} nextCheckLabel={nextCheckLabel} checksEnabled={checksEnabled} />

          {/* ── Streak card ── */}
          <StreakCard streak={streak} monthCount={thisMonthCount} />

          {/* ── Tonight rituals ── */}
          <TonightCard onLucid={handleLucid} onRecord={handleRecord} nextCheckLabel={nextCheckLabel} wakeLabel={wakeLabel} checksEnabled={checksEnabled} />

          <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 0 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12, paddingBottom: 4,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBrandName: {
    fontFamily: 'Lora_500Medium', fontSize: 17, fontWeight: '500',
    color: COLORS.ink, letterSpacing: -0.2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 18, color: COLORS.ink2 },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.peach2,
    borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '600', color: COLORS.peach },

  // Greeting
  greetingSection: { paddingTop: 20, paddingBottom: 20 },
  dayLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.ink3,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  greetingTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, marginBottom: 4, letterSpacing: -0.3,
  },
  greetingSub: { fontSize: 14, color: COLORS.ink3 },

  // Shared card
  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 18, marginBottom: 14,
  },

  // Hero card (last night)
  heroBanner: {
    height: 130, position: 'relative', overflow: 'hidden',
  },
  orb1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,245,217,0.7)',
  },
  orb2: {
    position: 'absolute', bottom: -30, left: -20,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(185,168,228,0.45)',
  },
  heroTopLeft: {
    position: 'absolute', top: 14, left: 16,
    fontSize: 11, color: 'rgba(28,23,51,0.6)',
    letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: '600',
  },
  heroTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 22, fontWeight: '500',
    color: COLORS.ink, letterSpacing: -0.2, marginBottom: 8, lineHeight: 28,
  },
  heroSnippet: {
    fontSize: 13.5, color: COLORS.ink3, lineHeight: 20, marginBottom: 12,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  heroFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 12,
  },
  heroMeta: { fontSize: 12, color: COLORS.ink4 },
  heroReadLink: { fontSize: 12, fontWeight: '600', color: COLORS.peach },

  // Chips
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, gap: 5,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: '500' },

  // AI insight card
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  insightIcon: {
    width: 36, height: 36, borderRadius: 12, flexShrink: 0,
    backgroundColor: COLORS.gold2,
    alignItems: 'center', justifyContent: 'center',
  },
  insightLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  insightBody: {
    fontSize: 14, fontWeight: '500', color: COLORS.ink,
    lineHeight: 20, marginBottom: 4,
  },
  insightMeta: { fontSize: 12, color: COLORS.ink3, lineHeight: 16 },
  insightLink: { fontSize: 12, fontWeight: '600', color: COLORS.peach },
  premiumPill: {
    backgroundColor: COLORS.gold2, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  premiumPillText: { fontSize: 10, fontWeight: '700', color: COLORS.gold },

  // Quick actions grid
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickCard: { flex: 1, minHeight: 110, padding: 14, marginBottom: 0, gap: 8 },
  quickIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  quickTitle: { fontSize: 13.5, fontWeight: '600', color: COLORS.ink },
  quickSub:   { fontSize: 11.5, color: COLORS.ink3, lineHeight: 16 },

  // Streak card
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  streakNumWrap: { flexShrink: 0 },
  streakNumGrad: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  streakNum: {
    fontFamily: 'Lora_500Medium', fontSize: 22,
    fontWeight: '600', color: '#9c7716',
  },
  streakTitle: { fontSize: 13.5, fontWeight: '600', color: COLORS.ink },
  streakSub:   { fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  streakBars: { flexDirection: 'row', gap: 3, alignItems: 'flex-end' },
  streakBar:  { width: 4, borderRadius: 2 },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.ink3,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },

  // Tonight / rituals
  tonightRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 14,
  },
  tonightIconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.peach2,
    alignItems: 'center', justifyContent: 'center',
  },
  tonightIcon: { fontSize: 16, color: COLORS.peach },
  tonightTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink, marginBottom: 2 },
  tonightSub:   { fontSize: 12, color: COLORS.ink3 },
  chevron: { fontSize: 15, color: COLORS.ink4 },
  divider: { height: 1, backgroundColor: COLORS.line, marginLeft: 52 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 18, fontWeight: '500',
    color: COLORS.ink, marginBottom: 8,
  },
  emptySub:  { fontSize: 14, color: COLORS.ink3, marginBottom: 18, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: COLORS.ink, borderRadius: 999,
    height: 48, paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.bg2 },
});
