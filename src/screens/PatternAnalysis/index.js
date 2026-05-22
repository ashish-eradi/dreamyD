import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../../store';
import PremiumGate from '../../components/PremiumGate';
import { getPatterns, savePattern } from '../../services/supabase';
import { detectPatterns } from '../../services/openai';
import { formatShortDate } from '../../utils';

const COLORS = {
  background: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  gold: '#F59E0B',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  success: '#10B981',
};

export default function PatternAnalysisScreen() {
  const navigation = useNavigation();
  const user = useStore((s) => s.user);
  const dreams = useStore((s) => s.dreams);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) loadPatterns();
  }, [user?.id]);

  const loadPatterns = async () => {
    setLoading(true);
    try {
      const data = await getPatterns(user.id);
      setPatterns(data || []);
    } catch {
      setError('Could not load patterns.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (dreams.length < 5) return;
    setAnalyzing(true);
    try {
      const summaries = dreams.map((d) => d.ai_summary).filter(Boolean);
      const detected = await detectPatterns(summaries);
      if (detected?.length) {
        for (const p of detected) {
          await savePattern({ user_id: user.id, ...p });
        }
        await loadPatterns();
      }
    } catch {
      setError('Pattern analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const renderPattern = ({ item }) => (
    <View style={styles.patternCard}>
      <View style={styles.patternHeader}>
        <View style={styles.aiChip}>
          <Text style={styles.aiChipText}>AI Insight</Text>
        </View>
        <Text style={styles.patternDate}>
          {item.generated_at ? formatShortDate(new Date(item.generated_at)) : ''}
        </Text>
      </View>

      <Text style={styles.patternText}>{item.pattern_text}</Text>

      {item.symbols_involved?.length > 0 && (
        <View style={styles.symbolsRow}>
          <Ionicons name="prism-outline" size={14} color={COLORS.muted} style={{ marginRight: 6 }} />
          <ScrollableChips symbols={item.symbols_involved} />
        </View>
      )}

      <View style={styles.patternFooter}>
        <Ionicons name="moon-outline" size={14} color={COLORS.muted} />
        <Text style={styles.dreamCount}>
          Found across {item.dream_count ?? '?'} dreams
        </Text>
      </View>

      <View style={styles.confidenceBar}>
        <View
          style={[
            styles.confidenceFill,
            { width: `${(item.confidence ?? 0.7) * 100}%` },
          ]}
        />
      </View>
    </View>
  );

  return (
    <PremiumGate featureName="Pattern Analysis">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Pattern Analysis</Text>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={10} color={COLORS.accent} />
              <Text style={styles.aiBadgeText}>Powered by AI</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={loadPatterns}
            style={styles.refreshBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={COLORS.accent} size="large" />
          </View>
        ) : (
          <FlatList
            data={patterns}
            keyExtractor={(item) => item.id}
            renderItem={renderPattern}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔮</Text>
                <Text style={styles.emptyTitle}>No patterns yet</Text>
                <Text style={styles.emptySubtitle}>
                  {dreams.length < 5
                    ? `Record ${5 - dreams.length} more dream${5 - dreams.length !== 1 ? 's' : ''} to unlock pattern analysis`
                    : 'Tap "Analyze" to discover recurring themes in your dreams'}
                </Text>
              </View>
            }
            ListFooterComponent={
              dreams.length >= 5 ? (
                <TouchableOpacity
                  style={styles.analyzeBtn}
                  onPress={handleAnalyze}
                  disabled={analyzing}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#7B5EA7', '#C084FC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.analyzeBtnGradient}
                  >
                    {analyzing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="sparkles" size={18} color="#fff" />
                    )}
                    <Text style={styles.analyzeBtnText}>
                      {analyzing ? 'Analyzing...' : 'Analyze New Patterns'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        {error ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </PremiumGate>
  );
}

function ScrollableChips({ symbols }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
      {symbols.map((sym, i) => (
        <View key={i} style={chipStyles.pill}>
          <Text style={chipStyles.text}>{sym}</Text>
        </View>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.4)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { color: COLORS.accent, fontSize: 12 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(123,94,167,0.2)',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  aiBadgeText: { color: COLORS.accent, fontSize: 11 },
  refreshBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  patternCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.25)',
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiChip: {
    backgroundColor: 'rgba(192,132,252,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  aiChipText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  patternDate: { color: COLORS.muted, fontSize: 12 },
  patternText: { color: COLORS.text, fontSize: 15, lineHeight: 22, marginBottom: 14 },
  symbolsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  patternFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dreamCount: { color: COLORS.muted, fontSize: 12 },
  confidenceBar: {
    height: 3,
    backgroundColor: 'rgba(123,94,167,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 2 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: COLORS.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  analyzeBtn: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
  analyzeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 14,
  },
  errorText: { color: '#fff', fontSize: 14, textAlign: 'center' },
});
