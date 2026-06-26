import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, FlatList, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { COLORS, MOODS } from '../../constants/theme';

// ─── Filter data ──────────────────────────────────────────────────────────────

const EMOTION_FILTERS = Object.entries(MOODS).map(([key, val]) => ({
  key,
  label: val.label,
  color: val.color,
  bg: val.bg,
}));

// ─── DreamRow ─────────────────────────────────────────────────────────────────

function DreamRow({ dream, onPress }) {
  const tags      = dream.dream_tags ?? [];
  const emotions  = tags.filter(t => t.type === 'emotion').slice(0, 2);
  const title     = dream.title || dream.ai_summary?.split('.')[0] || 'Untitled dream';
  const snippet   = dream.ai_summary || dream.transcript || '';
  const dateStr   = dream.recorded_at
    ? new Date(dream.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return (
    <TouchableOpacity style={styles.dreamRow} onPress={onPress} activeOpacity={0.78}>
      <View style={styles.dreamRowInner}>
        <View style={styles.dreamRowTop}>
          <Text style={styles.dreamDate}>{dateStr}</Text>
          {emotions.map((e, i) => {
            const m = MOODS[e.label?.toLowerCase()] || {};
            return (
              <View key={i} style={[styles.emotionPill, { backgroundColor: m.bg ?? COLORS.bg2 }]}>
                <Text style={[styles.emotionPillText, { color: m.color ?? COLORS.ink3 }]}>
                  {m.label ?? e.label}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.dreamTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.dreamSnippet} numberOfLines={2}>{snippet}</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

// ─── SearchScreen ─────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const dreams     = useDreamStore(s => s.dreams);

  const [query,         setQuery]         = useState('');
  const [activeEmotion, setActiveEmotion] = useState(null);

  const filtered = useMemo(() => {
    if (!query.trim() && !activeEmotion) return dreams;

    const q = query.trim().toLowerCase();

    return dreams.filter(dream => {
      if (q) {
        const haystack = [dream.title, dream.ai_summary, dream.transcript]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (activeEmotion) {
        const tags = dream.dream_tags ?? [];
        if (!tags.some(t => t.type === 'emotion' && t.label?.toLowerCase() === activeEmotion)) {
          return false;
        }
      }
      return true;
    });
  }, [dreams, query, activeEmotion]);

  const handleDreamPress = useCallback((dream) => {
    navigation.navigate('DreamDetail', { dreamId: dream.id });
  }, [navigation]);

  const toggleEmotion = (key) => setActiveEmotion(prev => prev === key ? null : key);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search dreams, themes, symbols…"
            placeholderTextColor={COLORS.ink3}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Emotion filter chips */}
      <View style={styles.filtersRow}>
        <FlatList
          data={EMOTION_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => {
            const active = activeEmotion === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: active ? item.color : item.bg },
                ]}
                onPress={() => toggleEmotion(item.key)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: active ? '#fff' : item.color },
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 20 : 24 },
        ]}
        renderItem={({ item }) => (
          <DreamRow dream={item} onPress={() => handleDreamPress(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>◎</Text>
            <Text style={styles.emptyTitle}>
              {query || activeEmotion ? 'No dreams match' : 'No dreams yet'}
            </Text>
            <Text style={styles.emptySub}>
              {query || activeEmotion
                ? 'Try a different word or clear the filters above'
                : 'Record your first dream to start searching'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Result count */}
      {(query.trim() || activeEmotion) && filtered.length > 0 && (
        <View style={[styles.countBar, { bottom: insets.bottom + 8 }]}>
          <Text style={styles.countText}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: COLORS.ink },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.line,
    paddingHorizontal: 12, height: 44,
  },
  searchIcon:  { fontSize: 18, color: COLORS.ink3, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.ink },

  filtersRow: { paddingVertical: 4 },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  filterChipText: { fontSize: 12.5, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  dreamRow: {
    backgroundColor: COLORS.card,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.line,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  dreamRowInner: { flex: 1 },
  dreamRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dreamDate: { fontSize: 11, color: COLORS.ink4, fontWeight: '500' },
  emotionPill: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  emotionPillText: { fontSize: 10, fontWeight: '600' },
  dreamTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 15, fontWeight: '500',
    color: COLORS.ink, marginBottom: 3, lineHeight: 20,
  },
  dreamSnippet: { fontSize: 12.5, color: COLORS.ink3, lineHeight: 17 },
  arrow: { fontSize: 14, color: COLORS.ink4 },

  separator: { height: 8 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyGlyph: { fontSize: 36, color: COLORS.ink4, marginBottom: 14 },
  emptyTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 18,
    color: COLORS.ink, marginBottom: 8,
  },
  emptySub: {
    fontSize: 14, color: COLORS.ink3,
    textAlign: 'center', lineHeight: 20,
  },

  countBar: {
    position: 'absolute', left: 0, right: 0,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12, color: COLORS.ink3,
    backgroundColor: COLORS.card,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.line,
    overflow: 'hidden',
  },
});
