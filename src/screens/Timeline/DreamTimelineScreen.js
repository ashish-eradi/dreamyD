// =============================================================================
// DreamDiary V3 — DreamTimelineScreen (Journal / Feed)
// =============================================================================
// Warm paper / cream aesthetic.
// Header, search bar, mood filter chips, and a FlatList of dream cards.
// =============================================================================

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useDreamStore } from '../../store';
import { getDreams } from '../../services/supabase';
import { formatDate, getTopEmotion, getTopSymbols } from '../../utils';
import { COLORS, MOODS, getMoodStyle, getSymbolStyle } from '../../constants/theme';

// =============================================================================
// Constants
// =============================================================================

const MOOD_FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'wonder', label: 'Wonder' },
  { id: 'fear',   label: 'Anxious' },
  { id: 'calm',   label: 'Calm' },
  { id: 'melan',  label: 'Tender' },
];

// =============================================================================
// FilterChip
// =============================================================================

function FilterChip({ label, active, moodKey, onPress }) {
  const moodStyle = moodKey ? getMoodStyle(moodKey) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.filterChip,
        active
          ? { backgroundColor: COLORS.ink, borderColor: COLORS.ink }
          : { backgroundColor: COLORS.card, borderColor: COLORS.line2 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {moodStyle && active && (
        <View
          style={[
            styles.filterChipDot,
            { backgroundColor: COLORS.bg2 },
          ]}
        />
      )}
      <Text
        style={[
          styles.filterChipText,
          active ? styles.filterChipTextActive : styles.filterChipTextInactive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// DreamListCard  (inline card for the feed)
// =============================================================================

function DreamListCard({ dream, onPress }) {
  const tags       = dream.dream_tags ?? [];
  const topEmotion = getTopEmotion(tags);
  const topSymbols = getTopSymbols(tags, 3);

  const title   = dream.title ?? 'Untitled Dream';
  const snippet = dream.ai_summary ?? dream.transcript ?? '';
  const dateStr = formatDate(dream.recorded_at ?? dream.created_at);

  const moodStyle = getMoodStyle(topEmotion?.label ?? null);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={styles.dreamCard}
      accessibilityRole="button"
      accessibilityLabel={`Dream: ${title}, recorded on ${dateStr}`}
    >
      <View style={styles.dreamCardInner}>
        {/* Mood tile */}
        <View
          style={[
            styles.moodTile,
            { backgroundColor: moodStyle.bg },
          ]}
        >
          <Text style={[styles.moodEmoji, { color: moodStyle.color }]}>
            {moodStyle.emoji}
          </Text>
        </View>

        {/* Text block */}
        <View style={styles.dreamCardContent}>
          {/* Title + date */}
          <View style={styles.dreamCardTopRow}>
            <Text style={styles.dreamCardTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.dreamCardDate} numberOfLines={1}>
              {dateStr}
            </Text>
          </View>

          {/* Snippet */}
          {snippet.length > 0 && (
            <Text style={styles.dreamCardSnippet} numberOfLines={2}>
              {snippet}
            </Text>
          )}

          {/* Symbol pills */}
          {topSymbols.length > 0 && (
            <View style={styles.symbolsRow}>
              {topSymbols.map((sym) => {
                const symStyle = getSymbolStyle(sym.label);
                return (
                  <View
                    key={sym.id ?? sym.label}
                    style={[
                      styles.symbolPill,
                      { backgroundColor: symStyle.bg },
                    ]}
                  >
                    <Text style={[styles.symbolPillText, { color: symStyle.color }]}>
                      {sym.label.charAt(0).toUpperCase() + sym.label.slice(1)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// EmptyState
// =============================================================================

function EmptyState({ isFiltered }) {
  return (
    <View style={styles.emptyState}>
      {isFiltered ? (
        <>
          <Text style={styles.emptyTitle}>Nothing matches.</Text>
          <Text style={styles.emptySub}>Try a different word.</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>Your journal awaits.</Text>
          <Text style={styles.emptySub}>Record your first dream to begin.</Text>
        </>
      )}
    </View>
  );
}

// =============================================================================
// DreamTimelineScreen
// =============================================================================

export default function DreamTimelineScreen() {
  const navigation = useNavigation();

  // Store
  const user       = useDreamStore((s) => s.user);
  const storeDreams = useDreamStore((s) => s.dreams);
  const setDreams  = useDreamStore((s) => s.setDreams);

  // Local state
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeMood, setActiveMood] = useState('all');

  // ── Load dreams ─────────────────────────────────────────────────────────────

  const loadDreams = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) setLoading(true);
      try {
        const data = await getDreams(user.id);
        setDreams(data);
      } catch (err) {
        console.error('[DreamTimeline] loadDreams error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, setDreams]
  );

  useEffect(() => {
    loadDreams();
  }, [user?.id]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDreams(true);
  }, [loadDreams]);

  // ── Filter + search ─────────────────────────────────────────────────────────

  const filteredDreams = useMemo(() => {
    let result = storeDreams;

    // Mood filter
    if (activeMood !== 'all') {
      result = result.filter((dream) => {
        const tags = dream.dream_tags ?? [];
        return tags.some((t) => {
          if (t.type !== 'emotion') return false;
          const moodStyle = getMoodStyle(t.label);
          // Check if the resolved MOODS key matches activeMood
          const resolvedKey = Object.keys(MOODS).find(
            (k) => MOODS[k].label === moodStyle.label
          );
          return resolvedKey === activeMood;
        });
      });
    }

    // Search filter
    const q = searchText.trim().toLowerCase();
    if (q.length > 0) {
      result = result.filter((dream) => {
        const title   = (dream.title ?? '').toLowerCase();
        const summary = (dream.ai_summary ?? '').toLowerCase();
        const trans   = (dream.transcript ?? '').toLowerCase();
        const symbols = (dream.dream_tags ?? [])
          .filter((t) => t.type === 'symbol')
          .map((t) => (t.label ?? '').toLowerCase())
          .join(' ');
        return (
          title.includes(q) ||
          summary.includes(q) ||
          trans.includes(q) ||
          symbols.includes(q)
        );
      });
    }

    return result;
  }, [storeDreams, activeMood, searchText]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const handleDreamPress = useCallback(
    (dreamId) => navigation.navigate('DreamDetail', { dreamId }),
    [navigation]
  );

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }) => (
      <DreamListCard
        dream={item}
        onPress={() => handleDreamPress(item.id)}
      />
    ),
    [handleDreamPress]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const isFiltered = activeMood !== 'all' || searchText.trim().length > 0;
  const entryCount = storeDreams.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'} · last 90 days
          </Text>
          <Text style={styles.headerTitle}>Your journal</Text>
        </View>

        {/* ── Search bar ── */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search dreams, symbols…"
              placeholderTextColor={COLORS.ink4}
              returnKeyType="search"
              clearButtonMode="never"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Text style={styles.searchClear}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          style={styles.filterBarScroll}
        >
          {MOOD_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              moodKey={f.id !== 'all' ? f.id : null}
              active={activeMood === f.id}
              onPress={() => setActiveMood(f.id)}
            />
          ))}
        </ScrollView>

        {/* ── Dream list ── */}
        <FlatList
          data={filteredDreams}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            filteredDreams.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.peach}
              colors={[COLORS.peach]}
            />
          }
          ListEmptyComponent={
            loading ? null : <EmptyState isFiltered={isFiltered} />
          }
        />
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop:        16,
    paddingBottom:     14,
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

  // ── Search ───────────────────────────────────────────────────────────────────
  searchWrap: {
    paddingHorizontal: 20,
    marginBottom:      12,
  },
  searchBar: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.card,
    borderRadius:    999,
    borderWidth:     1,
    borderColor:     COLORS.line,
    paddingHorizontal: 16,
    paddingVertical:   10,
    gap:             8,
  },
  searchIcon: {
    fontSize: 18,
    color:    COLORS.ink3,
  },
  searchInput: {
    flex:       1,
    fontSize:   15,
    color:      COLORS.ink,
    padding:    0,
    margin:     0,
  },
  searchClear: {
    fontSize:   20,
    color:      COLORS.ink3,
    lineHeight: 20,
  },

  // ── Filter chips ─────────────────────────────────────────────────────────────
  filterBarScroll: {
    maxHeight: 50,
    flexGrow:  0,
    marginBottom: 8,
  },
  filterBar: {
    paddingHorizontal: 20,
    gap:               8,
    alignItems:        'center',
  },
  filterChip: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      999,
    borderWidth:       1,
    gap:               5,
  },
  filterChipDot: {
    width:        5,
    height:       5,
    borderRadius: 3,
  },
  filterChipText: {
    fontSize:   13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.bg2,
  },
  filterChipTextInactive: {
    color: COLORS.ink2,
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 20,
    paddingBottom:     Platform.OS === 'ios' ? 100 : 80,
    paddingTop:        4,
  },
  listContentEmpty: {
    flexGrow:       1,
    justifyContent: 'center',
  },
  itemSeparator: {
    height: 12,
  },

  // ── Dream card ────────────────────────────────────────────────────────────────
  dreamCard: {
    backgroundColor: COLORS.card,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     COLORS.line,
    padding:         16,
  },
  dreamCardInner: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           14,
  },
  moodTile: {
    width:           44,
    height:          44,
    borderRadius:    12,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  moodEmoji: {
    fontSize:   18,
    fontFamily: 'serif',
  },
  dreamCardContent: {
    flex: 1,
    gap:  3,
  },
  dreamCardTopRow: {
    flexDirection:  'row',
    alignItems:     'baseline',
    justifyContent: 'space-between',
    gap:            8,
  },
  dreamCardTitle: {
    flex:       1,
    fontSize:   18,
    fontWeight: '500',
    color:      COLORS.ink,
    fontFamily: 'serif',
  },
  dreamCardDate: {
    fontSize:  12,
    color:     COLORS.ink3,
    flexShrink: 0,
  },
  dreamCardSnippet: {
    fontSize:   14,
    color:      COLORS.ink2,
    fontFamily: 'serif',
    lineHeight: 21,
  },
  symbolsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginTop:     4,
  },
  symbolPill: {
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  symbolPillText: {
    fontSize:   13,
    fontWeight: '500',
  },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize:     22,
    fontWeight:   '500',
    fontFamily:   'serif',
    color:        COLORS.ink,
    marginBottom: 8,
    textAlign:    'center',
  },
  emptySub: {
    fontSize:  15,
    color:     COLORS.ink3,
    textAlign: 'center',
  },
});
