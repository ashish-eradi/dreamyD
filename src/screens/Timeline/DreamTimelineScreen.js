// =============================================================================
// DreamDiary — DreamTimelineScreen
// =============================================================================
// Full dream list with emotion/symbol filter chips, skeleton loading,
// and an empty state. Dreams are loaded from Supabase on mount and filtered
// client-side. Tapping a card navigates to DreamDetail.
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useDreamStore } from '../../store';
import { getDreams } from '../../services/supabase';
import {
  formatDate,
  getEmotionColor,
  getTopEmotion,
  getTopSymbols,
  truncateText,
} from '../../utils';

// =============================================================================
// Constants
// =============================================================================

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
  border: 'rgba(123, 94, 167, 0.25)',
  cardBorder: 'rgba(241, 240, 255, 0.06)',
};

const EMOTION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'joy', label: 'Joy' },
  { id: 'fear', label: 'Fear' },
  { id: 'peace', label: 'Peace' },
  { id: 'sadness', label: 'Sadness' },
  { id: 'love', label: 'Love' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'confusion', label: 'Confusion' },
];

// =============================================================================
// SkeletonCard — shimmer placeholder while loading
// =============================================================================

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.65],
  });

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.skeletonDate, { opacity }]} />
      <Animated.View style={[styles.skeletonTitle, { opacity }]} />
      <Animated.View style={[styles.skeletonTitleShort, { opacity }]} />
      <View style={styles.skeletonRow}>
        <Animated.View style={[styles.skeletonChip, { opacity }]} />
        <Animated.View style={[styles.skeletonChipOutlined, { opacity }]} />
        <Animated.View style={[styles.skeletonChipOutlined, { opacity }]} />
      </View>
    </View>
  );
}

// =============================================================================
// FilterChip
// =============================================================================

