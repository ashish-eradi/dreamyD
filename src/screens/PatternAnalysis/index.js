import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { getPatterns, savePattern } from '../../services/supabase';
import { detectPatterns } from '../../services/openai';
import { COLORS, SYMBOLS } from '../../constants/theme';

function SymbolTag({ name }) {
  const s = SYMBOLS[name] || { color: COLORS.ink3, bg: COLORS.line };
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.color }]}>{name}</Text>
    </View>
  );
}

function PatternCard({ pattern, locked, onUnlock }) {
  return (
    <View style={styles.card}>
      {locked && (
        <View style={styles.lockOverlay}>
          <TouchableOpacity style={styles.unlockBtn} onPress={onUnlock}>
            <Text style={styles.unlockBtnText}>⌬ Unlock</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.confidence}>
        {Math.round((pattern.confidence_score || pattern.confidence || 0) * 100)}% CONFIDENCE
      </Text>
      <Text style={styles.patternTitle}>"{pattern.pattern_text || pattern.title}"</Text>
      {pattern.detail && <Text style={styles.patternDetail}>{pattern.detail}</Text>}
      {(pattern.symbols_involved || pattern.symbols || []).length > 0 && (
        <View style={styles.pills}>
          {(pattern.symbols_involved || pattern.symbols || []).map(s => (
            <SymbolTag key={s} name={s} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function PatternAnalysisScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { dreams, user, isPremium } = useDreamStore();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        const data = await getPatterns(user.id);
        setPatterns(data || []);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const handleAnalyze = async () => {
    if (!isPremium) {
      navigation.navigate('Paywall');
      return;
    }
    setAnalyzing(true);
    try {
      const summaries = (dreams || []).map(d => d.ai_summary || d.transcript).filter(Boolean);
      const newPatterns = await detectPatterns(summaries);
      if (newPatterns?.length) {
        for (const p of newPatterns) {
          if (user?.id) await savePattern({ user_id: user.id, ...p });
        }
        setPatterns(prev => [...newPatterns, ...prev]);
      }
    } catch {}
    finally { setAnalyzing(false); }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.circleBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patterns</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>What recurs</Text>
        <Text style={styles.pageSub}>AI-detected across your dream journal</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.peach} />
          </View>
        ) : patterns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyGlyph}>✦</Text>
            <Text style={styles.emptyTitle}>Patterns emerge after ten.</Text>
            <Text style={styles.emptyBody}>Log at least 10 dreams and tap "Analyze" to reveal what recurs.</Text>
          </View>
        ) : (
          <View style={styles.patternList}>
            {patterns.map((p, i) => (
              <PatternCard
                key={p.id || i}
                pattern={p}
                locked={!isPremium && i > 0}
                onUnlock={() => navigation.navigate('Paywall')}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.analyzeBtn, analyzing && { opacity: 0.6 }]}
          onPress={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing
            ? <ActivityIndicator color={COLORS.bg2} size="small" />
            : <Text style={styles.analyzeBtnText}>{isPremium ? 'Analyze new patterns' : '⌬ Unlock pattern analysis'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  circleBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnText: { fontSize: 16, color: COLORS.ink },
  headerTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  pageTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, marginBottom: 4,
  },
  pageSub: { fontSize: 14, color: COLORS.ink3, marginBottom: 24 },
  center: { alignItems: 'center', paddingVertical: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyGlyph: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 22, fontWeight: '500',
    color: COLORS.ink, marginBottom: 10, textAlign: 'center',
  },
  emptyBody: { fontSize: 15, color: COLORS.ink2, textAlign: 'center', lineHeight: 22 },
  patternList: { gap: 12, marginBottom: 24 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line, padding: 18,
    overflow: 'hidden',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
    borderRadius: 20,
  },
  unlockBtn: {
    paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20,
    backgroundColor: COLORS.ink,
  },
  unlockBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.bg2 },
  confidence: {
    fontSize: 12, color: COLORS.peach, fontWeight: '600',
    letterSpacing: 0.5, marginBottom: 6,
  },
  patternTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 18, fontWeight: '500',
    lineHeight: 24, color: COLORS.ink, marginBottom: 8,
  },
  patternDetail: { fontSize: 14, lineHeight: 20, color: COLORS.ink2, marginBottom: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 13, fontWeight: '500' },
  analyzeBtn: {
    height: 52, borderRadius: 26, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  analyzeBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.bg2 },
});
