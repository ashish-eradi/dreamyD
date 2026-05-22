// Search screen — V3 warm paper design.
// Premium-gated full-text search across transcripts, summaries, and tags.
import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { COLORS, MOODS } from '../../constants/theme';

const EMOTION_FILTERS = ['wonder', 'calm', 'fear', 'melan', 'joy'];

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dreams = useDreamStore(s => s.dreams) || [];
  const isPremium = useDreamStore(s => s.isPremium);

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const results = useMemo(() => {
    if (!isPremium) return [];
    const ql = q.toLowerCase();
    return dreams.filter(d => {
      const matchQ = !q
        || (d.ai_summary || '').toLowerCase().includes(ql)
        || (d.transcript || '').toLowerCase().includes(ql)
        || (d.dream_tags || []).some(t => t.label?.toLowerCase().includes(ql));
      const matchF = filter === 'all' || (d.dream_tags || []).some(t => t.type === 'emotion' && t.label?.toLowerCase() === filter);
      return matchQ && matchF;
    });
  }, [dreams, q, filter, isPremium]);

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch { return ''; }
  };

  if (!isPremium) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Search</Text>
        </View>
        <View style={styles.upsellWrap}>
          <Text style={styles.upsellGlyph}>⌕</Text>
          <Text style={styles.upsellTitle}>Semantic dream search</Text>
          <Text style={styles.upsellBody}>Find any moment, symbol, or feeling across your entire journal — premium only.</Text>
          <TouchableOpacity style={styles.upsellBtn} onPress={() => navigation.navigate('Paywall')}>
            <Text style={styles.upsellBtnText}>Unlock for ₹179/mo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <Text style={styles.pageTitle}>Search</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder='Search "water" or "falling"…'
            placeholderTextColor={COLORS.ink3}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Emotion filters */}
        <View style={styles.filters}>
          {(['all', ...EMOTION_FILTERS]).map(f => {
            const active = filter === f;
            const m = f !== 'all' ? MOODS[f] : null;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f === 'all' ? 'All' : (m?.label || f)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={d => d.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{q || filter !== 'all' ? 'Nothing matches.' : 'Start searching.'}</Text>
            <Text style={styles.emptyBody}>{q || filter !== 'all' ? 'Try a different word.' : 'Type a word, symbol, or emotion above.'}</Text>
          </View>
        }
        renderItem={({ item: d }) => {
          const moodTag = (d.dream_tags || []).find(t => t.type === 'emotion');
          const mood = moodTag?.label?.toLowerCase() || 'calm';
          const m = MOODS[mood] || MOODS.calm;
          return (
            <TouchableOpacity
              style={styles.dreamCard}
              onPress={() => navigation.navigate('DreamDetail', { dreamId: d.id })}
              activeOpacity={0.8}
            >
              <View style={[styles.moodTile, { backgroundColor: m.bg }]}>
                <Text style={{ fontSize: 18, color: m.color }}>{m.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.dreamCardRow}>
                  <Text style={styles.dreamTitle} numberOfLines={1}>
                    {d.ai_summary?.split('.')[0] || 'Untitled'}
                  </Text>
                  <Text style={styles.dreamDate}>{formatDate(d.recorded_at)}</Text>
                </View>
                <Text style={styles.dreamSnippet} numberOfLines={2}>
                  {d.ai_summary || d.transcript || ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  pageTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, marginBottom: 12, marginTop: 8,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
  },
  searchIcon: { fontSize: 16, color: COLORS.ink3 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.ink },
  clearBtn: { fontSize: 14, color: COLORS.ink3 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
  },
  filterChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  filterChipText: { fontSize: 13, fontWeight: '500', color: COLORS.ink2 },
  filterChipTextActive: { color: COLORS.bg2 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 22, fontWeight: '500',
    color: COLORS.ink2, marginBottom: 8,
  },
  emptyBody: { fontSize: 14, color: COLORS.ink3 },
  dreamCard: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 10,
  },
  moodTile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dreamCardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dreamTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 16, fontWeight: '500', color: COLORS.ink, flex: 1,
  },
  dreamDate: { fontSize: 12, color: COLORS.ink3, marginLeft: 8 },
  dreamSnippet: { fontSize: 14, color: COLORS.ink2, lineHeight: 20 },
  upsellWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  upsellGlyph: { fontSize: 48, marginBottom: 16, color: COLORS.ink3 },
  upsellTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 22, fontWeight: '500',
    color: COLORS.ink, marginBottom: 10, textAlign: 'center',
  },
  upsellBody: { fontSize: 15, color: COLORS.ink2, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  upsellBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: COLORS.ink,
  },
  upsellBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.bg2 },
});