function FilterChip({ label, active, color, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.filterChip,
        active && {
          backgroundColor: color ?? COLORS.primary,
          borderColor: color ?? COLORS.primary,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// DreamCard
// =============================================================================

function DreamCard({ dream, onPress }) {
  const tags = dream.dream_tags ?? [];
  const topEmotion = getTopEmotion(tags);
  const topSymbols = getTopSymbols(tags, 2);
  const emotionColor = topEmotion
    ? getEmotionColor(topEmotion.label)
    : COLORS.muted;

  const summary = dream.ai_summary ?? dream.transcript ?? '';
  const dateStr = formatDate(dream.recorded_at ?? dream.created_at);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Dream recorded on ${dateStr}`}
    >
      {/* Date */}
      <Text style={styles.cardDate}>{dateStr}</Text>

      {/* Summary */}
      <Text style={styles.cardSummary} numberOfLines={2}>
        {truncateText(summary, 120) || 'No summary yet'}
      </Text>

      {/* Bottom row: emotion chip + symbol tags + chevron */}
      <View style={styles.cardBottom}>
        <View style={styles.cardTagsRow}>
          {topEmotion && (
            <View
              style={[
                styles.emotionChip,
                { backgroundColor: `${emotionColor}25`, borderColor: `${emotionColor}60` },
              ]}
            >
              <View
                style={[styles.emotionDot, { backgroundColor: emotionColor }]}
              />
              <Text
                style={[styles.emotionChipText, { color: emotionColor }]}
              >
                {topEmotion.label.charAt(0).toUpperCase() +
                  topEmotion.label.slice(1)}
              </Text>
            </View>
          )}

          {topSymbols.map((symbol) => (
            <View key={symbol.id ?? symbol.label} style={styles.symbolChip}>
              <Text style={styles.symbolChipText}>
                {symbol.label.charAt(0).toUpperCase() + symbol.label.slice(1)}
              </Text>
            </View>
          ))}
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// EmptyState
// =============================================================================

function EmptyState({ onRecord }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyMoon}>🌙</Text>
      <Text style={styles.emptyTitle}>No dreams yet</Text>
      <Text style={styles.emptySubtitle}>
        Start recording your dreams to see them here
      </Text>
      <TouchableOpacity
        onPress={onRecord}
        activeOpacity={0.85}
        style={styles.emptyButtonWrapper}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#7B5EA7', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="mic" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.emptyButtonText}>Record Your First Dream</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// =============================================================================
// FilterModal
// =============================================================================

function FilterModal({ visible, activeEmotion, onSelect, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.filterModalSheet}>
          <View style={styles.filterModalHandle} />
          <Text style={styles.filterModalTitle}>Filter by Emotion</Text>

          <View style={styles.filterModalGrid}>
            {EMOTION_FILTERS.map((f) => {
              const color =
                f.id === 'all' ? COLORS.primary : getEmotionColor(f.id);
              const active = activeEmotion === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => {
                    onSelect(f.id);
                    onClose();
                  }}
                  activeOpacity={0.75}
                  style={[
                    styles.filterModalChip,
                    active && {
                      backgroundColor: `${color}30`,
                      borderColor: color,
                    },
                  ]}
                >
                  {f.id !== 'all' && (
                    <View
                      style={[
                        styles.filterModalDot,
                        { backgroundColor: color },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.filterModalChipText,
                      active && { color: color, fontWeight: '700' },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.filterModalClose}
            activeOpacity={0.8}
          >
            <Text style={styles.filterModalCloseText}>Done</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// =============================================================================
// DreamTimelineScreen
// =============================================================================

export default function DreamTimelineScreen() {
  const navigation = useNavigation();

  // Store
  const user = useDreamStore((s) => s.user);
  const storeDreams = useDreamStore((s) => s.dreams);
  const setDreams = useDreamStore((s) => s.setDreams);

  // Local state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeEmotion, setActiveEmotion] = useState('all');
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  // Collect unique symbol labels from all loaded dreams
  const availableSymbols = useMemo(() => {
    const symbolSet = new Set();
    storeDreams.forEach((dream) => {
      (dream.dream_tags ?? []).forEach((tag) => {
        if (tag.type === 'symbol' && tag.label) {
          symbolSet.add(tag.label.toLowerCase());
        }
      });
    });
    return Array.from(symbolSet).slice(0, 12);
  }, [storeDreams]);

  // Apply filters client-side
  const filteredDreams = useMemo(() => {
    let result = storeDreams;

    if (activeEmotion !== 'all') {
      result = result.filter((dream) => {
        const tags = dream.dream_tags ?? [];
        return tags.some(
          (t) =>
            t.type === 'emotion' &&
            t.label?.toLowerCase() === activeEmotion.toLowerCase()
        );
      });
    }

    if (activeSymbol) {
      result = result.filter((dream) => {
        const tags = dream.dream_tags ?? [];
        return tags.some(
          (t) =>
            t.type === 'symbol' &&
            t.label?.toLowerCase() === activeSymbol.toLowerCase()
        );
      });
    }

    return result;
  }, [storeDreams, activeEmotion, activeSymbol]);

  // ---------------------------------------------------------------------------
  // Load dreams
  // ---------------------------------------------------------------------------

  const loadDreams = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await getDreams(user.id);
        setDreams(data);
      } catch (err) {
        console.error('[DreamTimeline] loadDreams error:', err);
        setError('Failed to load dreams. Pull down to retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, setDreams]
  );

  useEffect(() => {
    loadDreams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDreams(true);
  }, [loadDreams]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const handleDreamPress = useCallback(
    (dreamId) => {
      navigation.navigate('DreamDetail', { dreamId });
    },
    [navigation]
  );

  const handleRecordPress = useCallback(() => {
    navigation.navigate('Record');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }) => (
      <DreamCard dream={item} onPress={() => handleDreamPress(item.id)} />
    ),
    [handleDreamPress]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dream Journal</Text>
          <View style={styles.headerRight}>
            {activeEmotion !== 'all' || activeSymbol ? (
              <TouchableOpacity
                onPress={() => {
                  setActiveEmotion('all');
                  setActiveSymbol(null);
                }}
                style={styles.clearFilterBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
              >
                <Text style={styles.clearFilterText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => setFilterModalVisible(true)}
              style={styles.filterIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Open filter menu"
            >
              <Ionicons
                name="options-outline"
                size={22}
                color={
                  activeEmotion !== 'all' || activeSymbol
                    ? COLORS.accent
                    : COLORS.muted
                }
              />
              {(activeEmotion !== 'all' || activeSymbol) && (
                <View style={styles.filterBadge} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Filter chips bar ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          style={styles.filterBarScroll}
        >
          {/* Emotion filters */}
          {EMOTION_FILTERS.map((f) => {
            const color =
              f.id === 'all' ? COLORS.primary : getEmotionColor(f.id);
            return (
              <FilterChip
                key={f.id}
                label={f.label}
                active={activeEmotion === f.id && !activeSymbol}
                color={color}
                onPress={() => {
                  setActiveEmotion(f.id);
                  setActiveSymbol(null);
                }}
              />
            );
          })}

          {/* Separator */}
          {availableSymbols.length > 0 && (
            <View style={styles.filterSeparator} />
          )}

          {/* Symbol filters */}
          {availableSymbols.map((sym) => (
            <FilterChip
              key={`sym-${sym}`}
              label={
                sym.charAt(0).toUpperCase() + sym.slice(1)
              }
              active={activeSymbol === sym}
              color={COLORS.accent}
              onPress={() => {
                setActiveSymbol(activeSymbol === sym ? null : sym);
                if (activeSymbol !== sym) setActiveEmotion('all');
              }}
            />
          ))}
        </ScrollView>

        {/* ── Dream count ── */}
        {!loading && filteredDreams.length > 0 && (
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {filteredDreams.length}{' '}
              {filteredDreams.length === 1 ? 'dream' : 'dreams'}
              {activeEmotion !== 'all' || activeSymbol ? ' (filtered)' : ''}
            </Text>
          </View>
        )}

        {/* ── Error banner ── */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color="#EF4444"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── List / Skeleton / Empty ── */}
        {loading ? (
          <FlatList
            data={[1, 2, 3]}
            keyExtractor={(item) => String(item)}
            renderItem={() => <SkeletonCard />}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        ) : (
          <FlatList
            data={filteredDreams}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              filteredDreams.length === 0 && styles.listContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.accent}
                colors={[COLORS.accent]}
              />
            }
            ListEmptyComponent={
              <EmptyState onRecord={handleRecordPress} />
            }
            ItemSeparatorComponent={() => (
              <View style={styles.itemSeparator} />
            )}
          />
        )}
      </SafeAreaView>

      {/* ── Filter Modal ── */}
      <FilterModal
        visible={filterModalVisible}
        activeEmotion={activeEmotion}
        onSelect={(id) => {
          setActiveEmotion(id);
          setActiveSymbol(null);
        }}
        onClose={() => setFilterModalVisible(false)}
      />
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
  },
  clearFilterText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accent,
  },

  // ── Filter bar ───────────────────────────────────────────────────────────────
  filterBarScroll: {
    maxHeight: 52,
    flexGrow: 0,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 139, 174, 0.35)',
    backgroundColor: 'transparent',
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterSeparator: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(139, 139, 174, 0.25)',
    marginHorizontal: 2,
  },

  // ── Count row ────────────────────────────────────────────────────────────────
  countRow: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  countText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },

  // ── Error banner ─────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    paddingTop: 4,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  itemSeparator: {
    height: 10,
  },

  // ── DreamCard ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDate: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  cardSummary: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  emotionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emotionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  symbolChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 139, 174, 0.40)',
    backgroundColor: 'transparent',
  },
  symbolChipText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  skeletonDate: {
    width: 140,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.muted,
    marginBottom: 10,
  },
  skeletonTitle: {
    width: '95%',
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.muted,
    marginBottom: 6,
  },
  skeletonTitleShort: {
    width: '60%',
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.muted,
    marginBottom: 14,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  skeletonChip: {
    width: 72,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.muted,
  },
  skeletonChipOutlined: {
    width: 54,
    height: 24,
    borderRadius: 10,
    backgroundColor: COLORS.muted,
  },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyMoon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButtonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Filter Modal ──────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  filterModalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  filterModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(139, 139, 174, 0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  filterModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  filterModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 139, 174, 0.35)',
    gap: 6,
  },
  filterModalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterModalChipText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
  },
  filterModalClose: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
  },
  filterModalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
