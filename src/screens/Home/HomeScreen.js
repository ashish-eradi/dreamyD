// =============================================================================
// DreamDiary — HomeScreen
// =============================================================================
// MVP core screen: greeting, streak, last-dream preview, large record button,
// and premium feature teasers (Dreamscape Map, Pattern Analysis).
// =============================================================================

import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDreamStore } from '../../store';
import { getDreams } from '../../services/supabase';
import {
  formatDate,
  getDreamStreak,
  getTopEmotion,
  getTopSymbols,
  getEmotionColor,
  truncateText,
} from '../../utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  gold: '#F59E0B',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  success: '#10B981',
};

const EMOTION_COLORS = {
  joy: '#F59E0B',
  fear: '#EF4444',
  peace: '#10B981',
  sadness: '#3B82F6',
  confusion: '#8B5CF6',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── PulseRing ────────────────────────────────────────────────────────────────
function PulseRing({ delay, size, color }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(2.2, { duration: 1800, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: 0 }),
          withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

// ─── RecordButton ─────────────────────────────────────────────────────────────
function RecordButton({ onPress }) {
  const breathScale = useSharedValue(1);
  const tapScale = useSharedValue(1);

  useEffect(() => {
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1600, easing: Easing.inOut(Easing.sine) }),
        withTiming(1.0, { duration: 1600, easing: Easing.inOut(Easing.sine) }),
      ),
      -1,
      false
    );
  }, []);

  const handlePress = useCallback(() => {
    tapScale.value = withSpring(0.92, { damping: 12 }, () => {
      tapScale.value = withSpring(1, { damping: 12 });
    });
    onPress?.();
  }, [onPress]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breathScale.value * tapScale.value },
    ],
  }));

  return (
    <View style={styles.recordSection}>
      {/* Pulse rings layered behind */}
      <View style={styles.pulseContainer}>
        <PulseRing delay={0} size={100} color={COLORS.accent} />
        <PulseRing delay={600} size={100} color={COLORS.primary} />
        <PulseRing delay={1200} size={100} color={COLORS.accent} />
      </View>

      <Animated.View style={buttonStyle}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel="Record your dream"
          style={styles.recordButtonOuter}
        >
          <LinearGradient
            colors={['#7B5EA7', '#C084FC', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.recordButtonGradient}
          >
            <Text style={styles.micIcon}>🎙</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.recordLabel}>Record Dream</Text>
    </View>
  );
}

// ─── StreakCard ───────────────────────────────────────────────────────────────
function StreakCard({ streak }) {
  const flameScale = useSharedValue(1);

  useEffect(() => {
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.sine) }),
        withTiming(0.95, { duration: 700, easing: Easing.inOut(Easing.sine) }),
      ),
      -1,
      false
    );
  }, []);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(450)} style={styles.streakCard}>
      <LinearGradient
        colors={['rgba(245,158,11,0.15)', 'rgba(26,26,46,0.95)']}
        style={styles.streakCardInner}
      >
        <Animated.Text style={[styles.streakFlame, flameStyle]}>🔥</Animated.Text>
        <View style={styles.streakTextGroup}>
          <Text style={styles.streakCount}>
            <Text style={styles.streakNumber}>{streak}</Text>
            {' '}day streak
          </Text>
          <Text style={styles.streakSub}>Keep recording every morning!</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakBadgeText}>{streak > 0 ? '🏆' : '💤'}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── EmotionChip ──────────────────────────────────────────────────────────────
function EmotionChip({ label }) {
  const color = getEmotionColor(label);
  return (
    <View style={[styles.emotionChip, { backgroundColor: color + '28', borderColor: color + '60' }]}>
      <Text style={[styles.emotionChipText, { color }]}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </View>
  );
}

// ─── SymbolTag ────────────────────────────────────────────────────────────────
function SymbolTag({ label }) {
  return (
    <View style={styles.symbolTag}>
      <Text style={styles.symbolTagText}>#{label}</Text>
    </View>
  );
}

