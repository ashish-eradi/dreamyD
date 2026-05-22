import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Rect, G } from 'react-native-svg';
import { useDreamStore } from '../../store';
import { COLORS, MOODS, SYMBOLS } from '../../constants/theme';

const MOOD_COLORS = {
  joy: '#e7b75e', calm: '#7ea98a', wonder: '#d4885e', melan: '#7fa2c0', fear: '#b78db8',
};
const MOOD_LABELS = { joy: 'Joy', calm: 'Calm', wonder: 'Wonder', melan: 'Tender', fear: 'Anxious' };

export default function MonthlyReportScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dreams = useDreamStore(s => s.dreams) || [];
  const isPremium = useDreamStore(s => s.isPremium);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const monthDreams = useMemo(() => {
    return dreams.filter(d => {
      const dt = new Date(d.recorded_at);
      return dt.getMonth() === month && dt.getFullYear() === year;
    });
  }, [dreams, month, year]);

  const totalEntries = monthDreams.length;

  const moodCounts = useMemo(() => {
    const counts = { joy: 0, calm: 0, wonder: 0, melan: 0, fear: 0 };
    monthDreams.forEach(d => {
      const tags = d.dream_tags || [];
      const emo = tags.find(t => t.type === 'emotion');
      if (emo) {
        const key = emo.label?.toLowerCase();
        if (counts[key] !== undefined) counts[key]++;
      }
    });
    return counts;
  }, [monthDreams]);

  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'calm';

  const symbolCounts = useMemo(() => {
    const counts = {};
    monthDreams.forEach(d => {
      (d.dream_tags || []).filter(t => t.type === 'symbol').forEach(t => {
        const k = t.label?.toLowerCase();
        if (k) counts[k] = (counts[k] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [monthDreams]);

  const maxSymbolCount = symbolCounts[0]?.[1] || 1;

  const moodArc = useMemo(() => {
    const weeks = ['W1','W2','W3','W4'];
    return weeks.map((w, wi) => {
      const weekDreams = monthDreams.filter(d => {
        const day = new Date(d.recorded_at).getDate();
        return Math.floor((day - 1) / 7) === wi;
      });
      const counts = { d: w, joy: 0, calm: 0, wonder: 0, melan: 0, fear: 0 };
      weekDreams.forEach(d => {
        const emo = (d.dream_tags || []).find(t => t.type === 'emotion');
        if (emo?.label) counts[emo.label.toLowerCase()] = (counts[emo.label.toLowerCase()] || 0) + 1;
      });
      return counts;
    });
  }, [monthDreams]);

  const maxMood = Math.max(...moodArc.flatMap(w => Object.entries(w).filter(([k]) => k !== 'd').map(([, v]) => v)), 1);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const monthName = new Date(year, month, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.circleBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monthly report</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthBtn}>
            <Text style={styles.monthBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthName}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthBtn}>
            <Text style={styles.monthBtnText}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Narrative */}
        <View style={styles.card}>
          <Text style={styles.narrative}>
            You dreamed of{' '}
            <Text style={styles.highlightText}>{MOOD_LABELS[topMood] || topMood}</Text>
            {' '}this month — {totalEntries} entries total.
            {totalEntries === 0 ? ' No dreams recorded.' : ''}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { v: totalEntries, l: 'Entries', c: COLORS.ink },
            { v: 0, l: 'Lucid', c: COLORS.peach },
            { v: totalEntries > 0 ? Math.round((totalEntries / 30) * 100) + '%' : '—', l: 'Recall', c: COLORS.moss },
          ].map(s => (
            <View key={s.l} style={[styles.statCard]}>
              <Text style={[styles.statValue, { color: s.c }]}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Mood by week */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>MOOD BY WEEK</Text>
          <View style={styles.chart}>
            {moodArc.map((w, wi) => (
              <View key={w.d} style={styles.chartCol}>
                <View style={styles.chartBars}>
                  {(['joy','calm','wonder','melan','fear'] ).map(m => (
                    <View
                      key={m}
                      style={[
                        styles.chartBar,
                        { height: Math.max((w[m] / maxMood) * 80, w[m] > 0 ? 4 : 0), backgroundColor: MOOD_COLORS[m] },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.chartLabel}>{w.d}</Text>
              </View>
            ))}
          </View>
          <View style={styles.legend}>
            {Object.entries(MOOD_LABELS).map(([k, l]) => (
              <View key={k} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: MOOD_COLORS[k] }]} />
                <Text style={styles.legendText}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top symbols */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>RECURRING SYMBOLS</Text>
          {symbolCounts.length === 0 ? (
            <Text style={styles.emptyText}>No symbols recorded yet.</Text>
          ) : symbolCounts.map(([sym, count]) => {
            const s = SYMBOLS[sym] || { color: COLORS.ink3, bg: COLORS.line };
            return (
              <View key={sym} style={styles.symbolRow}>
                <Text style={styles.symbolName}>{sym}</Text>
                <View style={styles.symbolBar}>
                  <View style={[styles.symbolBarFill, { width: `${(count / maxSymbolCount) * 100}%`, backgroundColor: s.color }]} />
                </View>
                <Text style={styles.symbolCount}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* Export */}
        {isPremium && (
          <View style={styles.card}>
            <View style={styles.exportRow}>
              <View style={styles.exportIcon}>
                <Text style={{ fontSize: 16 }}>↗</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportTitle}>Therapist export</Text>
                <Text style={styles.exportSub}>Structured PDF · HIPAA-friendly</Text>
              </View>
              <Text style={{ color: COLORS.ink3 }}>→</Text>
            </View>
          </View>
        )}
        {!isPremium && (
          <TouchableOpacity style={styles.upsellCard} onPress={() => navigation.navigate('Paywall')}>
            <Text style={styles.upsellEyebrow}>✦ Premium</Text>
            <Text style={styles.upsellTitle}>Full pattern analysis and therapist export.</Text>
            <Text style={styles.upsellCta}>Unlock for ₹179/mo →</Text>
          </TouchableOpacity>
        )}
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
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  monthBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  monthBtnText: { fontSize: 16, color: COLORS.ink },
  monthLabel: { fontFamily: 'Lora_500Medium', fontSize: 18, fontWeight: '500', color: COLORS.ink },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 14,
  },
  narrative: {
    fontFamily: 'Lora_400Regular', fontSize: 18, lineHeight: 26, color: COLORS.ink,
  },
  highlightText: {
    backgroundColor: COLORS.peach2, color: COLORS.ink,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.line, padding: 14,
  },
  statValue: { fontFamily: 'Lora_500Medium', fontSize: 28, fontWeight: '500', lineHeight: 32 },
  statLabel: { fontSize: 12, color: COLORS.ink3, marginTop: 6 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.ink2,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 14,
  },
  chart: { flexDirection: 'row', gap: 14, height: 110, alignItems: 'flex-end', marginBottom: 14 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBars: { flex: 1, flexDirection: 'row', gap: 3, alignItems: 'flex-end', width: '100%', justifyContent: 'center' },
  chartBar: { width: 7, borderRadius: 4 },
  chartLabel: { fontSize: 11, color: COLORS.ink3, marginTop: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 11, color: COLORS.ink2 },
  symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  symbolName: { fontSize: 15, fontWeight: '500', color: COLORS.ink, flex: 1, textTransform: 'capitalize' },
  symbolBar: { flex: 1.5, height: 6, backgroundColor: COLORS.line, borderRadius: 3, maxWidth: 100 },
  symbolBarFill: { height: '100%', borderRadius: 3 },
  symbolCount: { fontSize: 13, fontWeight: '500', color: COLORS.ink2, minWidth: 18, textAlign: 'right' },
  emptyText: { fontSize: 14, color: COLORS.ink3 },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exportIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.moss2, alignItems: 'center', justifyContent: 'center' },
  exportTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
  exportSub: { fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  upsellCard: { padding: 20, borderRadius: 20, backgroundColor: COLORS.peach2 },
  upsellEyebrow: { fontSize: 12, fontWeight: '600', color: COLORS.peach, marginBottom: 6 },
  upsellTitle: { fontFamily: 'Lora_500Medium', fontSize: 17, lineHeight: 24, color: COLORS.ink, marginBottom: 10 },
  upsellCta: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
});
