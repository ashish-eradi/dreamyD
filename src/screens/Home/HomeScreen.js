// =============================================================================
// DreamDiary V3 — HomeScreen (Today)
// =============================================================================
// Warm paper / cream aesthetic. Sections: header, streak card, last night,
// weekly insight teaser, and tonight's rituals.
// =============================================================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDreamStore } from '../../store';
import { getDreams } from '../../services/supabase';
import { formatDate, getDreamStreak, getTopEmotion, getTopSymbols } from '../../utils';
import { COLORS, getMoodStyle, getSymbolStyle } from '../../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatShortDayDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  });
}

// ─── StreakMoon (pulsing gradient circle) ─────────────────────────────────────

function StreakMoon() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1400, easing: Easing.inOut(Easing.sine) }),
        withTiming(0.96, { duration: 1400, easing: Easing.inOut(Easing.sine) }),
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.streakMoonWrap, animStyle]}>
      <LinearGradient
        colors={[COLORS.peach, COLORS.gold]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.streakMoonCircle}
      >
        <Text style={styles.streakMoonIcon}>☾</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── StreakCard ───────────────────────────────────────────────────────────────

function StreakCard({ streak }) {
  // 7 dots: 6 moss (recorded nights) + 1 peach (today / current)
  const dots = [true, true, true, true, true, true, false];

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
      <View style={styles.streakRow}>
        <StreakMoon />
        <View style={styles.streakText}>
          <Text style={styles.streakTitle}>
            <Text style={styles.streakNum}>{streak}</Text>
            {'-night streak'}
          </Text>
          <Text style={styles.streakSub}>Recall up 23% this month</Text>
        </View>
      </View>
      <View style={styles.streakDots}>
        {dots.map((isMoss, i) => (
          <View
            key={i}
            style={[
              styles.streakDot,
              { backgroundColor: isMoss ? COLORS.moss : COLORS.peach },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ─── MoodPill ─────────────────────────────────────────────────────────────────

function MoodPill({ moodKey }) {
  const mood = getMoodStyle(moodKey);
  return (
    <View style={[styles.moodPill, { backgroundColor: mood.bg }]}>
      <View style={[styles.moodDot, { backgroundColor: mood.color }]} />
      <Text style={[styles.moodPillText, { color: mood.color }]}>
        {mood.label}
      </Text>
    </View>
  );
}

// ─── SymbolPill ───────────────────────────────────────────────────────────────

function SymbolPill({ name }) {
  const sym   = getSymbolStyle(name);
  const label = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  return (
    <View style={[styles.symbolPill, { backgroundColor: sym.bg }]}>
      <Text style={[styles.symbolPillText, { color: sym.color }]}>{label}</Text>
    </View>
  );
}

// ─── LastNightCard ────────────────────────────────────────────────────────────

function LastNightCard({ dream, onPress, onRecordFirst }) {
  if (!dream) {
    return (
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
        <Text style={styles.sectionLabel}>LAST NIGHT</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No dream yet</Text>
          <Text style={styles.emptySub}>Nothing recorded last night.</Text>
          <TouchableOpacity
            onPress={onRecordFirst}
            style={styles.emptyBtn}
            accessibilityRole="button"
            accessibilityLabel="Record your first dream"
          >
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
    ? new Date(dream.recorded_at).toLocaleTimeString('en-US', {
        hour:   'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View last night's dream: ${title}`}
        style={[styles.card, styles.lastNightCard]}
      >
        <Text style={styles.sectionLabel}>LAST NIGHT</Text>

        <Text style={styles.lastNightTitle} numberOfLines={2}>
          {title}
        </Text>

        <Text style={styles.lastNightSnippet} numberOfLines={2}>
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

        <View style={styles.lastNightFooter}>
          {timeStr ? (
            <Text style={styles.lastNightMeta}>Recorded {timeStr}</Text>
          ) : (
            <View />
          )}
          <Text style={styles.lastNightReadLink}>Read full →</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── WeeklyInsightCard ────────────────────────────────────────────────────────

function WeeklyInsightCard({ onPress }) {
  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="See all patterns"
        style={styles.insightCard}
      >
        <LinearGradient
          colors={[COLORS.peach2, COLORS.gold2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.insightHeader}>
          <Text style={styles.insightIcon}>✦</Text>
          <Text style={styles.insightLabel}>This week's insight</Text>
        </View>
        <Text style={styles.insightBody}>
          Water has appeared in three dreams this week — a herald, in your
          history, of change.
        </Text>
        <Text style={styles.insightLink}>See all patterns →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── TonightItem ──────────────────────────────────────────────────────────────

function TonightItem({ icon, title, sub }) {
  return (
    <View style={styles.tonightItem}>
      <View style={styles.tonightIconCircle}>
        <Text style={styles.tonightItemIcon}>{icon}</Text>
      </View>
      <View style={styles.tonightItemText}>
        <Text style={styles.tonightItemTitle}>{title}</Text>
        <Text style={styles.tonightItemSub}>{sub}</Text>
      </View>
      <Text style={styles.tonightChevron}>→</Text>
    </View>
  );
}

// ─── TonightCard ──────────────────────────────────────────────────────────────

function TonightCard() {
  return (
    <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.card}>
      <Text style={styles.sectionLabel}>TONIGHT</Text>
      <TonightItem
        icon="◐"
        title="Set tonight's intention"
        sub="5 sec for lucidity"
      />
      <View style={styles.tonightDivider} />
      <TonightItem
        icon="◔"
        title="Reality check at 8 PM"
        sub="in 2h 14m"
      />
      <View style={styles.tonightDivider} />
      <TonightItem
        icon="☾"
        title="Wake & capture dream"
        sub="optimal: 4:18 AM"
      />
    </Animated.View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const user            = useDreamStore((s) => s.user);
  const dreams          = useDreamStore((s) => s.dreams);
  const setDreams       = useDreamStore((s) => s.setDreams);
  const setCurrentDream = useDreamStore((s) => s.setCurrentDream);

  const lastDream    = dreams.length > 0 ? dreams[0] : null;
  const streak       = getDreamStreak(dreams);
  const greeting     = getGreeting();
  const displayName  =
    user?.user_metadata?.full_name?.split(' ')[0] ??
    user?.name?.split(' ')[0] ??
    'Anya';
  const subLabel = formatShortDayDate(new Date());

  // ── Load dreams on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getDreams(user.id)
      .then((data) => { if (!cancelled) setDreams(data); })
      .catch((err) => console.warn('[HomeScreen] getDreams failed:', err));
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Navigation handlers ────────────────────────────────────────────────────
  const handleRecord = useCallback(() => {
    navigation.navigate('Record');
  }, [navigation]);

  const handleViewDreamDetail = useCallback(() => {
    if (!lastDream) return;
    setCurrentDream(lastDream);
    navigation.navigate('DreamDetail', { dreamId: lastDream.id });
  }, [lastDream, navigation, setCurrentDream]);

  const handlePatterns = useCallback(() => {
    navigation.navigate('PatternAnalysis');
  }, [navigation]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <Animated.View entering={FadeIn.duration(350)} style={styles.header}>
            <Text style={styles.headerSub}>{subLabel}</Text>
            <Text style={styles.headerTitle}>
              {greeting}, {displayName}.
            </Text>
          </Animated.View>

          {/* ── Streak card ── */}
          <StreakCard streak={streak} />

          {/* ── Last night ── */}
          <LastNightCard
            dream={lastDream}
            onPress={handleViewDreamDetail}
            onRecordFirst={handleRecord}
          />

          {/* ── Weekly insight ── */}
          <WeeklyInsightCard onPress={handlePatterns} />

          {/* ── Tonight ── */}
          <TonightCard />

          <View style={styles.bottomPad} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow:          1,
    paddingHorizontal: 20,
    paddingTop:        0,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingTop:    16,
    paddingBottom: 20,
  },
  headerSub: {
    fontSize:      13,
    fontWeight:    '600',
    color:         COLORS.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  6,
  },
  headerTitle: {
    fontSize:      30,
    fontWeight:    '500',
    color:         COLORS.ink,
    fontFamily:    'serif',
    letterSpacing: -0.3,
  },

  // ── Card (shared) ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.card,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     COLORS.line,
    padding:         20,
    marginBottom:    14,
  },

  // ── Streak card ──────────────────────────────────────────────────────────────
  streakRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  16,
  },
  streakMoonWrap: {
    marginRight: 14,
  },
  streakMoonCircle: {
    width:           44,
    height:          44,
    borderRadius:    22,
    alignItems:      'center',
    justifyContent:  'center',
  },
  streakMoonIcon: {
    fontSize:   22,
    color:      COLORS.card,
    fontFamily: 'serif',
  },
  streakText: {
    flex: 1,
  },
  streakTitle: {
    fontSize:   16,
    fontWeight: '600',
    color:      COLORS.ink,
  },
  streakNum: {
    fontSize:   18,
    fontWeight: '700',
    color:      COLORS.ink,
  },
  streakSub: {
    fontSize:  13,
    color:     COLORS.ink3,
    marginTop: 2,
  },
  streakDots: {
    flexDirection: 'row',
    gap:           7,
  },
  streakDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },

  // ── Section label ─────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize:      13,
    fontWeight:    '600',
    color:         COLORS.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  14,
  },

  // ── Last night card ───────────────────────────────────────────────────────────
  lastNightCard: {
    padding: 22,
  },
  lastNightTitle: {
    fontSize:      26,
    fontWeight:    '500',
    color:         COLORS.ink,
    fontFamily:    'serif',
    letterSpacing: -0.2,
    marginBottom:  10,
    lineHeight:    32,
  },
  lastNightSnippet: {
    fontSize:     16,
    color:        COLORS.ink2,
    fontFamily:   'serif',
    lineHeight:   26,
    marginBottom: 14,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    marginBottom:  16,
  },
  moodPill: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      20,
    paddingVertical:   4,
    paddingHorizontal: 10,
    gap:               6,
  },
  moodDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  moodPillText: {
    fontSize:   13,
    fontWeight: '500',
  },
  symbolPill: {
    borderRadius:      20,
    paddingVertical:   4,
    paddingHorizontal: 10,
  },
  symbolPillText: {
    fontSize:   13,
    fontWeight: '500',
  },
  lastNightFooter: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    borderTopWidth:   1,
    borderTopColor:   COLORS.line,
    paddingTop:       12,
  },
  lastNightMeta: {
    fontSize: 13,
    color:    COLORS.ink3,
  },
  lastNightReadLink: {
    fontSize:   13,
    color:      COLORS.peach,
    fontWeight: '600',
  },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyState: {
    alignItems:     'center',
    paddingVertical: 20,
  },
  emptyTitle: {
    fontSize:     18,
    fontWeight:   '500',
    fontFamily:   'serif',
    color:        COLORS.ink,
    marginBottom: 8,
  },
  emptySub: {
    fontSize:     14,
    color:        COLORS.ink3,
    marginBottom: 18,
    textAlign:    'center',
  },
  emptyBtn: {
    backgroundColor:  COLORS.ink,
    borderRadius:     999,
    height:           48,
    paddingHorizontal: 28,
    alignItems:       'center',
    justifyContent:   'center',
  },
  emptyBtnText: {
    fontSize:   15,
    fontWeight: '500',
    color:      COLORS.bg2,
  },

  // ── Weekly insight card ───────────────────────────────────────────────────────
  insightCard: {
    borderRadius:  20,
    borderWidth:   1,
    borderColor:   COLORS.line,
    padding:       20,
    marginBottom:  14,
    overflow:      'hidden',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  10,
    gap:           8,
  },
  insightIcon: {
    fontSize: 16,
    color:    COLORS.gold,
  },
  insightLabel: {
    fontSize:      13,
    fontWeight:    '600',
    color:         COLORS.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  insightBody: {
    fontSize:     16,
    fontFamily:   'serif',
    color:        COLORS.ink,
    lineHeight:   26,
    marginBottom: 14,
  },
  insightLink: {
    fontSize:   13,
    color:      COLORS.peach,
    fontWeight: '600',
  },

  // ── Tonight card ──────────────────────────────────────────────────────────────
  tonightItem: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: 12,
    gap:           14,
  },
  tonightIconCircle: {
    width:           38,
    height:          38,
    borderRadius:    19,
    backgroundColor: COLORS.peach2,
    alignItems:      'center',
    justifyContent:  'center',
  },
  tonightItemIcon: {
    fontSize: 16,
    color:    COLORS.peach,
  },
  tonightItemText: {
    flex: 1,
  },
  tonightItemTitle: {
    fontSize:     15,
    fontWeight:   '500',
    color:        COLORS.ink,
    marginBottom: 2,
  },
  tonightItemSub: {
    fontSize: 13,
    color:    COLORS.ink3,
  },
  tonightChevron: {
    fontSize: 16,
    color:    COLORS.ink4,
  },
  tonightDivider: {
    height:          1,
    backgroundColor: COLORS.line,
    marginLeft:      52,
  },

  // ── Bottom spacing for tab bar ────────────────────────────────────────────────
  bottomPad: {
    height: Platform.OS === 'ios' ? 32 : 20,
  },
});