// ─── LastDreamCard ────────────────────────────────────────────────────────────
function LastDreamCard({ dream, onViewDetails, onRecordFirst }) {
  const topEmotion = dream ? getTopEmotion(dream.dream_tags ?? []) : null;
  const topSymbols = dream ? getTopSymbols(dream.dream_tags ?? [], 2) : [];
  const summary = dream?.ai_summary ?? dream?.transcript ?? '';

  if (!dream) {
    return (
      <Animated.View
        entering={FadeInDown.delay(300).duration(450)}
        style={styles.lastDreamCard}
      >
        <View style={styles.lastDreamCardInner}>
          <Text style={styles.lastDreamLabel}>Last Night's Dream</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌑</Text>
            <Text style={styles.emptyTitle}>No dream recorded yet</Text>
            <Text style={styles.emptyBody}>
              Tap to capture last night's dream before it fades
            </Text>
            <TouchableOpacity
              onPress={onRecordFirst}
              style={styles.emptyRecordButton}
              accessibilityRole="button"
              accessibilityLabel="Record your first dream"
            >
              <Text style={styles.emptyRecordButtonText}>Record Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(300).duration(450)}
      style={styles.lastDreamCard}
    >
      <LinearGradient
        colors={['rgba(123,94,167,0.10)', 'rgba(26,26,46,0.98)']}
        style={styles.lastDreamCardInner}
      >
        <View style={styles.lastDreamHeader}>
          <Text style={styles.lastDreamLabel}>Last Night's Dream</Text>
          <TouchableOpacity
            onPress={onViewDetails}
            accessibilityRole="button"
            accessibilityLabel="View dream details"
          >
            <Text style={styles.viewDetailsLink}>View Details →</Text>
          </TouchableOpacity>
        </View>

        {dream.title ? (
          <Text style={styles.lastDreamTitle}>{dream.title}</Text>
        ) : null}

        <Text style={styles.lastDreamSummary} numberOfLines={2}>
          {truncateText(summary, 120) || 'Dream recorded — tap to view details'}
        </Text>

        {(topEmotion || topSymbols.length > 0) && (
          <View style={styles.tagRow}>
            {topEmotion && <EmotionChip label={topEmotion.label} />}
            {topSymbols.map((sym) => (
              <SymbolTag key={sym.id ?? sym.label} label={sym.label} />
            ))}
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

// ─── PremiumTeaserCard ────────────────────────────────────────────────────────
function PremiumTeaserCard({ title, description, emoji, onPress, delay }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(450)}
      style={styles.premiumCard}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.premiumCardTouchable}
        accessibilityRole="button"
        accessibilityLabel={`${title} — premium feature`}
      >
        {/* Preview content (blurred) */}
        <View style={styles.premiumPreviewArea}>
          <LinearGradient
            colors={['rgba(123,94,167,0.25)', 'rgba(192,132,252,0.15)']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.premiumPreviewEmoji}>{emoji}</Text>
          <View style={styles.premiumPreviewDots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.premiumPreviewDot} />
            ))}
          </View>
          <View style={styles.premiumPreviewLines}>
            {[80, 60, 70, 50].map((w, i) => (
              <View key={i} style={[styles.premiumPreviewLine, { width: `${w}%` }]} />
            ))}
          </View>
        </View>

        {/* Blur overlay */}
        <BlurView
          intensity={18}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />

        {/* Lock overlay content */}
        <View style={styles.premiumLockOverlay}>
          <View style={styles.premiumLockBadge}>
            <Text style={styles.premiumLockIcon}>🔒</Text>
          </View>
          <Text style={styles.premiumCardTitle}>{title}</Text>
          <Text style={styles.premiumCardDesc}>{description}</Text>
          <View style={styles.premiumUpgradeTag}>
            <Text style={styles.premiumUpgradeText}>✨ Upgrade to unlock</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const user = useDreamStore((s) => s.user);
  const dreams = useDreamStore((s) => s.dreams);
  const setDreams = useDreamStore((s) => s.setDreams);
  const setCurrentDream = useDreamStore((s) => s.setCurrentDream);
  const isPremium = useDreamStore((s) => s.isPremium);

  const lastDream = dreams.length > 0 ? dreams[0] : null;
  const streak = getDreamStreak(dreams);
  const greeting = getGreeting();
  const displayName =
    user?.user_metadata?.full_name?.split(' ')[0] ??
    user?.name?.split(' ')[0] ??
    'Dreamer';
  const todayFormatted = formatDate(new Date());

  // ── Load dreams on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    getDreams(user.id)
      .then((data) => {
        if (!cancelled) setDreams(data);
      })
      .catch((err) =>
        console.warn('[HomeScreen] getDreams failed:', err)
      );

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ── Navigation handlers ───────────────────────────────────────────────────
  const handleRecord = useCallback(() => {
    navigation.navigate('Record');
  }, [navigation]);

  const handleViewDreamDetail = useCallback(() => {
    if (!lastDream) return;
    setCurrentDream(lastDream);
    navigation.navigate('DreamDetail', { dreamId: lastDream.id });
  }, [lastDream, navigation, setCurrentDream]);

  const handlePremiumTap = useCallback(() => {
    navigation.navigate('Paywall');
  }, [navigation]);

  const handleSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {/* ── Header ── */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.header}
          >
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>
                {greeting},{' '}
                <Text style={styles.greetingName}>{displayName}</Text>
              </Text>
              <Text style={styles.dateText}>{todayFormatted}</Text>
            </View>
            <TouchableOpacity
              onPress={handleSettings}
              style={styles.settingsButton}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Streak card ── */}
          <StreakCard streak={streak} />

          {/* ── Last dream preview ── */}
          <LastDreamCard
            dream={lastDream}
            onViewDetails={handleViewDreamDetail}
            onRecordFirst={handleRecord}
          />

          {/* ── Record button ── */}
          <Animated.View
            entering={FadeIn.delay(400).duration(500)}
          >
            <RecordButton onPress={handleRecord} />
          </Animated.View>

          {/* ── Premium teasers ── */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(450)}
            style={styles.premiumSection}
          >
            <Text style={styles.sectionLabel}>PREMIUM FEATURES</Text>
            <View style={styles.premiumRow}>
              <PremiumTeaserCard
                title="Dreamscape Map"
                description="Visualize your dream world"
                emoji="🗺️"
                onPress={handlePremiumTap}
                delay={550}
              />
              <PremiumTeaserCard
                title="Pattern Analysis"
                description="Uncover hidden themes"
                emoji="🔮"
                onPress={handlePremiumTap}
                delay={650}
              />
            </View>
          </Animated.View>

          {/* Bottom padding for tab bar */}
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.2,
  },
  greetingName: {
    color: COLORS.text,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.20)',
  },
  settingsIcon: {
    fontSize: 18,
  },

  // Streak
  streakCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  streakCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
  },
  streakFlame: {
    fontSize: 32,
    marginRight: 12,
  },
  streakTextGroup: {
    flex: 1,
  },
  streakCount: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  streakNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.gold,
  },
  streakSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  streakBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadgeText: {
    fontSize: 20,
  },

  // Last dream card
  lastDreamCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.22)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  lastDreamCardInner: {
    padding: 18,
    borderRadius: 20,
  },
  lastDreamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lastDreamLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  viewDetailsLink: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
  },
  lastDreamTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  lastDreamSummary: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 21,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  emotionChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  symbolTag: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(139,139,174,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139,139,174,0.25)',
  },
  symbolTagText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  emptyRecordButton: {
    backgroundColor: 'rgba(123,94,167,0.25)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.35)',
  },
  emptyRecordButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },

  // Record button section
  recordSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingVertical: 8,
  },
  pulseContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  recordButtonOuter: {
    borderRadius: 50,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 14,
  },
  recordButtonGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    fontSize: 40,
  },
  recordLabel: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.4,
  },

  // Premium teasers
  premiumSection: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  premiumRow: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    height: 170,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.22)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 10,
    elevation: 6,
  },
  premiumCardTouchable: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  premiumPreviewArea: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLORS.card,
  },
  premiumPreviewEmoji: {
    fontSize: 36,
    marginBottom: 8,
    opacity: 0.6,
  },
  premiumPreviewDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    opacity: 0.4,
  },
  premiumPreviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  premiumPreviewLines: {
    width: '100%',
    gap: 5,
    opacity: 0.3,
  },
  premiumPreviewLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.muted,
    alignSelf: 'flex-start',
  },
  premiumLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  premiumLockBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245,158,11,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.40)',
  },
  premiumLockIcon: {
    fontSize: 16,
  },
  premiumCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  premiumCardDesc: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 16,
  },
  premiumUpgradeTag: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  premiumUpgradeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gold,
  },

  // Bottom padding for tab bar
  bottomPad: {
    height: Platform.OS === 'ios' ? 24 : 16,
  },
});
