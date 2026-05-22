import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store';
import PremiumGate from '../../components/PremiumGate';
import DreamCard from '../../components/DreamCard';
import { getEmotionColor } from '../../utils';

const COLORS = {
  background: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  text: '#F1F0FF',
  muted: '#8B8BAE',
};

const EMOTION_FILTERS = ['Joy', 'Fear', 'Peace', 'Sadness', 'Confusion', 'Anxiety'];
const SYMBOL_FILTERS = ['Water', 'Flying', 'House', 'People', 'Animals', 'Darkness'];

export default function SearchScreen() {
  const navigation = useNavigation();
  const dreams = useStore((s) => s.dreams);
  const [query, setQuery] = useState('');
  const [activeEmotions, setActiveEmotions] = useState([]);
  const [activeSymbols, setActiveSymbols] = useState([]);

  const toggleEmotion = (e) => {
    setActiveEmotions((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  };

  const toggleSymbol = (s) => {
    setActiveSymbols((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const results = useMemo(() => {
    if (!query.trim() && activeEmotions.length === 0 && activeSymbols.length === 0) return [];
    const q = query.toLowerCase();
    return dreams.filter((dream) => {
      const matchesQuery =
        !q ||
        (dream.transcript || '').toLowerCase().includes(q) ||
        (dream.ai_summary || '').toLowerCase().includes(q);

      const tags = dream.tags || [];
      const matchesEmotion =
        activeEmotions.length === 0 ||
        activeEmotions.some((e) =>
          tags.some((t) => t.type === 'emotion' && t.label.toLowerCase() === e.toLowerCase())
        );
      const matchesSymbol =
        activeSymbols.length === 0 ||
        activeSymbols.some((s) =>
          tags.some((t) => t.type === 'symbol' && t.label.toLowerCase() === s.toLowerCase())
        );

      return matchesQuery && matchesEmotion && matchesSymbol;
    });
  }, [query, activeEmotions, activeSymbols, dreams]);

  const hasFilters = query.trim() || activeEmotions.length > 0 || activeSymbols.length > 0;

  const renderItem = useCallback(
    ({ item }) => (
      <DreamCard
        dream={item}
        tags={item.tags || []}
        onPress={() => navigation.navigate('DreamDetail', { dreamId: item.id })}
      />
    ),
    [navigation]
  );

  return (
    <PremiumGate featureName="Semantic Search">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Search bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your dreams..."
              placeholderTextColor={COLORS.muted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {EMOTION_FILTERS.map((e) => {
              const active = activeEmotions.includes(e);
              const color = getEmotionColor(e);
              return (
                <TouchableOpacity
                  key={e}
                  onPress={() => toggleEmotion(e)}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: color + '30', borderColor: color },
                  ]}
                >
                  <Text style={[styles.filterChipText, active && { color }]}>{e}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.filterDivider} />
            {SYMBOL_FILTERS.map((s) => {
              const active = activeSymbols.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleSymbol(s)}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: COLORS.primary + '30', borderColor: COLORS.accent },
                  ]}
                >
                  <Text style={[styles.filterChipText, active && { color: COLORS.accent }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Results */}
        {!hasFilters ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Search your dream archive</Text>
            <Text style={styles.emptySubtitle}>Search by keywords, emotions, or symbols</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌑</Text>
            <Text style={styles.emptyTitle}>No dreams match</Text>
            <Text style={styles.emptySubtitle}>
              Try different keywords or remove some filters
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.resultsCount}>
                {results.length} dream{results.length !== 1 ? 's' : ''} found
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBarContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.3)',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16 },
  filtersSection: { paddingBottom: 8 },
  filtersScroll: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.4)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterChipText: { color: COLORS.muted, fontSize: 13, fontWeight: '500' },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(123,94,167,0.3)',
    marginHorizontal: 4,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { color: COLORS.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  listContent: { padding: 16, paddingBottom: 32 },
  resultsCount: { color: COLORS.muted, fontSize: 13, marginBottom: 12 },
});
